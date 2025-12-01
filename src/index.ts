// Secure Elysia AI Server with JWT, Redis rate limiting, and refresh tokens
import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import axios from "axios";
import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import {
	checkRateLimitRedis,
	isRedisAvailable,
	revokeRefreshToken,
	storeRefreshToken,
	verifyRefreshToken,
} from "./redis";

// ---------------- Config ----------------
const CONFIG = {
	PORT: Number(process.env.PORT) || 3000,
	RAG_API_URL: process.env.RAG_API_URL || "http://127.0.0.1:8000/rag",
	RAG_TIMEOUT: Number(process.env.RAG_TIMEOUT) || 5000,
	MODEL_NAME: process.env.MODEL_NAME || "llama3.2",
	MAX_REQUESTS_PER_MINUTE: Number(process.env.RATE_LIMIT_RPM) || 60,
	ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS?.split(",") || [
		"http://localhost:3000",
	]) as string[],
	DANGEROUS_KEYWORDS: [
		"eval",
		"exec",
		"system",
		"drop",
		"delete",
		"<script",
		"onerror",
		"onload",
		"javascript:",
		"--",
		";--",
		"union select",
	],
	JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
	JWT_REFRESH_SECRET:
		process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
	AUTH_USERNAME: process.env.AUTH_USERNAME || "elysia",
	AUTH_PASSWORD: process.env.AUTH_PASSWORD || "elysia-dev-password",
} as const;

// ---------------- Types ----------------
interface Message {
	role: "user" | "assistant";
	content: string;
}
interface ChatRequest {
	messages: Message[];
}

// ---------------- State ----------------
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// ---------------- Helpers ----------------
async function checkRateLimit(id: string): Promise<boolean> {
	// Redis統合レート制限（フォールバック付き）
	if (isRedisAvailable()) {
		return await checkRateLimitRedis(id, CONFIG.MAX_REQUESTS_PER_MINUTE, 60);
	}
	// フォールバック: インメモリレート制限
	const now = Date.now();
	const rec = requestCounts.get(id);
	if (!rec || now > rec.resetTime) {
		requestCounts.set(id, { count: 1, resetTime: now + 60000 });
		return true;
	}
	if (rec.count >= CONFIG.MAX_REQUESTS_PER_MINUTE) return false;
	rec.count++;
	return true;
}
function containsDangerousKeywords(text: string): boolean {
	const lower = text.toLowerCase();
	return CONFIG.DANGEROUS_KEYWORDS.some((kw) => lower.includes(kw));
}
function jsonError(status: number, message: string) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { "content-type": "application/json" },
	});
}

