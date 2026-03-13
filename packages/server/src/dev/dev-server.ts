/**
 * Personal Development Server
 * Hot reload, debug API, development tools integration
 */

import type { Elysia } from "elysia";
import devConfig from "./dev-config";
import { debug, devLogger } from "./dev-logger";
import { hotReloadManager } from "./hot-reload";

export class DevServer {
	private app: Elysia;
	private reloadCallbacks: Set<() => void> = new Set();

	constructor(app: Elysia) {
		this.app = app;
		console.log("[Dev Server] Registering development API routes...");

		this.setupDevRoutes();
		this.setupHotReload();
	}

	private setupDevRoutes(): void {
		if (!devConfig.debug) return;

		// Health check
		this.app.get("/dev/health", () => ({
			status: "ok",
			timestamp: new Date(),
			uptime: process.uptime(),
		}));

		// Log retrieval
		this.app.get("/dev/logs", (req) => {
			const levelStr = (req.query?.level as string) || undefined;
			const level = levelStr as "debug" | "info" | "warn" | "error" | undefined;
			const limit = Number.parseInt((req.query?.limit as string) || "100", 10);
			return {
				logs: devLogger.getLogs(level, limit),
				total: devLogger.getLogs().length,
			};
		});

		// Clear logs
		this.app.post("/dev/logs/clear", () => {
			devLogger.clearLogs();
			return { message: "Logs cleared" };
		});

		// Memory information
		this.app.get("/dev/memory", () => {
			const used = process.memoryUsage();
			return {
				heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
				heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
				external: `${Math.round(used.external / 1024 / 1024)}MB`,
				rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
			};
		});

		// Reload trigger
		this.app.post("/dev/reload", () => {
			debug.info("Reload requested");
			this.triggerReload();
			return { message: "Reload executed" };
		});

		// Configuration retrieval
		this.app.get("/dev/config", () => devConfig);

		console.log("[Dev Server] Development API routes registered successfully");
	}

	private setupHotReload(): void {
		if (!devConfig.hotReload) return;

		hotReloadManager.onReload((file: string) => {
			devLogger.info(`Hot reload: ${file}`);
			this.triggerReload();
		});
	}

	private triggerReload(): void {
		for (const callback of this.reloadCallbacks) {
			try {
				callback();
			} catch (error) {
				devLogger.error("Reload callback failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	public onReload(callback: () => void): void {
		this.reloadCallbacks.add(callback);
	}

	public shutdown(): void {
		devLogger.info("Development server shutting down");
		hotReloadManager.stop();
	}
}

export function createDevServer(app: Elysia): DevServer {
	return new DevServer(app);
}
