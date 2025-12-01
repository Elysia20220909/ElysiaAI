// Secure Elysia AI Server with JWT and basic rate limiting
import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import axios from "axios";
import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";

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
function checkRateLimit(id: string): boolean {
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
			try { return new URL(CONFIG.RAG_API_URL).origin } catch { return CONFIG.RAG_API_URL }
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
	// Public: token issuance
	.post(
		"/auth/token",
		({ body }) => {
			if (body.password !== CONFIG.AUTH_PASSWORD)
				return jsonError(401, "Invalid credentials");
			const token = jwt.sign(
				{ iss: "elysia-ai", iat: Math.floor(Date.now() / 1000) },
				CONFIG.JWT_SECRET,
				{ expiresIn: "2h" },
			);
			return new Response(JSON.stringify({ token }), {
				headers: { "content-type": "application/json" },
			});
		},
		{ body: t.Object({ password: t.String({ minLength: 8, maxLength: 64 }) }) },
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
					const clientId = request.headers.get("x-forwarded-for") || "anon";
					if (!checkRateLimit(clientId))
						return jsonError(429, "Rate limit exceeded");
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
console.log(
	`\n${"+".repeat(56)}\n✨ Secure Elysia AI Server Started ✨\n${"+".repeat(56)}\n📡 Server: http://localhost:${CONFIG.PORT}\n🔮 Upstream: ${CONFIG.RAG_API_URL}\n🛡️ RateLimit RPM: ${CONFIG.MAX_REQUESTS_PER_MINUTE}\n🔐 Auth: POST /auth/token (env AUTH_PASSWORD)\n${"+".repeat(56)}\n`,
);

export default app;
