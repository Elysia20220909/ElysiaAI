// 環境変数は .env を最優先で読み込む（既存の環境変数を上書き）
// Windows 環境でグローバルに設定された DATABASE_URL などに勝つための対策
import dotenv from "dotenv";
dotenv.config({ override: true });
import { Elysia } from "elysia";
const app = new Elysia();

// チャットクリア（セッション内メッセージ全削除）
app.post(
	"/sessions/:id/clear",
	async ({ params, request }) => {
		const auth = request.headers.get("authorization") || "";
		if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
		try {
			jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
		} catch {
			return jsonError(401, "Invalid token");
		}

		const success = await chatSessionService.clearSessionMessages(params.id);
		if (!success) return jsonError(500, "Failed to clear chat messages");

		return new Response(JSON.stringify({ success: true }), {
			headers: { "content-type": "application/json" },
		});
	},
	{
		detail: {
			tags: ["sessions"],
			summary: "チャット履歴をクリア（セッション内メッセージ全削除）",
			description: "指定セッションのメッセージ履歴を全て削除します。JWT必須。",
			security: [{ bearerAuth: [] }],
		},
	},
);

import { existsSync, mkdirSync } from "node:fs";
// Secure Elysia AI Server with JWT, Redis rate limiting, and refresh tokens
import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { openapi, fromTypes } from "@elysiajs/openapi";
import axios from "axios";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import { DEFAULT_MODE, ELYSIA_MODES } from "./config/internal/llm-config.ts";
import {
  checkRateLimitRedis,
  revokeRefreshToken,
  storeRefreshToken,
  verifyStoredRefreshToken,
} from "./config/internal/auth.ts";
import { DATABASE_CONFIG } from "./config/internal/db.ts";
import { setupSocket } from "./config/internal/socket-server.ts";
import { abTestManager } from "./lib/ab-testing.ts";
import { apiKeyManager } from "./lib/api-key-manager.ts";
import { auditLogger } from "./lib/audit-logger.ts";
import { createAuditMiddleware } from "./lib/audit-middleware.ts";
import { backupScheduler } from "./lib/backup-scheduler.ts";
import { CacheManager } from "./lib/cache.ts";
import * as casualChat from "./lib/casual-chat.ts";
import * as chatSessionService from "./lib/chat-session.ts";
import { cronScheduler } from "./lib/cron-scheduler.ts";
import * as customization from "./lib/customization.ts";
import { feedbackService, knowledgeService, userService } from "./lib/database.ts";
import { emailNotifier } from "./lib/email-notifier.ts";
import { checkEnvironmentOrExit, printEnvironmentSummary } from "./lib/env-validator.ts";
import { fileUploadManager } from "./lib/file-upload.ts";
import { performHealthCheck } from "./lib/health.ts";
import { healthMonitor } from "./lib/health-monitor.ts";
import { getLocaleFromRequest, i18n } from "./lib/i18n.ts";
import { jobQueue } from "./lib/job-queue.ts";
import { logCleanupManager } from "./lib/log-cleanup.ts";
import { logger } from "./lib/logger.ts";
import { metricsCollector } from "./lib/metrics.ts";
import * as openaiIntegration from "./lib/openai-integration.ts";
import {
  checkRateLimit as checkRateLimitMemory,
  escapeHtml,
  getSecurityHeaders,
} from "./lib/security.ts";
import { sessionManager } from "./lib/session-manager.ts";
import { getTraceContextFromRequest, telemetry } from "./lib/telemetry.ts";
import * as webSearch from "./lib/web-search.ts";
import { webhookManager } from "./lib/webhook-events.ts";
import { t } from "elysia";

// 環境変数検証（起動時）
checkEnvironmentOrExit();

// 自動化機能を開始
backupScheduler.start();
healthMonitor.start();
logCleanupManager.start();

// ジョブキューとCronスケジューラーを初期化
if (process.env.REDIS_ENABLED === "true") {
	try {
		await jobQueue.initialize();
		logger.info("Job queue enabled with Redis");
	} catch (error) {
		logger.warn("Job queue initialization failed, continuing without job queue", {
			error: error instanceof Error ? (error as Error).message : String(error),
		});
	}
} else {
	logger.info("Job queue disabled (REDIS_ENABLED=false)");
}
cronScheduler.initializeDefaultTasks();

type Message = { role: "user" | "assistant" | "system"; content: string };
type ChatRequest = {
	messages: Message[];
	mode?: "sweet" | "normal" | "professional" | "casual" | "creative" | "technical" | "openai";
};

// Extended Request type for middleware data
interface ExtendedRequest extends Request {
	__span?: {
		spanId: string;
		traceId: string;
	};
	__startTime?: number;
}

