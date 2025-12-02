// Secure Elysia AI Server with JWT, Redis rate limiting, and refresh tokens
import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import axios from "axios";
import { Elysia, t } from "elysia";
import { existsSync, mkdirSync } from "fs";
import { appendFile } from "fs/promises";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import { DEFAULT_MODE, ELYSIA_MODES, type ElysiaMode } from "./llm-config";
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
	role: "user" | "assistant" | "system";
	content: string;
}
interface ChatRequest {
	messages: Message[];
	mode?: "sweet" | "normal" | "professional";
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
	.use(swagger())
	.use(html())
	.use(staticPlugin({ assets: "public", prefix: "/" }))
	.onError(({ code, error }) => {
		console.error(`[Error] code=${code}`, error);
		return jsonError(500, "Unhandled server error");
	})
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
	// Healthcheck & index
	.get(
		"/ping",
		() =>
			new Response(
				JSON.stringify({ ok: true, time: new Date().toISOString() }),
				{ headers: { "content-type": "application/json" } },
			),
	)
	// Public: index page
	.get("/", () => Bun.file("public/index.html"))
	// Swagger UI
	.get("/swagger", () => new Response(Bun.file("public/index.html")))
	// ---------------- Self-Learning APIs ----------------
	// Save user feedback (JSONL). Protected by JWT.
	.post(
		"/feedback",
		async ({ body, request }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer "))
				return jsonError(401, "Missing Bearer token");
			let payload: jwt.JwtPayload;
			try {
				payload = jwt.verify(
					auth.substring(7),
					CONFIG.JWT_SECRET,
				) as jwt.JwtPayload;
			} catch {
				return jsonError(401, "Invalid token");
			}
			if (!existsSync("data")) mkdirSync("data", { recursive: true });
			const ip = request.headers.get("x-forwarded-for") || "anon";
			const userId = (payload as { userId?: string }).userId || "anon";
			const rec = {
				userId,
				ip,
				query: body.query,
				answer: body.answer,
				rating: body.rating,
				reason: body.reason || null,
				timestamp: new Date().toISOString(),
			};
			try {
				await appendFile("data/feedback.jsonl", JSON.stringify(rec) + "\n");
			} catch (err) {
				console.error("[Feedback] write error", err);
				return jsonError(500, "Failed to store feedback");
			}
			return new Response(JSON.stringify({ ok: true }), {
				headers: { "content-type": "application/json" },
			});
		},
		{
			body: t.Object({
				query: t.String({ minLength: 1, maxLength: 400 }),
				answer: t.String({ minLength: 1, maxLength: 4000 }),
				rating: t.Union([t.Literal("up"), t.Literal("down")]),
				reason: t.Optional(t.String({ maxLength: 256 })),
			}),
		},
	)

