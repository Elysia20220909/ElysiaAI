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
import { DEFAULT_MODE, ELYSIA_MODES } from "./llm-config";
import {
	checkRateLimitRedis,
	isRedisAvailable,
	revokeRefreshToken,
	storeRefreshToken,
	verifyRefreshToken,
} from "./redis";

type Message = { role: "user" | "assistant" | "system"; content: string };
type ChatRequest = {
	messages: Message[];
	mode?: "sweet" | "normal" | "professional";
};

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
	AUTH_USERNAME: process.env.AUTH_USERNAME || "elysia",
	AUTH_PASSWORD: process.env.AUTH_PASSWORD || "elysia-dev-password",
	JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
	JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
};

// ---------------- Helpers ----------------
function jsonError(status: number, message: string) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { "content-type": "application/json" },
	});
}

async function checkRateLimit(key: string) {
	try {
		return await checkRateLimitRedis(key, CONFIG.MAX_REQUESTS_PER_MINUTE);
	} catch {
		return true; // fallback: allow
	}
}

function containsDangerousKeywords(text: string) {
	const bad = [/\b(drop|delete)\b/i, /<script/i];
	return bad.some((r) => r.test(text));
}

// ---------------- App ----------------
const app = new Elysia()
	.use(cors({ origin: CONFIG.ALLOWED_ORIGINS }))
	.use(html())
	.use(staticPlugin({ assets: "public" }))
	.use(swagger({ path: "/swagger" }))
	.onError(({ error }) => {
		console.error("[Server Error]", error);
	})
	.onAfterHandle(({ set }) => {
		set.headers["X-Content-Type-Options"] = "nosniff";
		set.headers["X-Frame-Options"] = "DENY";
	})

	// Health
	.get("/ping", () => ({ ok: true }), {
		detail: {
			tags: ["health"],
			summary: "Health check endpoint",
			description: "Returns a simple OK response to verify server is running",
		},
	})

	// Index page
	.get("/", () => Bun.file("public/index.html"), {
		detail: {
			tags: ["ui"],
			summary: "Portfolio index page",
			description: "Serves the main Elysia AI portfolio and chat interface",
		},
	})

	// Feedback (Protected)
	.post(
		"/feedback",
		async ({
			body,
			request,
		}: {
			body: {
				query: string;
				answer: string;
				rating: "up" | "down";
				reason?: string;
			};
			request: Request;
		}) => {
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
			detail: {
				tags: ["feedback"],
				summary: "Submit user feedback",
				description:
					"Submit feedback for a query-answer pair. Requires JWT authentication.",
				security: [{ bearerAuth: [] }],
			},
		},
	)

	// Knowledge upsert (Protected)
	.post(
		"/knowledge/upsert",
		async ({
			body,
			request,
		}: {
			body: {
				summary: string;
				sourceUrl?: string;
				tags?: string[];
				confidence: number;
			};
			request: Request;
		}) => {
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
			detail: {
				tags: ["knowledge"],
				summary: "Add or update knowledge entry",
				description:
					"Store a new knowledge entry with summary, source, tags, and confidence. Requires JWT.",
				security: [{ bearerAuth: [] }],
			},
		},
	)

	// Knowledge review (Protected)
	.get(
		"/knowledge/review",
		async ({ request, query }: { request: Request; query: { n?: number } }) => {
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
				description:
					"Retrieve the last N knowledge entries from the knowledge base. Requires JWT.",
				security: [{ bearerAuth: [] }],
			},
		},
	)

	// Auth: token issuance
	.post(
		"/auth/token",
		async ({ body }) => {
			const { username, password } = body as {
				username: string;
				password: string;
			};
			if (
				username !== CONFIG.AUTH_USERNAME ||
				password !== CONFIG.AUTH_PASSWORD
			)
				return jsonError(401, "Invalid credentials");

			const userId = username;
			const accessToken = jwt.sign(
				{ iss: "elysia-ai", userId, iat: Math.floor(Date.now() / 1000) },
				CONFIG.JWT_SECRET,
				{ expiresIn: "15m" },
			);
			const refreshToken = jwt.sign(
				{
					iss: "elysia-ai-refresh",
					userId,
					iat: Math.floor(Date.now() / 1000),
				},
				CONFIG.JWT_REFRESH_SECRET,
				{ expiresIn: "7d" },
			);
			await storeRefreshToken(userId, refreshToken, 7 * 24 * 60 * 60);
			return new Response(
				JSON.stringify({ accessToken, refreshToken, expiresIn: 900 }),
				{ headers: { "content-type": "application/json" } },
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
					"Authenticate with username and password to receive access token (15min) and refresh token (7 days)",
			},
		},
	)

	// Auth: refresh access token
	.post(
		"/auth/refresh",
		async ({ body }) => {
			const { refreshToken } = body as { refreshToken: string };
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
			const isValid = await verifyRefreshToken(userId, refreshToken);
			if (!isValid) return jsonError(401, "Refresh token not found or revoked");
			const newAccessToken = jwt.sign(
				{ iss: "elysia-ai", userId, iat: Math.floor(Date.now() / 1000) },
				CONFIG.JWT_SECRET,
				{ expiresIn: "15m" },
			);
			return new Response(
				JSON.stringify({ accessToken: newAccessToken, expiresIn: 900 }),
				{ headers: { "content-type": "application/json" } },
			);
		},
		{
			body: t.Object({ refreshToken: t.String({ minLength: 20 }) }),
			detail: {
				tags: ["auth"],
				summary: "Refresh access token",
				description:
					"Exchange a valid refresh token for a new access token without re-authentication",
			},
		},
	)

	// Auth: logout revoke refresh
	.post(
		"/auth/logout",
		async ({ body }) => {
			const { refreshToken } = body as { refreshToken: string };
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
			body: t.Object({ refreshToken: t.String({ minLength: 20 }) }),
			detail: {
				tags: ["auth"],
				summary: "Logout and revoke refresh token",
				description:
					"Revoke a refresh token to prevent future token refreshes. Effectively logs out the user.",
			},
		},
	)

	// Protected: chat
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
					const rateLimitOk = await checkRateLimit(clientKey);
					if (!rateLimitOk) return jsonError(429, "Rate limit exceeded");

					const mode = body.mode || DEFAULT_MODE;
					const llmConfig = ELYSIA_MODES[mode];

					const sanitizedMessages = body.messages.map((m) => {
						const cleaned = sanitizeHtml(m.content, {
							allowedTags: [],
							allowedAttributes: {},
						});
						if (containsDangerousKeywords(cleaned))
							throw new Error("Dangerous content detected");
						return { ...m, content: cleaned };
					});

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
								"X-Elysia-Mode": mode,
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
							"Send chat messages to Elysia AI with selectable personality modes (sweet/normal/professional). Returns streaming SSE response. Requires JWT.",
						security: [{ bearerAuth: [] }],
					},
				},
			),
	);

// ---------------- Start Server ----------------
const redisStatus = isRedisAvailable() ? "Connected" : "Fallback to in-memory";

console.log("\n" + "=".repeat(60));
console.log("Secure Elysia AI Server Started");
console.log("=".repeat(60));
console.log(`Server: http://localhost:${CONFIG.PORT}`);
console.log(`Swagger: http://localhost:${CONFIG.PORT}/swagger`);
console.log(`Upstream: ${CONFIG.RAG_API_URL}`);
console.log(`RateLimit RPM: ${CONFIG.MAX_REQUESTS_PER_MINUTE}`);
console.log(`Redis: ${redisStatus}`);
console.log("Auth: POST /auth/token");
console.log("Refresh: POST /auth/refresh");
console.log("Logout: POST /auth/logout");
console.log("=".repeat(60) + "\n");

const server = app.listen(CONFIG.PORT);

console.log(`✨ Elysia-chan is now listening on port ${CONFIG.PORT}!\n`);

// Keep process alive (Windows compatibility)
if (process.platform === "win32") {
	setInterval(() => {}, 1 << 30);
}