// ---------------- Config ----------------
const CONFIG = {
	PORT: Number(process.env.PORT) || 3000,
	RAG_API_URL: DATABASE_CONFIG.RAG_API_URL,
	RAG_TIMEOUT: DATABASE_CONFIG.RAG_TIMEOUT,
	MODEL_NAME: process.env.MODEL_NAME || "llama3.2",
	OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
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
function jsonError(status: number, message: string, traceId?: string) {
	return new Response(
		JSON.stringify({
			error: message,
			traceId: traceId || undefined,
			timestamp: new Date().toISOString(),
		}),
		{
			status,
			headers: { "content-type": "application/json" },
		},
	);
}

async function checkRateLimit(key: string) {
	try {
		const allowed = await checkRateLimitRedis(key, CONFIG.MAX_REQUESTS_PER_MINUTE);
		if (!allowed) {
			logger.warn(`Rate limit exceeded for key: ${key}`);
			auditLogger.log({
				userId: key.split(":")[0],
				action: "rate_limit_exceeded",
				resource: key,
				timestamp: new Date().toISOString(),
			});
		}
		return allowed;
	} catch {
		logger.warn("Rate limit fallback: Redis unavailable");
		return true; // fallback: allow
	}
}

function containsDangerousKeywords(text: string) {
	const bad = [/\b(drop|delete)\b/i, /<script/i];
	return bad.some((r) => r.test(text));
}

// Build a Content-Security-Policy header value based on configured upstreams
function buildCSP(requestUrl: string): string {
	// Collect connect-src origins (SSE/Ollama/FastAPI/WebSocket)
	const connect = new Set<string>(["'self'", "ws:", "wss:"]);
	const addOrigin = (u?: string) => {
		try {
			if (!u) return;
			const origin = new URL(u).origin;
			if (origin && origin !== "null") connect.add(origin);
		} catch {}
	};
	addOrigin(CONFIG.OLLAMA_BASE_URL);
	addOrigin(process.env.FASTAPI_BASE_URL || DATABASE_CONFIG.FASTAPI_BASE_URL);

	// Conservative defaults; allow data: for images/fonts used by UI
	const csp = [
		"default-src 'self'",
		"base-uri 'self'",
		"object-src 'none'",
		"frame-ancestors 'none'",
		"script-src 'self'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data:",
		"font-src 'self' data:",
		`connect-src ${Array.from(connect).join(' ')}`,
		// Form submissions remain local
		"form-action 'self'",
	];
	return csp.join("; ");
}

// ---------------- App ----------------
// Create audit middleware
const auditMiddleware = createAuditMiddleware({
	excludePaths: ["/ping", "/health", "/metrics", "/swagger"],
	excludeMethods: ["OPTIONS"],
	includeBody: false,
});

app
	.use(
		cors({
			origin: CONFIG.ALLOWED_ORIGINS,
			credentials: true,
			allowedHeaders: ["Authorization", "Content-Type"],
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			// preflightContinue: false, // 型未対応のため削除
		}),
	)
	.use(html())
	.use(staticPlugin({ assets: "public" }))
	.use(openapi({ path: "/swagger", references: fromTypes() }))
	// Telemetry and metrics middleware
	.onBeforeHandle(({ request }) => {
		const url = new URL(request.url);
		const path = url.pathname;
		const traceContext = getTraceContextFromRequest(request);
		const span = telemetry.startSpan(`HTTP ${request.method} ${path}`, {
			parentContext: traceContext || undefined,
			attributes: {
				"http.method": request.method,
				"http.url": request.url,
				"http.route": path,
			},
		});
		(request as unknown as ExtendedRequest).__span = span;
		(request as unknown as ExtendedRequest).__startTime = Date.now();
		metricsCollector.incrementRequest(request.method, path, 200);
	})
	// Audit middleware - track all requests
	.onBeforeHandle(auditMiddleware.beforeHandle)
	.onError(({ error, code, request, set }) => {
		const url = new URL(request.url);
		const errorMsg = error instanceof Error ? error.message : String(error);
		const traceId = (request as unknown as ExtendedRequest).__span?.traceId || undefined;
		const userId = request.headers.get("authorization")?.substring(7) || "anon";
		const errorLog = `${String(code)}: ${errorMsg} at ${url.pathname} traceId=${traceId}`;
		logger.error(errorLog);
		metricsCollector.incrementError(request.method, url.pathname, String(code));
		// 監査ログ強化
		auditLogger.log({
			userId,
			action: "error",
			resource: url.pathname,
			error: errorMsg,
			traceId,
			timestamp: new Date().toISOString(),
		});
		const span = (request as unknown as ExtendedRequest).__span;
		if (span) {
			telemetry.endSpan(span.spanId, {
				code: "ERROR",
				message: errorMsg,
			});
		}
		// Audit middleware - log failed requests
		try {
			auditMiddleware.onError({ request, error, set });
		} catch {}
		const message = error instanceof Error ? error.message : "Internal server error";
		// Map Elysia error code to HTTP status (default 500)
		let status = 500;
		if (code === "NOT_FOUND") status = 404;
		else if (code === "VALIDATION") status = 400;
		else if (code === "UNAUTHORIZED") status = 401;
		else if (code === "FORBIDDEN") status = 403;
		return jsonError(status, message, traceId);
	})
	.onAfterHandle(({ set, request, response }) => {
		set.headers["X-Content-Type-Options"] = "nosniff";
		set.headers["X-Frame-Options"] = "DENY";
		// 追加の推奨セキュリティヘッダ
		set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
		set.headers["X-XSS-Protection"] = "1; mode=block";
		set.headers["Cross-Origin-Opener-Policy"] = "same-origin";
		const reqUrl = new URL(request.url);
		// Swaggerは外部アセットを用いる可能性があるためCSP適用を除外
		if (!reqUrl.pathname.startsWith("/swagger")) {
			set.headers["Content-Security-Policy"] = buildCSP(request.url);
		}
		if ((request.url || "").startsWith("https://")) {
			set.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
		}
		// 追加の推奨セキュリティヘッダ
		set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
		set.headers["X-XSS-Protection"] = "1; mode=block";
		if ((request.url || "").startsWith("https://")) {
			set.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
		}
		const extReq = request as unknown as ExtendedRequest;
		const span = extReq.__span;
		if (span) {
			set.headers.traceparent = telemetry.createTraceContext(span.traceId, span.spanId);
			telemetry.endSpan(span.spanId);
		}
		const startTime = extReq.__startTime;
		if (startTime) {
			const duration = (Date.now() - startTime) / 1000;
			const url = new URL(request.url);
			metricsCollector.recordRequestDuration(request.method, url.pathname, duration);
		}
		// Audit middleware - log successful requests
		try {
			auditMiddleware.afterHandle?.({ request, set, response });
		} catch {}
	})

	// Health
	.get("/ping", () => ({ ok: true }), {
		detail: {
			tags: ["health"],
			summary: "Health check endpoint",
			description: "Returns a simple OK response to verify server is running",
		},
	})

	// Detailed health check
	.get(
		"/health",
		async ({ request }) => {
			try {
				const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
				const fastAPIBaseUrl = DATABASE_CONFIG.FASTAPI_BASE_URL;
				const health = await performHealthCheck(redisUrl, fastAPIBaseUrl, CONFIG.OLLAMA_BASE_URL);
				// HealthStatus型に詳細が無い場合はstatusのみ返却
				const status = health.status === "healthy" ? 200 : 503;
				return new Response(
					JSON.stringify({
						status: health.status,
						timestamp: new Date().toISOString(),
					}),
					{
						status,
						headers: { "content-type": "application/json" },
					},
				);
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				logger.error(`Health check failed: ${errorMsg}`);
				return jsonError(
					503,
					"Health check failed",
					(request as unknown as ExtendedRequest).__span?.traceId,
				);
			}
		},
		{
			detail: {
				tags: ["health"],
				summary: "Detailed health check",
				description: "Check status of Redis, FastAPI, Ollama, and system metrics",
			},
		},
	)

	// Prometheus metrics
	.get(
		"/metrics",
		() => {
			const metrics = metricsCollector.toPrometheusFormat();
			return new Response(metrics, {
				headers: { "content-type": "text/plain; version=0.0.4" },
			});
		},
		{
			detail: {
				tags: ["monitoring"],
				summary: "Prometheus metrics",
				description: "Expose metrics in Prometheus format",
			},
		},
	)

	// Index page
	.get(
		"/",
		() =>
			typeof (globalThis as any).Bun !== "undefined" &&
			typeof (globalThis as any).Bun.file === "function"
				? (globalThis as any).Bun.file("public/index.html")
				: undefined,
		{
			detail: {
				tags: ["ui"],
				summary: "Portfolio index page",
				description: "Serves the main Elysia AI portfolio and chat interface",
			},
		},
	)

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
			if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
			let payload: jwt.JwtPayload;
			try {
				payload = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as jwt.JwtPayload;
			} catch {
				return jsonError(401, "Invalid token");
			}
			if (!existsSync("data")) mkdirSync("data", { recursive: true });
			const ip = request.headers.get("x-forwarded-for") || "anon";
			const userId = (payload as { userId?: string }).userId || undefined;
			try {
				await feedbackService.create({
					userId,
					query: body.query,
					answer: body.answer,
					rating: body.rating,
					reason: body.reason || undefined,
				});
			} catch (err) {
				logger.error("Failed to store feedback", err instanceof Error ? err : undefined);
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
				description: "Submit feedback for a query-answer pair. Requires JWT authentication.",
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
			if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			} catch {
				return jsonError(401, "Invalid token");
			}
			try {
				await knowledgeService.create({
					question: body.summary,
					answer: body.sourceUrl || "No source provided",
					source: "api",
					verified: body.confidence > 0.8,
				});
			} catch (err) {
				logger.error("Failed to store knowledge", err instanceof Error ? err : undefined);
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
			if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
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
				const file =
					typeof (globalThis as any).Bun !== "undefined" &&
					typeof (globalThis as any).Bun.file === "function"
						? await (globalThis as any).Bun.file("data/knowledge.jsonl").text()
						: "";
				const lines = file.trim().split("\n").filter(Boolean);
				const last = lines.slice(Math.max(0, lines.length - n)).map((l: string) => JSON.parse(l));
				return new Response(JSON.stringify(last), {
					headers: { "content-type": "application/json" },
				});
			} catch {
				return jsonError(500, "Failed to read knowledge");
			}
		},
		{
			query: t.Object({ n: t.Optional(t.Number()) }),
			detail: {
				tags: ["knowledge"],
				summary: "Get recent knowledge entries",
				description: "Retrieve the last N knowledge entries from the knowledge base. Requires JWT.",
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
			if (username !== CONFIG.AUTH_USERNAME || password !== CONFIG.AUTH_PASSWORD)
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
			return new Response(JSON.stringify({ accessToken, refreshToken, expiresIn: 900 }), {
				headers: { "content-type": "application/json" },
			});
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
				payload = jwt.verify(refreshToken, CONFIG.JWT_REFRESH_SECRET) as jwt.JwtPayload;
			} catch {
				return jsonError(401, "Invalid or expired refresh token");
			}
			const userId = (payload as { userId?: string }).userId || "default-user";
			const isValid = await verifyStoredRefreshToken(userId, refreshToken);
			if (!isValid) return jsonError(401, "Refresh token not found or revoked");
			const newAccessToken = jwt.sign(
				{ iss: "elysia-ai", userId, iat: Math.floor(Date.now() / 1000) },
				CONFIG.JWT_SECRET,
				{ expiresIn: "15m" },
			);
			return new Response(JSON.stringify({ accessToken: newAccessToken, expiresIn: 900 }), {
				headers: { "content-type": "application/json" },
			});
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
				const payload = jwt.verify(refreshToken, CONFIG.JWT_REFRESH_SECRET) as jwt.JwtPayload;
				const userId = (payload as { userId?: string }).userId || "default-user";
				await revokeRefreshToken(userId);
				return new Response(JSON.stringify({ message: "Logged out successfully" }), {
					headers: { "content-type": "application/json" },
				});
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
				if (!auth.startsWith("Bearer ")) throw new Error("Missing Bearer token");
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
					const ip =
						request.headers.get("x-forwarded-for") ||
						request.headers.get("x-real-ip") ||
						"anon";
					let userId = "anon";
					const auth = request.headers.get("authorization") || "";
					try {
						if (auth.startsWith("Bearer ")) {
							const payload = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as jwt.JwtPayload;
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
						if (containsDangerousKeywords(cleaned)) throw new Error("Dangerous content detected");
						return { ...m, content: cleaned };
					});

					// カジュアルモードの場合、Web検索を試行
					let enhancedSystemPrompt = llmConfig.systemPrompt;
					let fallbackCasualResponse = "";
					if (mode === "casual" && body.messages.length > 0) {
						const lastUserMessage = body.messages[body.messages.length - 1];
						if (lastUserMessage.role === "user") {
							try {
								// パターン応答＋話題提案をランダム化
								const casualResponse = await casualChat.generateCasualResponse(
									lastUserMessage.content,
								);
								const topicPrompt = casualChat.getRandomTopic().prompt;
								// 50%で話題提案、50%でパターン応答
								fallbackCasualResponse = Math.random() < 0.5 ? casualResponse : topicPrompt;
								// 万一空文字なら話題提案
								if (!fallbackCasualResponse || fallbackCasualResponse.trim() === "") {
									fallbackCasualResponse = topicPrompt;
								}
								enhancedSystemPrompt += `\n\n参考情報: ${fallbackCasualResponse}`;
							} catch {
								// fallback: ランダム話題
								fallbackCasualResponse = casualChat.getRandomTopic().prompt;
							}
						} else {
							// ユーザー発話がない場合は話題提案
							fallbackCasualResponse = casualChat.getRandomTopic().prompt;
						}
					} else {
						// カジュアル以外は従来通り
						fallbackCasualResponse =
							"今日はどんな一日でしたか？何か話したいことがあれば教えてください！";
					}

					const messagesWithSystem: Message[] = [
						{ role: "system", content: enhancedSystemPrompt },
						...sanitizedMessages,
					];

					try {
						// OpenAIモードの場合はOpenAI APIを使用
						if (mode === "openai") {
							try {
								const openaiMessages = messagesWithSystem.map((m) => ({
									role: m.role,
									content: m.content,
								}));

								// ストリーミングレスポンスを生成
								const stream = new ReadableStream({
									async start(controller) {
										try {
											for await (const chunk of openaiIntegration.streamChatWithOpenAI(
												openaiMessages,
												{
													model: llmConfig.model,
													temperature: llmConfig.temperature,
												},
											)) {
												const sseData = `data: ${JSON.stringify({ content: chunk })}\n\n`;
												controller.enqueue(new TextEncoder().encode(sseData));
											}
											controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
											controller.close();
										} catch (error) {
											const errorMsg = error instanceof Error ? error.message : String(error);
											controller.enqueue(
												new TextEncoder().encode(
													`data: ${JSON.stringify({ error: errorMsg, content: fallbackCasualResponse })}\n\n`,
												),
											);
											controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
											controller.close();
										}
									},
								});

								return new Response(stream, {
									headers: {
										"Content-Type": "text/event-stream",
										"Cache-Control": "no-cache",
										Connection: "keep-alive",
										"X-Elysia-Mode": mode,
										"X-Elysia-Provider": "openai",
									},
								});
							} catch (openaiError) {
								const errorMsg =
									openaiError instanceof Error ? openaiError.message : String(openaiError);
								logger.error(`OpenAI API error: ${errorMsg}`);
								// OpenAIエラー時も日本語日常会話返答＋エラー内容
								const stream = new ReadableStream({
									start(controller) {
										const sseData = `data: ${JSON.stringify({ error: errorMsg, content: fallbackCasualResponse })}\n\n`;
										controller.enqueue(new TextEncoder().encode(sseData));
										controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
										controller.close();
									},
								});
								return new Response(stream, {
									headers: {
										"Content-Type": "text/event-stream",
										"Cache-Control": "no-cache",
										Connection: "keep-alive",
										"X-Elysia-Mode": mode,
										"X-Elysia-Provider": "openai",
									},
								});
							}
						}

						// 通常のOllama APIを使用
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
						} catch (ollamaError) {
							const errorMsg =
								ollamaError instanceof Error ? ollamaError.message : String(ollamaError);
							logger.error(`Ollama API error: ${errorMsg}`);
							// Ollamaエラー時も日本語日常会話返答＋エラー内容
							const stream = new ReadableStream({
								start(controller) {
									const sseData = `data: ${JSON.stringify({ error: errorMsg, content: fallbackCasualResponse })}\n\n`;
									controller.enqueue(new TextEncoder().encode(sseData));
									controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
									controller.close();
								},
							});
							return new Response(stream, {
								headers: {
									"Content-Type": "text/event-stream",
									"Cache-Control": "no-cache",
									Connection: "keep-alive",
									"X-Elysia-Mode": mode,
								},
							});
						}
					} catch (error) {
						// 予期せぬエラー時も日本語日常会話返答＋エラー内容
						const errorMsg = error instanceof Error ? error.message : String(error);
						logger.error(`Internal chat error: ${errorMsg}`);
						const stream = new ReadableStream({
							start(controller) {
								const sseData = `data: ${JSON.stringify({ error: errorMsg, content: fallbackCasualResponse })}\n\n`;
								controller.enqueue(new TextEncoder().encode(sseData));
								controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
								controller.close();
							},
						});
						return new Response(stream, {
							headers: {
								"Content-Type": "text/event-stream",
								"Cache-Control": "no-cache",
								Connection: "keep-alive",
								"X-Elysia-Mode": mode,
							},
						});
					}
				},
				{
					body: t.Object({
						messages: t.Array(
							t.Object({
								role: t.Union([t.Literal("user"), t.Literal("assistant"), t.Literal("system")]),
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
								t.Literal("casual"),
								t.Literal("creative"),
								t.Literal("technical"),
								t.Literal("openai"),
							]),
						),
					}),
					detail: {
						tags: ["chat"],
						summary: "Chat with Elysia AI (Multi-LLM)",
						description:
							"Send chat messages to Elysia AI with selectable personality modes (sweet/normal/professional/casual/creative/technical). Casual mode enables friendly daily conversations. Returns streaming SSE response. Requires JWT.",
						security: [{ bearerAuth: [] }],
					},
				},
			),
	)

	// Admin API: Feedback Stats
	.get(
		"/admin/feedback/stats",
		async ({ request }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			} catch {
				return jsonError(401, "Invalid token");
			}

			const stats = await feedbackService.getStats();
			return new Response(JSON.stringify(stats), {
				headers: { "content-type": "application/json" },
			});
		},
		{
			detail: {
				tags: ["admin"],
				summary: "Get feedback statistics",
				security: [{ bearerAuth: [] }],
			},
		},
	)

	// Admin API: List Feedback
	.get(
		"/admin/feedback",
		async ({ request }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			} catch {
				return jsonError(401, "Invalid token");
			}

			const feedbacks = await feedbackService.getRecent(100);
			return new Response(JSON.stringify(feedbacks), {
				headers: { "content-type": "application/json" },
			});
		},
		{
			detail: {
				tags: ["admin"],
				summary: "Get recent feedback",
				security: [{ bearerAuth: [] }],
			},
		},
	)

	// Admin API: List Knowledge
	.get(
		"/admin/knowledge",
		async ({ request }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			} catch {
				return jsonError(401, "Invalid token");
			}

			const knowledge = await knowledgeService.getAll(false);
			return new Response(JSON.stringify(knowledge), {
				headers: { "content-type": "application/json" },
			});
		},
		{
			detail: {
				tags: ["admin"],
				summary: "Get all knowledge entries",
				security: [{ bearerAuth: [] }],
			},
		},
	)

	// Admin API: Verify Knowledge
	.post(
		"/admin/knowledge/:id/verify",
		async ({ params, request }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			} catch {
				return jsonError(401, "Invalid token");
			}

			await knowledgeService.verify(params.id);
			return new Response(JSON.stringify({ ok: true }), {
				headers: { "content-type": "application/json" },
			});
		},
		{
			detail: {
				tags: ["admin"],
				summary: "Verify knowledge entry",
				security: [{ bearerAuth: [] }],
			},
		},
	)

	// Admin API: Delete Knowledge
	.delete(
		"/admin/knowledge/:id",
		async ({ params, request }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			} catch {
				return jsonError(401, "Invalid token");
			}

			await knowledgeService.delete(params.id);
			return new Response(JSON.stringify({ ok: true }), {
				headers: { "content-type": "application/json" },
			});
		},
		{
			detail: {
				tags: ["admin"],
				summary: "Delete knowledge entry",
				security: [{ bearerAuth: [] }],
			},
		},
	)

	// ==================== チャットセッション管理 ====================
	// セッション作成
	.post(
		"/sessions",
		async ({ body, request }) => {
			const auth = request.headers.get("authorization") || "";
			let userId: string | undefined;

			try {
				if (auth.startsWith("Bearer ")) {
					const payload = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as jwt.JwtPayload;
					userId = (payload as { userId?: string }).userId;
				}
			} catch {}

			const mode = (body as { mode?: string }).mode || "normal";
			const sessionId = await chatSessionService.createChatSession(
				userId,
				mode as "sweet" | "normal" | "professional",
			);

			return new Response(JSON.stringify({ sessionId }), {
				headers: { "content-type": "application/json" },
			});
		},
		{
			body: t.Object({
				mode: t.Optional(
					t.Union([
						t.Literal("sweet"),
						t.Literal("normal"),
						t.Literal("professional"),
						t.Literal("casual"),
						t.Literal("creative"),
						t.Literal("technical"),
					]),
				),
			}),
			detail: {
				tags: ["sessions"],
				summary: "新しいチャットセッションを作成",
			},
		},
	)

	// セッション取得
	.get(
		"/sessions/:id",
		async ({ params }) => {
			const session = await chatSessionService.getSession(params.id);
			if (!session) return jsonError(404, "Session not found");

			return new Response(JSON.stringify(session), {
				headers: { "content-type": "application/json" },
			});
		},
		{
			detail: {
				tags: ["sessions"],
				summary: "セッション詳細を取得",
			},
		},
	)

	// ユーザーのセッション一覧
	.get(
		"/sessions",
		async ({ request, query }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");

			try {
				const payload = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as jwt.JwtPayload;
				const userId = (payload as { userId?: string }).userId;
				if (!userId) return jsonError(401, "Invalid token");

				const limit = Number(query?.limit ?? 20) || 20;
				const sessions = await chatSessionService.getUserSessions(userId, limit);

				return new Response(JSON.stringify(sessions), {
					headers: { "content-type": "application/json" },
				});
			} catch {
				return jsonError(401, "Invalid token");
			}
		},
		{
			query: t.Object({ limit: t.Optional(t.Number()) }),
			detail: {
				tags: ["sessions"],
				summary: "ユーザーのセッション一覧を取得",
				security: [{ bearerAuth: [] }],
			},
		},
	)

	// セッション削除
	.delete(
		"/sessions/:id",
		async ({ params, request }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");

			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
				const success = await chatSessionService.deleteSession(params.id);
				if (!success) return jsonError(404, "Session not found");

				return new Response(JSON.stringify({ success: true }), {
					headers: { "content-type": "application/json" },
				});
			} catch {
				return jsonError(401, "Invalid token");
			}
		},
		{
			detail: {
				tags: ["sessions"],
				summary: "セッションを削除",
				security: [{ bearerAuth: [] }],
			},
		},
	)

	// セッションエクスポート（JSON/Markdown）
	.get(
		"/sessions/:id/export",
		async ({ params, query }) => {
			const format = (query?.format as string) || "json";
			const sessionId = params.id;

			if (format === "json") {
				const data = await chatSessionService.exportSessionAsJSON(sessionId);
				if (!data) return jsonError(404, "Session not found");

				return new Response(data, {
					headers: {
						"content-type": "application/json",
						"content-disposition": `attachment; filename="session-${sessionId}.json"`,
					},
				});
			}

			if (format === "markdown") {
				const data = await chatSessionService.exportSessionAsMarkdown(sessionId);
				if (!data) return jsonError(404, "Session not found");

				return new Response(data, {
					headers: {
						"content-type": "text/markdown",
						"content-disposition": `attachment; filename="session-${sessionId}.md"`,
					},
				});
			}

			return jsonError(400, "Invalid format. Use 'json' or 'markdown'");
		},
		{
			query: t.Object({
				format: t.Optional(t.Union([t.Literal("json"), t.Literal("markdown")])),
			}),
			detail: {
				tags: ["sessions"],
				summary: "セッションをエクスポート（JSON/Markdown）",
			},
		},
	)

	// セッション統計
	.get(
		"/sessions/:id/stats",
		async ({ params }) => {
			const stats = await chatSessionService.getSessionStats(params.id);
			if (!stats) return jsonError(404, "Session not found");

			return new Response(JSON.stringify(stats), {
				headers: { "content-type": "application/json" },
			});
		},
		{
			detail: {
				tags: ["sessions"],
				summary: "セッション統計を取得",
			},
		},
	);

