import dotenv from "dotenv";

dotenv.config({ override: true });

import { existsSync } from "node:fs";
import path from "node:path";
import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { helmet } from "elysia-helmet";
import { advancedRateLimiter } from "./lib/advanced-rate-limiter";
import { auditLogger } from "./lib/audit-logger";
import { createAuditMiddleware } from "./lib/audit-middleware";
import { CONFIG, jsonError } from "./lib/constants";
import { defenseManager } from "./lib/defense-manager";
import { logger } from "./lib/logger";
import { metricsCollector } from "./lib/metrics";
import { applySecurityHeaders } from "./lib/security-utils";
import { telemetry } from "./lib/telemetry";
import { adminRoutes } from "./routes/admin-routes";
import { aiRoutes } from "./routes/ai-routes";
// Import Modular Routes
import { authRoutes } from "./routes/auth-routes";
import { customizationRoutes } from "./routes/customization-routes";
import { databaseRoutes } from "./routes/database-routes";
import { fileRoutes } from "./routes/file-routes";
import { sessionRoutes } from "./routes/session-routes";
import { systemRoutes } from "./routes/system-routes";

const auditMiddleware = createAuditMiddleware();
const app = new Elysia();

app
	.use(helmet())
	.use(cors())
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
				],
			},
		}),
	)
	.use(
		staticPlugin({
			assets: existsSync("public") ? "public" : "../../public",
			prefix: "",
			alwaysUpdate: true,
		}),
	)
	.use(html())
	.onBeforeHandle(({ request, error }: any) => {
		const ip =
			request.headers.get("x-forwarded-for") ||
			request.headers.get("x-real-ip") ||
			"127.0.0.1";
		if (defenseManager.isBlocked(ip)) {
			logger.warn(`🛑 Blocked flagged IP: ${ip}`);
			return error(403, "Access denied by Alpha Protocol");
		}
		const url = new URL(request.url).pathname;
		const rateLimit = advancedRateLimiter.checkRateLimit(ip, url);
		if (!rateLimit.allowed)
			return error(429, rateLimit.reason || "Too Many Requests");
	})
	.error(({ code, error: rawError, set }) => {
		const isProduction = process.env.NODE_ENV === "production";
		const message = isProduction
			? "ごめんなさい、ちょっと考えがまとまらなくて……"
			: rawError?.message || "Internal Error";
		logger.error(`[${code}] Global Error:`, rawError?.message);
		if (set?.headers) set.headers["content-type"] = "application/json";
		return {
			error: message,
			status: code === "NOT_FOUND" ? 404 : 500,
			timestamp: new Date().toISOString(),
		};
	})
	.onAfterHandle(({ set, request }) => {
		applySecurityHeaders(set, request.url);
	})
	// Mounting Modular Routes
	.use(authRoutes)
	.use(aiRoutes)
	.use(systemRoutes)
	.use(adminRoutes)
	.use(sessionRoutes)
	.use(customizationRoutes)
	.use(fileRoutes)
	.use(databaseRoutes)

	.get("/ping", () => ({ status: "ok", timestamp: new Date().toISOString() }))
	.get("/", () => {
		const publicPaths = [
			"public/index.html",
			"public/desktop.html",
			"../../public/index.html",
		];
		for (const p of publicPaths) {
			if (existsSync(p)) return (globalThis as any).Bun.file(p);
		}
		return "ElysiaAI Landing Page (Resource Missing)";
	})
	.listen(CONFIG.PORT);

logger.info(
	`🌸 ElysiaAI Sovereign Server started on port ${CONFIG.PORT} (Modular Mode)`,
);
