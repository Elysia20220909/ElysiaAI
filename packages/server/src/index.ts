import dotenv from "dotenv";

dotenv.config();

import { existsSync } from "node:fs";
import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { helmet } from "elysia-helmet";
import { config, isProd } from "../../../src/config.ts";
import { advancedRateLimiter } from "./lib/advanced-rate-limiter";
import { jsonError, proxyToFastAPI } from "./lib/constants";
import { buildCorsConfig } from "./lib/cors-config";
import { defenseManager } from "./lib/defense-manager";
import { checkEnvironmentOrExit } from "./lib/env-validator";
import { performHealthCheck } from "./lib/health";
import { logger } from "./lib/logger";
import { metricsCollector } from "./lib/metrics";
import { applySecurityHeaders } from "./lib/security-utils";
import { slackSocketModeBridge } from "./lib/slack-socket-mode";
import { adminRoutes } from "./routes/admin-routes";
import { aiRoutes, handleElysiaLove, handleFeedback } from "./routes/ai-routes";
import { authRoutes } from "./routes/auth-routes";
import { customizationRoutes } from "./routes/customization-routes";
import { databaseRoutes } from "./routes/database-routes";
import { elysiaCoreRoutes } from "./routes/elysia-core-routes";
import { fileRoutes } from "./routes/file-routes";
import { learningRoutes } from "./routes/learning-routes";
import { neuralSystemRoutes } from "./routes/neural-system-routes";
import { projectRoutes } from "./routes/project-routes";
import { ruleRoutes } from "./routes/rule-routes";
import { sessionRoutes } from "./routes/session-routes";
import { slackRoutes } from "./routes/slack-routes";
import { systemRoutes } from "./routes/system-routes";
import { takumiRoutes } from "./routes/takumi-routes";
import { vtuberRoutes } from "./routes/vtuber-routes";

const app = new Elysia();
const requestStartedAt = new WeakMap<Request, number>();

checkEnvironmentOrExit();