// ==================== カスタマイズAPI ====================

// プロンプトテンプレート一覧
app.get(
	"/customization/templates",
	async () => {
		return new Response(JSON.stringify(customization.defaultPromptTemplates), {
			headers: { "content-type": "application/json" },
		});
	},
	{
		detail: {
			tags: ["customization"],
			summary: "プロンプトテンプレート一覧を取得",
		},
	},
);

// テーマ一覧
app.get(
	"/customization/themes",
	async () => {
		return new Response(JSON.stringify(customization.defaultThemes), {
			headers: { "content-type": "application/json" },
		});
	},
	{
		detail: {
			tags: ["customization"],
			summary: "テーマ一覧を取得",
		},
	},
);

// チャットモード一覧
app.get(
	"/customization/modes",
	async () => {
		return new Response(JSON.stringify(customization.chatModes), {
			headers: { "content-type": "application/json" },
		});
	},
	{
		detail: {
			tags: ["customization"],
			summary: "チャットモード一覧を取得",
		},
	},
);

// Web検索 (カジュアルチャット用)
app.get(
	"/api/search",
	async ({ query }: { query: Record<string, string> }) => {
		const q = query.q;
		if (!q) {
			return jsonError(400, "クエリパラメータ 'q' が必要です");
		}
		try {
			const result = await webSearch.searchRelevantInfo(q);
			return new Response(JSON.stringify({ result }), {
				headers: { "content-type": "application/json" },
			});
		} catch (error) {
			return jsonError(500, "検索エラー");
		}
	},
	{
		detail: {
			tags: ["search"],
			summary: "インターネット検索",
			description:
				"Wikipedia、天気、ニュース、Web検索などを統合した検索API。カジュアルチャットモードで使用。",
		},
	},
);