	// Upsert knowledge (summary + optional source/tags). JWT required.
	.post(
		"/knowledge/upsert",
		async ({ body, request }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer "))
				return jsonError(401, "Missing Bearer token");
			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			} catch {
				return jsonError(401, "Invalid token");
			}
			if (!existsSync("data")) mkdirSync("data", { recursive: true });
			const item = {
				summary: body.summary,
				sourceUrl: body.sourceUrl || null,
				tags: body.tags || [],
				confidence: body.confidence,
				timestamp: new Date().toISOString(),
			};
			try {
				await appendFile("data/knowledge.jsonl", JSON.stringify(item) + "\n");
			} catch (err) {
				console.error("[Knowledge] write error", err);
				return jsonError(500, "Failed to store knowledge");
			}
			return new Response(JSON.stringify({ ok: true }), {
				headers: { "content-type": "application/json" },
			});
		},
		{
			body: t.Object({
				summary: t.String({ minLength: 10, maxLength: 2000 }),
				sourceUrl: t.Optional(t.String()),
				tags: t.Optional(t.Array(t.String({ maxLength: 32 }), { maxItems: 8 })),
				confidence: t.Number({ minimum: 0, maximum: 1 }),
			}),
		},
	)

	// Review queue (returns last N items). JWT required.
	.get(
		"/knowledge/review",
		async ({ request, query }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer "))
				return jsonError(401, "Missing Bearer token");
			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			} catch {
				return jsonError(401, "Invalid token");
			}
			const n = Number(query?.n ?? 20) || 20;
			try {
				if (!existsSync("data/knowledge.jsonl"))
					return new Response(JSON.stringify([]), {
						headers: { "content-type": "application/json" },
					});
				const file = await Bun.file("data/knowledge.jsonl").text();
				const lines = file.trim().split("\n").filter(Boolean);
				const last = lines
					.slice(Math.max(0, lines.length - n))
					.map((l) => JSON.parse(l));
				return new Response(JSON.stringify(last), {
					headers: { "content-type": "application/json" },
				});
			} catch (err) {
				console.error("[Knowledge] read error", err);
				return jsonError(500, "Failed to read knowledge");
			}
		},
		{
			query: t.Object({ n: t.Optional(t.Number()) }),
			detail: {
				tags: ["knowledge"],
				summary: "Get recent knowledge entries",
				description: "Retrieve the last N entries from the knowledge base",
			},
		},
	)
	// Public: token issuance (access token + refresh token)
	.post(
		"/auth/token",
		async ({ body }) => {
			console.log("[Auth] Received body:", JSON.stringify(body));
			console.log(
				"[Auth] Body keys:",
				Object.keys(body as Record<string, unknown>),
			);
			console.log("[Auth] Expected credentials:", {
				username: CONFIG.AUTH_USERNAME,
				passwordLength: CONFIG.AUTH_PASSWORD.length,
			});

			const { username, password } = body as {
				username: string;
				password: string;
			};
			console.log(
				`[Auth] Login attempt: username="${username}" (expected: "${CONFIG.AUTH_USERNAME}")`,
			);
			console.log(
				`[Auth] Username match: ${username === CONFIG.AUTH_USERNAME}`,
			);
			console.log(
				`[Auth] Password match: ${password === CONFIG.AUTH_PASSWORD}`,
			);
			if (
				username !== CONFIG.AUTH_USERNAME ||
				password !== CONFIG.AUTH_PASSWORD
			)
				return jsonError(401, "Invalid credentials");

			// User ID (in production, use DB user ID)
			const userId = username;

			// Access token: 15 min validity
			const accessToken = jwt.sign(
				{ iss: "elysia-ai", userId, iat: Math.floor(Date.now() / 1000) },
				CONFIG.JWT_SECRET,
				{ expiresIn: "15m" },
			);

			// Refresh token: 7 day validity
			const refreshToken = jwt.sign(
				{
					iss: "elysia-ai-refresh",
					userId,
					iat: Math.floor(Date.now() / 1000),
				},
				CONFIG.JWT_REFRESH_SECRET,
				{ expiresIn: "7d" },
			);

			// Store refresh token in Redis
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
				username: t.String({ minLength: 1, maxLength: 128 }),
				password: t.String({ minLength: 1, maxLength: 128 }),
			}),
			detail: {
				tags: ["auth"],
				summary: "Login and get JWT tokens",
				description:
					"Authenticate with username and password to receive access and refresh tokens",
			},
		},
	)
	// Public: refresh access token
	.post(
		"/auth/refresh",
		async ({ body }) => {
			const { refreshToken } = body;

			// Verify refresh token
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

			// Verify token matches stored token in Redis
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
					expiresIn: 900, // 15 min (seconds)
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
			detail: {
				tags: ["auth"],
				summary: "Refresh access token",
				description: "Exchange a valid refresh token for a new access token",
			},
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
							const payload = jwt.verify(
								auth.substring(7),
								CONFIG.JWT_SECRET,
							) as jwt.JwtPayload;
							userId = (payload as { userId?: string }).userId || "anon";
						}
					} catch {}
					const clientKey = `${userId}:${ip}`;
					// Redis統合レート制限チェック（async, ユーザーID+IPでキー強化）
					const rateLimitOk = await checkRateLimit(clientKey);
					if (!rateLimitOk) return jsonError(429, "Rate limit exceeded");

					// モード取得（デフォルトは甘々モード♡）
					const mode = body.mode || DEFAULT_MODE;
					const llmConfig = ELYSIA_MODES[mode];

					const sanitizedMessages = body.messages.map((m) => {
						const cleaned = sanitizeHtml(m.content, {
							allowedTags: [],
							allowedAttributes: {},
						});
						if (containsDangerousKeywords(cleaned))
							throw new Error("Dangerous content detected");
						return { role: m.role, content: cleaned };
					});

					// システムプロンプトをメッセージの先頭に追加
					const messagesWithSystem: Message[] = [
						{ role: "system", content: llmConfig.systemPrompt },
						...sanitizedMessages,
					];

					try {
						const upstream = await axios.post(
							CONFIG.RAG_API_URL,
							{
								messages: messagesWithSystem,
								temperature: llmConfig.temperature,
								model: llmConfig.model,
							},
							{ responseType: "stream", timeout: CONFIG.RAG_TIMEOUT },
						);
						return new Response(upstream.data, {
							headers: {
								"Content-Type": "text/event-stream",
								"Cache-Control": "no-cache",
								Connection: "keep-alive",
								"X-Elysia-Mode": mode, // モード情報をヘッダーに追加
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
								role: t.Union([
									t.Literal("user"),
									t.Literal("assistant"),
									t.Literal("system"),
								]),
								content: t.String({
									maxLength: 400,
									minLength: 1,
									pattern:
										"^[a-zA-Z0-9\\s\\p{L}\\p{N}\\p{P}\\p{S}♡♪〜！？。、]{1,400}$",
								}),
							}),
							{ maxItems: 8 },
						),
						mode: t.Optional(
							t.Union([
								t.Literal("sweet"),
								t.Literal("normal"),
								t.Literal("professional"),
							]),
						),
					}),
					detail: {
						tags: ["chat"],
						summary: "Chat with Elysia AI (Multi-LLM)",
						description:
							"Send messages to Elysia AI with selectable personality modes (sweet/normal/professional). Supports streaming responses with Server-Sent Events.",
						security: [{ bearerAuth: [] }],
					},
				},
			),
	);

// ---------------- Startup Banner ----------------
const redisStatus = isRedisAvailable() ? "Connected" : "Fallback to in-memory";

console.log("\n" + "=".repeat(60));
console.log("Secure Elysia AI Server Started");
console.log("=".repeat(60));
console.log(`Server: http://localhost:${CONFIG.PORT}`);
console.log(`Upstream: ${CONFIG.RAG_API_URL}`);
console.log(`RateLimit RPM: ${CONFIG.MAX_REQUESTS_PER_MINUTE}`);
console.log(`Redis: ${redisStatus}`);
console.log("Auth: POST /auth/token");
console.log("Refresh: POST /auth/refresh");
console.log("Logout: POST /auth/logout");
console.log("=".repeat(60) + "\n");

// ---------------- Start Server ----------------
app.listen(CONFIG.PORT);

console.log(`Elysia-chan is now listening on port ${CONFIG.PORT}!\n`);

// Keep process alive on Windows
if (process.platform === "win32") {
	setInterval(() => {}, 1000);
}
