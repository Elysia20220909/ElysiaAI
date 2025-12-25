#!/usr/bin/env bun
/**
 * Development Server Startup Script
 * Hot reload, Debug API, Development tools enabled
 */

import "dotenv/config";
import cors from "@elysiajs/cors";
import staticServe from "@elysiajs/static";
import { Elysia } from "elysia";
import devConfig from "../src/dev/dev-config";
import { devLogger } from "../src/dev/dev-logger";

console.log("Starting development server...\n");

// Application setup
const app = new Elysia()
	.use(cors())
	.use(staticServe({ prefix: "/public" }))

	// Health check
	.get("/", () => ({
		name: "Elysia AI - Dev Server",
		version: "1.0.0",
		environment: "development",
		status: "running",
	}))

	// Basic test endpoint
	.get("/api/test", () => ({ message: "API is working" }))

	// Error handling
	.onError(({ error, code }) => {
		devLogger.error(`Error [${code}]`, { message: String(error) });
		return {
			error: String(error),
			code,
		};
	});

// Graceful shutdown
const signals = ["SIGTERM", "SIGINT"] as const;
for (const signal of signals) {
	process.on(signal, () => {
		devLogger.info(`${signal} received - Shutting down server`);
		app.stop();
		process.exit(0);
	});
}

// Start server
const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "localhost";

app.listen(PORT, () => {
	devLogger.info("Server started successfully", {
		url: `http://${HOST}:${PORT}`,
	});
	devLogger.info("Development API endpoints:");
	devLogger.debug("   - GET  /dev/health");
	devLogger.debug("   - GET  /dev/logs");
	devLogger.debug("   - POST /dev/logs/clear");
	devLogger.debug("   - GET  /dev/memory");
	devLogger.debug("   - POST /dev/reload");
	devLogger.debug("   - GET  /dev/config");

	if (devConfig.hotReload) {
		devLogger.info("Hot reload: enabled");
	}

	if (devConfig.debug) {
		devLogger.info("Debug mode: enabled");
		devLogger.info(`Log level: ${devConfig.logLevel}`);
	}
});