// エクスポート形式一覧
app.get(
	"/customization/export-formats",
	async () => {
		return new Response(JSON.stringify(customization.exportFormats), {
			headers: { "content-type": "application/json" },
		});
	},
	{
		detail: {
			tags: ["customization"],
			summary: "エクスポート形式一覧を取得",
		},
	},
);

// ==================== Additional APIs ====================

// User Registration
app.post(
	"/auth/register",
	async ({ body }: { body: { username: string; password: string } }) => {
		const { username, password } = body;

		const existing = await userService.findByUsername(username);
		if (existing) {
			return jsonError(400, "Username already exists");
		}

		if (password.length < 8) {
			return jsonError(400, "Password must be at least 8 characters");
		}

		try {
			const { createUser } = await import("./lib/security");
			const user = await createUser(username, password, "user");

			return new Response(
				JSON.stringify({
					success: true,
					userId: user.id,
					username: user.username,
				}),
				{ headers: { "content-type": "application/json" } },
			);
		} catch (error) {
			logger.error("Registration failed", error instanceof Error ? error : undefined);
			return jsonError(500, "Registration failed");
		}
	},
	{
		body: t.Object({
			username: t.String({ minLength: 3, maxLength: 32 }),
			password: t.String({ minLength: 8, maxLength: 128 }),
		}),
		detail: {
			tags: ["auth"],
			summary: "Register new user",
		},
	},
);