// ---------------- App ----------------
const app = new Elysia()
	.use(
		cors({
			origin: CONFIG.ALLOWED_ORIGINS,
			methods: ["GET", "POST"],
			credentials: true,
		}),
	)
	.use(html())
	.use(staticPlugin({ assets: "public", prefix: "" }))
	.onAfterHandle(({ set }) => {
		set.headers["X-Frame-Options"] = "DENY";
		set.headers["X-Content-Type-Options"] = "nosniff";
		set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
		set.headers["Permissions-Policy"] =
			"geolocation=(), microphone=(), camera=()";
		const ragOrigin = (() => {
			try {
				return new URL(CONFIG.RAG_API_URL).origin;
			} catch {
				return CONFIG.RAG_API_URL;
			}
		})();
		set.headers["Content-Security-Policy"] = [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline'",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data:",
			`connect-src 'self' ${ragOrigin}`,
			"font-src 'self'",
			"object-src 'none'",
			"frame-ancestors 'none'",
		].join("; ");
	})
	.onRequest(({ request }) => {
		console.log(
			`[${new Date().toISOString()}] ${request.method} ${
				new URL(request.url).pathname
			}`,
		);
	})
	// Public: index page
	.get("/", () => Bun.file("public/index.html"))
	// Public: token issuance (access token + refresh token)
	.post(
		"/auth/token",
		async ({ body }) => {
			const { username, password } = body as { username: string; password: string };
			if (username !== CONFIG.AUTH_USERNAME || password !== CONFIG.AUTH_PASSWORD)
				return jsonError(401, "Invalid credentials");

			// ユーザーID（本番ではDBのユーザーID等を使用）
			const userId = username;

			// アクセストークン: 15分有効
			const accessToken = jwt.sign(
				{ iss: "elysia-ai", userId, iat: Math.floor(Date.now() / 1000) },
				CONFIG.JWT_SECRET,
				{ expiresIn: "15m" },
			);

			// リフレッシュトークン: 7日有効
			const refreshToken = jwt.sign(
				{
					iss: "elysia-ai-refresh",
					userId,
					iat: Math.floor(Date.now() / 1000),
				},
				CONFIG.JWT_REFRESH_SECRET,
				{ expiresIn: "7d" },
			);

			// リフレッシュトークンをRedisに保存
			await storeRefreshToken(userId, refreshToken, 7 * 24 * 60 * 60);

			return new Response(
				JSON.stringify({
					accessToken,
					refreshToken,
					expiresIn: 900, // 15分（秒）
				}),
				{
					headers: { "content-type": "application/json" },
				},
			);
		},
		{
			body: t.Object({
				username: t.String({ minLength: 3, maxLength: 64 }),
				password: t.String({ minLength: 8, maxLength: 64 }),
			}),
		},
	)
	// Public: refresh access token
	.post(
		"/auth/refresh",
		async ({ body }) => {
			const { refreshToken } = body;

			// リフレッシュトークンを検証
			let payload: jwt.JwtPayload;
			try {
				payload = jwt.verify(
					refreshToken,
					CONFIG.JWT_REFRESH_SECRET,
				) as jwt.JwtPayload;
			} catch {
				return jsonError(401, "Invalid or expired refresh token");
			}

			const userId = (payload as { userId?: string }).userId || "default-user";

			// Redisで保存されたトークンと一致するか確認
			const isValid = await verifyRefreshToken(userId, refreshToken);
			if (!isValid) {
				return jsonError(401, "Refresh token not found or revoked");
			}

			// 新しいアクセストークンを発行
			const newAccessToken = jwt.sign(
				{ iss: "elysia-ai", userId, iat: Math.floor(Date.now() / 1000) },
				CONFIG.JWT_SECRET,
				{ expiresIn: "15m" },
			);

			return new Response(
				JSON.stringify({
					accessToken: newAccessToken,
					expiresIn: 900, // 15分（秒）
				}),
				{
					headers: { "content-type": "application/json" },
				},
			);
		},
		{
			body: t.Object({
				refreshToken: t.String({ minLength: 20 }),
			}),
		},
	)
	// Public: logout (revoke refresh token)
	.post(
		"/auth/logout",
		async ({ body }) => {
			const { refreshToken } = body;

			try {
				const payload = jwt.verify(
					refreshToken,
					CONFIG.JWT_REFRESH_SECRET,
				) as jwt.JwtPayload;
				const userId =
					(payload as { userId?: string }).userId || "default-user";
				await revokeRefreshToken(userId);

				return new Response(
					JSON.stringify({ message: "Logged out successfully" }),
					{
						headers: { "content-type": "application/json" },
					},
				);
			} catch {
				return jsonError(400, "Invalid refresh token");
			}
		},
		{
			body: t.Object({
				refreshToken: t.String({ minLength: 20 }),
			}),
		},
	)
	// Protected routes
	.guard(
		{
			beforeHandle: ({ request }) => {
				const auth = request.headers.get("authorization") || "";
				if (!auth.startsWith("Bearer "))
					throw new Error("Missing Bearer token");
				try {
					jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
				} catch {
					throw new Error("Invalid or expired token");
				}
			},
		},
		(app) =>
			app.post(
				"/elysia-love",
				async ({ body, request }: { body: ChatRequest; request: Request }) => {
					const ip = request.headers.get("x-forwarded-for") || "anon";
					let userId = "anon";
					const auth = request.headers.get("authorization") || "";
					try {
						if (auth.startsWith("Bearer ")) {
							const payload = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as jwt.JwtPayload;
							userId = (payload as { userId?: string }).userId || "anon";
						}
					} catch {}
					const clientKey = `${userId}:${ip}`;
					// Redis統合レート制限チェック（async, ユーザーID+IPでキー強化）
					const rateLimitOk = await checkRateLimit(clientKey);
					if (!rateLimitOk) return jsonError(429, "Rate limit exceeded");
					const sanitizedMessages = body.messages.map((m) => {
						const cleaned = sanitizeHtml(m.content, {
							allowedTags: [],
							allowedAttributes: {},
						});
						if (containsDangerousKeywords(cleaned))
							throw new Error("Dangerous content detected");
						return { role: m.role, content: cleaned };
					});
					try {
						const upstream = await axios.post(
							CONFIG.RAG_API_URL,
							{ messages: sanitizedMessages },
							{ responseType: "stream", timeout: CONFIG.RAG_TIMEOUT },
						);
						return new Response(upstream.data, {
							headers: {
								"Content-Type": "text/event-stream",
								"Cache-Control": "no-cache",
								Connection: "keep-alive",
							},
						});
					} catch (error) {
						console.error("[Chat] Error", error);
						if (axios.isAxiosError(error) && error.response?.status === 503)
							return jsonError(503, "Upstream unavailable");
						return jsonError(500, "Internal chat error");
					}
				},
				{
					body: t.Object({
						messages: t.Array(
							t.Object({
								role: t.Union([t.Literal("user"), t.Literal("assistant")]),
								content: t.String({
									maxLength: 400,
									minLength: 1,
									pattern:
										"^[a-zA-Z0-9\\s\\p{L}\\p{N}\\p{P}\\p{S}♡♪〜！？。、]{1,400}$",
								}),
							}),
							{ maxItems: 8 },
						),
					}),
				},
			),
	)
	.listen(CONFIG.PORT);

// ---------------- Startup Banner ----------------
const redisStatus = isRedisAvailable()
	? "✅ Connected"
	: "⚠️ Fallback to in-memory";
console.log(
	`\n${"+".repeat(56)}\n✨ Secure Elysia AI Server Started ✨\n${"+".repeat(56)}\n📡 Server: http://localhost:${CONFIG.PORT}\n🔮 Upstream: ${CONFIG.RAG_API_URL}\n🛡️ RateLimit RPM: ${CONFIG.MAX_REQUESTS_PER_MINUTE}\n🔴 Redis: ${redisStatus}\n🔐 Auth: POST /auth/token (env AUTH_PASSWORD)\n🔄 Refresh: POST /auth/refresh\n🚪 Logout: POST /auth/logout\n${"+".repeat(56)}\n`,
);

export default app;
