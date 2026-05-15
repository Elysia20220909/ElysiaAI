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
import { gpuRoutes } from "./routes/gpu-routes";
import { learningRoutes } from "./routes/learning-routes";
import { neuralSystemRoutes } from "./routes/neural-system-routes";
import { projectRoutes } from "./routes/project-routes";
import { ruleRoutes } from "./routes/rule-routes";
import { sessionRoutes } from "./routes/session-routes";
import { slackRoutes } from "./routes/slack-routes";
import { systemRoutes } from "./routes/system-routes";
import { vtuberRoutes } from "./routes/vtuber-routes";

const app = new Elysia();
const requestStartedAt = new WeakMap<Request, number>();

checkEnvironmentOrExit();

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
					{ name: "gpu", description: "Realtime GPU Inference" },
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
		return;
	})
	.use(authRoutes)
	.use(projectRoutes)
	.use(ruleRoutes)
	.use(elysiaCoreRoutes)
	.use(aiRoutes)
	.use(gpuRoutes)
	.use(slackRoutes)
	.use(systemRoutes)
	.use(adminRoutes)
	.use(sessionRoutes)
	.use(learningRoutes)
	.use(neuralSystemRoutes)
	.use(customizationRoutes)
	.use(fileRoutes)
	.use(databaseRoutes)
	.use(vtuberRoutes)
	.listen(config.port);

logger.info(`🌸 ElysiaAI Sovereign Server started on port ${config.port} (Modular Mode)`);