// Data Export APIs
app.get("/admin/export/feedback", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	const { exportFeedbackToCSV } = await import("./lib/data-export");
	const csv = await exportFeedbackToCSV();

	return new Response(csv, {
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="feedback_${new Date().toISOString().split("T")[0]}.csv"`,
		},
	});
});

app.get("/admin/export/knowledge/json", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	const { exportKnowledgeToJSON } = await import("./lib/data-export");
	const json = await exportKnowledgeToJSON();

	return new Response(json, {
		headers: {
			"content-type": "application/json; charset=utf-8",
			"content-disposition": `attachment; filename="knowledge_${new Date().toISOString().split("T")[0]}.json"`,
		},
	});
});

app.get("/admin/analytics", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	const { apiAnalytics } = await import("./lib/api-analytics");
	const data = apiAnalytics.exportJSON();

	return new Response(JSON.stringify(data), {
		headers: { "content-type": "application/json" },
	});
});

// Webhook Management APIs
app.get("/admin/webhooks", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	return { webhooks: webhookManager.getSubscriptions() };
});

// API Key Management APIs
app.post(
	"/admin/api-keys",
	async ({ request, body }) => {
		const auth = request.headers.get("authorization") || "";
		if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
		try {
			jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
		} catch {
			return jsonError(401, "Invalid token");
		}

		const { name, rateLimit, expiresInDays } = body as {
			name: string;
			rateLimit?: number;
			expiresInDays?: number;
		};
		const apiKey = apiKeyManager.generateKey({
			name,
			rateLimit,
			expiresInDays,
		});

		return { success: true, key: apiKey.key };
	},
	{
		body: t.Object({
			name: t.String({ minLength: 1 }),
			rateLimit: t.Optional(t.Number()),
			expiresInDays: t.Optional(t.Number()),
		}),
	},
);

app.get("/admin/api-keys", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	return {
		keys: apiKeyManager.listKeys(),
		stats: apiKeyManager.getUsageStats(),
	};
});

// Backup Management APIs
app.get("/admin/backups", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	return {
		status: backupScheduler.getStatus(),
		history: backupScheduler.getBackupHistory(),
	};
});

app.post("/admin/backups/trigger", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	await backupScheduler.triggerManualBackup();
	return { success: true, message: "Backup triggered" };
});

// Health Monitoring APIs
app.get("/admin/health-monitor", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	return healthMonitor.getStatus();
});

// Session Management APIs
app.get("/admin/sessions", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		const payload = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as {
			userId: string;
		};
		return {
			sessions: sessionManager.getUserSessions(payload.userId),
			stats: sessionManager.getStats(),
		};
	} catch {
		return jsonError(401, "Invalid token");
	}
});

// A/B Testing APIs
app.get("/admin/ab-tests", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	return { tests: abTestManager.listTests() };
});

app.get("/admin/ab-tests/:testId", async ({ request, params }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	const results = abTestManager.getTestResults(params.testId);
	if (!results) return jsonError(404, "Test not found");

	return results;
});

// Log Cleanup APIs
app.get("/admin/logs/cleanup", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	return logCleanupManager.getStats();
});

app.post("/admin/logs/cleanup/trigger", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	await logCleanupManager.triggerManualCleanup();
	return { success: true, message: "Log cleanup triggered" };
});

// ---------------- Job Queue API ----------------
app.get("/admin/jobs/stats", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	return await jobQueue.getStats();
});

app.post("/admin/jobs/email", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	const body = (await request.json()) as {
		to: string;
		subject: string;
		html: string;
	};
	const job = (await jobQueue.sendEmail(body.to, body.subject, body.html)) as {
		id: string;
	};
	return { success: true, jobId: job.id };
});

app.post("/admin/jobs/report", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	const body = (await request.json()) as {
		reportType: "daily" | "weekly" | "monthly";
		startDate: string;
		endDate: string;
	};
	const job = (await jobQueue.generateReport(
		body.reportType,
		new Date(body.startDate),
		new Date(body.endDate),
	)) as { id: string };
	return { success: true, jobId: job.id };
});

// ---------------- File Upload API ----------------
app.post("/upload", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	let userId: string;
	try {
		const decoded = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as {
			username: string;
		};
		userId = decoded.username;
	} catch {
		return jsonError(401, "Invalid token");
	}

	const formData = await request.formData();
	const file = formData.get("file") as File;
	if (!file) {
		return jsonError(400, "No file provided");
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const uploadedFile = await fileUploadManager.upload(buffer, file.name, file.type, { userId });

	return {
		success: true,
		file: {
			id: uploadedFile.id,
			originalName: uploadedFile.originalName,
			size: uploadedFile.size,
			mimeType: uploadedFile.mimeType,
		},
	};
});

app.get("/files/:fileId", async ({ request, params }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	const { fileId } = params;
	const file = fileUploadManager.getFile(fileId);
	if (!file) {
		return jsonError(404, "File not found");
	}

	const buffer = fileUploadManager.readFile(fileId);
	if (!buffer) {
		return jsonError(404, "File not found");
	}

	return new Response(new Uint8Array(buffer), {
		headers: {
			"content-type": file.mimeType,
			"content-disposition": `attachment; filename="${file.originalName}"`,
		},
	});
});

app.get("/files", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	let userId: string;
	try {
		const decoded = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as {
			username: string;
		};
		userId = decoded.username;
	} catch {
		return jsonError(401, "Invalid token");
	}

	const files = fileUploadManager.getUserFiles(userId);
	return {
		files: files.map((f) => ({
			id: f.id,
			originalName: f.originalName,
			size: f.size,
			mimeType: f.mimeType,
			uploadedAt: f.uploadedAt,
		})),
	};
});

// ---------------- Cron Scheduler API ----------------
app.get("/admin/cron/tasks", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	return { tasks: cronScheduler.listTasks() };
});

app.get("/admin/cron/stats", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	return cronScheduler.getStats();
});

app.post("/admin/cron/tasks/:name/run", async ({ request, params }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	try {
		await cronScheduler.runTask(params.name);
		return { success: true, message: `Task ${params.name} executed` };
	} catch (error) {
		return jsonError(400, (error as Error).message);
	}
});

// ---------------- Audit Log API ----------------
app.get("/admin/audit/logs", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	const url = new URL(request.url);
	const result = auditLogger.search({
		userId: url.searchParams.get("userId") || undefined,
		action: url.searchParams.get("action") || undefined,
		resource: url.searchParams.get("resource") || undefined,
		limit: Number(url.searchParams.get("limit")) || 100,
		offset: Number(url.searchParams.get("offset")) || 0,
	});

	return result;
});

app.get("/admin/audit/stats", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	return auditLogger.getStats();
});

app.get("/admin/audit/export", async ({ request }) => {
	const auth = request.headers.get("authorization") || "";
	if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
	try {
		jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
	} catch {
		return jsonError(401, "Invalid token");
	}

	const url = new URL(request.url);
	const format = (url.searchParams.get("format") as "json" | "csv") || "json";
	const content = auditLogger.export(format);

	if (!content) {
		return jsonError(400, "Invalid format");
	}

	return new Response(content, {
		headers: {
			"content-type": format === "json" ? "application/json" : "text/csv",
			"content-disposition": `attachment; filename="audit-logs.${format}"`,
		},
	});
});

// ---------------- Start Server ----------------
// Only start server if this is the main module
if (import.meta.main) {
	try {
		   const server = app.listen({
			   port: CONFIG.PORT,
		   });

		   // Bun環境ではWebSocketサーバーをスキップ
		   const isBun = typeof (globalThis as any).Bun !== "undefined";
		   if (!isBun) {
			   // WebSocketの初期化（HTTPサーバー取得後）
			   const httpServer = server.server;
			   if (httpServer) {
				   const { wsManager } = await import("./lib/websocket-manager");
				   wsManager.initialize(httpServer);
				   logger.info("WebSocket server initialized");
			   }
		   } else {
			   logger.info("Bun環境のためWebSocketサーバーはスキップされました");
		   }

		// APIドキュメント自動公開（swagger.jsonエクスポート）
		try {
			// Elysiaのプラグイン構造は内部実装のため、エクスポートはスキップ
			// 必要であればSwaggerエンドポイント (/swagger) を直接利用
			logger.info("Swagger documentation available at /swagger endpoint");
		} catch (err) {
			logger.warn("Swagger setup warning", { error: err });
		}

		logger.info("Elysia server started", {
			port: CONFIG.PORT,
			url: `http://localhost:${CONFIG.PORT}`,
			docs: `http://localhost:${CONFIG.PORT}/swagger`,
			health: `http://localhost:${CONFIG.PORT}/health`,
			metrics: `http://localhost:${CONFIG.PORT}/metrics`,
			websocket: `ws://localhost:${CONFIG.PORT}/ws`,
		});

		console.log(`
🚀 Elysia server is running!
📡 Port: ${CONFIG.PORT}
🌐 URL: http://localhost:${CONFIG.PORT}
📚 Docs: http://localhost:${CONFIG.PORT}/swagger
🏥 Health: http://localhost:${CONFIG.PORT}/health
📊 Metrics: http://localhost:${CONFIG.PORT}/metrics
🔌 WebSocket: ws://localhost:${CONFIG.PORT}/ws
`);

		// Export spans periodically
		setInterval(() => {
			const spans = telemetry.exportSpans();
			if (spans.length > 0) {
				logger.debug("Telemetry spans exported", { count: spans.length });
			}
		}, 30000); // Every 30 seconds
	} catch (error) {
		logger.error(
			"Failed to start server",
			error instanceof Error ? error : new Error(String(error)),
		);
		console.error("❌ Server startup failed:", error);
		process.exit(1);
	}
}

export default app;
export type App = typeof app;