app
	.use(helmet())
	.use(cors(buildCorsConfig()))
	.use(
		swagger({
			documentation: {
				info: {
					title: "ElysiaAI Core System",
					version: "1.3.0-modular",
					description: "Modularized Sovereign Security & Intelligence API.",
				},
				tags: [
					{ name: "auth", description: "Identity management" },
					{ name: "ai", description: "AI & LLM Services" },
					{ name: "system", description: "Infra & Monitoring" },
					{ name: "vtuber", description: "Open-LLM-VTuber bridge" },
				],
			},
		}),
	)
	.use(
		staticPlugin({
			assets: existsSync("public") ? "public" : "../../public",
			prefix: "",
		}),
	)
	.use(html())
	.onBeforeHandle(({ request, error }: any) => {
		requestStartedAt.set(request, Date.now());

		const ip =
			request.headers.get("x-forwarded-for") ||
			request.headers.get("x-real-ip") ||
			"127.0.0.1";

		if (defenseManager.isBlocked(ip)) {
			logger.warn(`🛑 Blocked flagged IP: ${ip}`);
			return error(403, "Access denied by Alpha Protocol");
		}

		const url = new URL(request.url).pathname;
		const suspiciousPaths = [
			"/.env",
			"/cmd.exe",
			"/powershell",
			"/wp-admin",
			"/config.json",
			"/aws/credentials",
			"/.git/config",
		];
		if (suspiciousPaths.some((path) => url.toLowerCase().includes(path))) {
			defenseManager.reportSuspiciousActivity(
				ip,
				`Attempted access to honeypot/sensitive path: ${url}`,
			);
			return error(403, "Access Denied by AEGIS Sandbox Isolation");
		}

		const userAgent = request.headers.get("user-agent") || "";
		if (
			userAgent.includes("curl") ||
			userAgent.includes("python-requests") ||
			userAgent.includes("Go-http-client") ||
			userAgent.includes("Meterpreter")
		) {
			if (ip !== "127.0.0.1" && ip !== "::1") {
				defenseManager.reportSuspiciousActivity(
					ip,
					`Suspicious User-Agent detected: ${userAgent}`,
				);
			}
		}

		const rateLimit = advancedRateLimiter.checkRateLimit(ip, url);
		if (!rateLimit.allowed) {
			defenseManager.reportSuspiciousActivity(
				ip,
				`Rate limit exceeded repeatedly on ${url}`,
			);
			return error(429, rateLimit.reason || "Too Many Requests");
		}
	})
	.onError(({ code, error: rawError, set, request }: any) => {
		const message = isProd
			? "ごめんなさい、ちょっと考えがまとまらなくて……"
			: rawError?.message || "Internal Error";

		if (request) {
			const pathname = new URL(request.url).pathname;
			metricsCollector.incrementError(
				request.method,
				pathname,
				code === "NOT_FOUND" ? "not_found" : "internal",
			);
		}

		logger.error(
			`[${code}] Global Error:`,
			rawError instanceof Error ? rawError : undefined,
		);
		if (set?.headers) set.headers["content-type"] = "application/json";

		return {
			error: message,
			status: code === "NOT_FOUND" ? 404 : 500,
			timestamp: new Date().toISOString(),
		};
	})
	.onAfterHandle(({ set, request }) => {
		applySecurityHeaders(set, request.url);

		const pathname = new URL(request.url).pathname;
		const status = Number(set.status || 200);
		const startedAt = requestStartedAt.get(request) || Date.now();
		metricsCollector.incrementRequest(request.method, pathname, status);
		metricsCollector.recordRequestDuration(
			request.method,
			pathname,
			(Date.now() - startedAt) / 1000,
		);
		requestStartedAt.delete(request);
	})
	.use(authRoutes)
	.use(projectRoutes)
	.use(ruleRoutes)
	.use(elysiaCoreRoutes)
	.use(aiRoutes)
	.use(slackRoutes)
	.use(systemRoutes)
	.use(takumiRoutes)
	.use(adminRoutes)
	.use(sessionRoutes)
	.use(learningRoutes)
	.use(neuralSystemRoutes)
	.use(customizationRoutes)
	.use(fileRoutes)
	.use(databaseRoutes)
	.use(vtuberRoutes)
	.get("/health", async () => {
		return await performHealthCheck();
	})
	.get("/metrics", ({ set }) => {
		set.headers["content-type"] = "text/plain; version=0.0.4; charset=utf-8";
		return metricsCollector.toPrometheusFormat();
	})
	.get("/vendor/three.module.js", ({ set }) => {
		const candidates = [
			"node_modules/three/build/three.module.js",
			"../../node_modules/three/build/three.module.js",
		];
		const assetPath = candidates.find((candidate) => existsSync(candidate));
		if (!assetPath) {
			set.status = 404;
			return "Three.js module not found";
		}
		set.headers["content-type"] = "text/javascript; charset=utf-8";
		return (globalThis as any).Bun.file(assetPath);
	})
	.get("/vendor/three.core.js", ({ set }) => {
		const candidates = [
			"node_modules/three/build/three.core.js",
			"../../node_modules/three/build/three.core.js",
		];
		const assetPath = candidates.find((candidate) => existsSync(candidate));
		if (!assetPath) {
			set.status = 404;
			return "Three.js core module not found";
		}
		set.headers["content-type"] = "text/javascript; charset=utf-8";
		return (globalThis as any).Bun.file(assetPath);
	})
	.get("/api/health", async () => {
		const kernelHealth = await proxyToFastAPI("/health", "GET");
		if (kernelHealth instanceof Response) {
			return kernelHealth;
		}

		const serviceHealth = await performHealthCheck();

		return {
			status: kernelHealth.status || serviceHealth.status,
			ollama: serviceHealth.services.ollama.status !== "down",
			kernel: true,
			workspace:
				kernelHealth.workspace ?? kernelHealth.milvus_connected ?? true,
			embedding_provider: kernelHealth.embedding_provider,
			quotes_loaded: kernelHealth.quotes_loaded,
			aether: defenseManager.getAetherStatus(),
		};
	})
	.post(
		"/api/process",
		async ({ body }) => {
			const query = (body as { query?: string }).query?.trim();
			if (!query) {
				return jsonError(400, "Missing query");
			}

			const response = await proxyToFastAPI("/chat", "POST", {
				messages: [{ role: "user", content: query }],
				session_id: "legacy-web-ui",
				stream: false,
			});

			if (response instanceof Response) {
				return response;
			}

			return {
				response: response.response || "",
				thoughts: response.quotes || [],
				context: response.context || "",
				status: "success",
			};
		},
		{
			body: t.Object({ query: t.String() }),
		},
	)
	.post(
		"/elysia-love",
		({ body, request }) => handleElysiaLove(body as any, request),
		{
			body: t.Object({
				messages: t.Array(t.Object({ role: t.String(), content: t.String() })),
				mode: t.Optional(t.String()),
				sessionId: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/feedback",
		({ body, request }) => handleFeedback(body as any, request),
		{
			body: t.Object({
				query: t.String(),
				answer: t.String(),
				rating: t.String(),
				reason: t.Optional(t.String()),
			}),
		},
	)
	.get("/ping", () => ({
		ok: true,
		status: "ok",
		timestamp: new Date().toISOString(),
	}))
	.get("/", () => {
		const publicPaths = [
			"index.html",
			"../../index.html",
			"public/index.html",
			"../../public/index.html",
		];
		for (const assetPath of publicPaths) {
			if (existsSync(assetPath)) return (globalThis as any).Bun.file(assetPath);
		}
		return "ElysiaAI Landing Page (Resource Missing)";
	})
	.listen(config.port);

logger.info(
	`🌸 ElysiaAI Sovereign Server started on port ${config.port} (Modular Mode)`,
);

void slackSocketModeBridge.start().catch((error) => {
	logger.warn("Slack Socket Mode startup skipped", {
		error: error instanceof Error ? error.message : "unknown",
	});
});

// Graceful Shutdown Logic
const handleShutdown = async (signal: string) => {
	logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);

	const shutdownTimeout = setTimeout(() => {
		logger.error("強制終了: Shutdown timed out, forcing exit.");
		process.exit(1);
	}, 5000);

	try {
		await app.stop();
		logger.info("Server stopped.");
		slackSocketModeBridge.stop();

		const { healthMonitor } = await import("./lib/health-monitor");
		const { logCleanupManager } = await import("./lib/log-cleanup");
		healthMonitor.stop();
		logCleanupManager.stop();

		clearTimeout(shutdownTimeout);
		logger.info("✅ Graceful shutdown complete. See you again! ♡");
		process.exit(0);
	} catch (error) {
		logger.error("Shutdown error:", error as Error);
		process.exit(1);
	}
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
