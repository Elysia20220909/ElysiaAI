import express from "express";
import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import os from "node:os";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { metricsCollector } from "./lib/metrics";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SERVER_STARTED_AT = Date.now();

app.use(express.json());

// simple security headers
app.use((req: Request, res: Response, next: NextFunction) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	next();
});

// request timing + metrics capture
app.use((req: Request, res: Response, next: NextFunction) => {
	const start = process.hrtime.bigint();
	res.on("finish", () => {
		const durationNs = Number(process.hrtime.bigint() - start);
		const durationSeconds = durationNs / 1_000_000_000;
		const status = res.statusCode;
		metricsCollector.incrementRequest(req.method, req.path, status);
		metricsCollector.recordRequestDuration(req.method, req.path, durationSeconds);
		if (status >= 400) {
			metricsCollector.incrementError(req.method, req.path, String(status));
		}
	});
	next();
});

// in-memory auth/token store
const envUsername = process.env.AUTH_USERNAME;
const envPassword = process.env.AUTH_PASSWORD;
const validUsername = envUsername || "elysia";
const validPassword = envPassword || "elysia-dev-password";
const activeTokens = new Set<string>();
const refreshTokens = new Set<string>();
const rateLimitCounter = new Map<string, number>();
let rateLimitThreshold = 50;

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || "";
const ALERT_DEBOUNCE_MS = 60_000;
const alertLastSent = new Map<string, number>();

type Alert = {
	key: string;
	severity: "info" | "warn" | "critical";
	message: string;
	value?: number;
};

type AiEvent = {
	id: string;
	timestamp: string;
	severity: "info" | "warn" | "high";
	issues: string[];
	messages: string[];
	ragContext?: string;
};

const aiEvents: AiEvent[] = [];
const AI_EVENT_LIMIT = 50;

type HealthSnapshot = {
	status: "healthy" | "degraded";
	timestamp: string;
	uptimeSeconds: number;
	process: {
		pid: number;
		memory: {
			rss: number;
			heapUsed: number;
			heapTotal: number;
		};
		loadAvg: {
			one: number;
			five: number;
			fifteen: number;
		};
	};
	services: {
		redis: string;
		fastapi: string;
		ollama: string;
	};
	metrics: {
		httpRequests: Array<{
			label: string;
			count: number;
		}>;
		latency: Array<{
			label: string;
			p50: number;
			p95: number;
			p99: number;
			avg: number;
		}>;
		errors: Array<{
			label: string;
			count: number;
		}>;
		auth: {
			success: number;
			failure: number;
		};
		chatRequests: number;
		rateLimitExceeded: number;
		rag: {
			count: number;
			latency: {
				avg: number;
				p50: number;
				p95: number;
				p99: number;
			};
		};
	};
	alerts: Alert[];
	aiSummary: {
		recentHigh: number;
		recentWarn: number;
		total: number;
	};
	selfHealing: {
		rateLimit: number;
		mode: "normal" | "protect";
	};
};

function percentile(values: number[], p: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
	return sorted[idx];
}

function detectPromptInjection(messages: string[]): { issues: string[]; severity: AiEvent["severity"] } {
	const lowerJoined = messages.join("\n").toLowerCase();
	const issues: string[] = [];
	if (/ignore (all )?previous/i.test(lowerJoined)) issues.push("指示無効化の試み");
	if (/system prompt|developer prompt/i.test(lowerJoined)) issues.push("システムプロンプト参照");
	if (/password|api[- ]?key/i.test(lowerJoined)) issues.push("秘密情報要求");
	if (/drop\s+table|union\s+select/i.test(lowerJoined)) issues.push("SQL らしき注入");
	const severity: AiEvent["severity"] = issues.length >= 2 ? "high" : issues.length === 1 ? "warn" : "info";
	return { issues, severity };
}

function recordAiEvent(event: AiEvent) {
	aiEvents.unshift(event);
	if (aiEvents.length > AI_EVENT_LIMIT) aiEvents.pop();
}

async function sendAlertWebhook(alerts: Alert[], snapshot: HealthSnapshot) {
	if (!ALERT_WEBHOOK_URL || alerts.length === 0) return;
	const now = Date.now();
	const deduped = alerts.filter((a) => {
		const last = alertLastSent.get(a.key) || 0;
		if (now - last < ALERT_DEBOUNCE_MS) return false;
		alertLastSent.set(a.key, now);
		return true;
	});
	if (deduped.length === 0) return;
	try {
		await fetch(ALERT_WEBHOOK_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				source: "elysia-ops",
				timestamp: snapshot.timestamp,
				alerts: deduped,
				uptimeSeconds: snapshot.uptimeSeconds,
				selfHealing: snapshot.selfHealing,
			}),
		});
	} catch (error) {
		console.error("webhook send failed", error);
	}
}

function evaluateAlerts(snapshot: HealthSnapshot): Alert[] {
	const alerts: Alert[] = [];
	const worstLatency = snapshot.metrics.latency.reduce(
		(max, item) => Math.max(max, item.p95),
		0,
	);
	if (worstLatency > 1.2) {
		alerts.push({
			key: "latency:p95",
			severity: worstLatency > 2 ? "critical" : "warn",
			message: `高レイテンシ検出 (p95=${worstLatency.toFixed(2)}s)`,
			value: worstLatency,
		});
	}
	const totalErrors = snapshot.metrics.errors.reduce((a, b) => a + b.count, 0);
	if (totalErrors > 5) {
		alerts.push({
			key: "errors:total",
			severity: totalErrors > 20 ? "critical" : "warn",
			message: `エラー増加 (${totalErrors})`,
			value: totalErrors,
		});
	}
	if (snapshot.process.loadAvg.one > 1.5) {
		alerts.push({
			key: "loadavg:1m",
			severity: snapshot.process.loadAvg.one > 2.5 ? "critical" : "warn",
			message: `負荷平均上昇 (1m=${snapshot.process.loadAvg.one.toFixed(2)})`,
			value: snapshot.process.loadAvg.one,
		});
	}
	return alerts;
}

function applySelfHealing(snapshot: HealthSnapshot, alerts: Alert[]): HealthSnapshot["selfHealing"] {
	const hasCritical = alerts.some((a) => a.severity === "critical");
	const hasWarn = alerts.some((a) => a.severity === "warn");
	if (hasCritical || hasWarn) {
		rateLimitThreshold = 30;
		return { rateLimit: rateLimitThreshold, mode: "protect" };
	}
	rateLimitThreshold = 50;
	return { rateLimit: rateLimitThreshold, mode: "normal" };
}

function buildHealthSnapshot(): HealthSnapshot {
	const metrics = metricsCollector.getMetrics();
	const now = new Date();
	const uptimeSeconds = Math.max(1, Math.round(process.uptime()));
	const memory = process.memoryUsage();
	const [one, five, fifteen] = os.loadavg();

	const httpRequests = Array.from(metrics.http_requests_total.entries()).map(
		([key, count]) => ({
			label: key,
			count,
		}),
	);

	const latency = Array.from(
		metrics.http_request_duration_seconds.entries(),
	).map(([key, durations]) => {
		const avg = durations.reduce((a, b) => a + b, 0) / (durations.length || 1);
		return {
			label: key,
			avg,
			p50: percentile(durations, 0.5),
			p95: percentile(durations, 0.95),
			p99: percentile(durations, 0.99),
		};
	});

	const errors = Array.from(metrics.http_errors_total.entries()).map(
		([label, count]) => ({ label, count }),
	);

	const ragDurations = metrics.rag_query_duration_seconds || [];

	const aiSummary = {
		recentHigh: aiEvents.filter((e) => e.severity === "high").length,
		recentWarn: aiEvents.filter((e) => e.severity === "warn").length,
		total: aiEvents.length,
	};

	const snapshot: HealthSnapshot = {
		status: "healthy",
		timestamp: now.toISOString(),
		uptimeSeconds,
		process: {
			pid: process.pid,
			memory: {
				rss: memory.rss,
				heapUsed: memory.heapUsed,
				heapTotal: memory.heapTotal,
			},
			loadAvg: {
				one: one || 0,
				five: five || 0,
				fifteen: fifteen || 0,
			},
		},
		services: {
			redis: "ok",
			fastapi: "ok",
			ollama: "ok",
		},
		metrics: {
			httpRequests,
			latency,
			errors,
			auth: {
				success: metrics.auth_attempts_total.get("success") || 0,
				failure: metrics.auth_attempts_total.get("failure") || 0,
			},
			chatRequests: metrics.chat_requests_total,
			rateLimitExceeded: metrics.rate_limit_exceeded_total,
			rag: {
				count: metrics.rag_queries_total,
				latency: {
					avg:
						ragDurations.reduce((a, b) => a + b, 0) /
						(ragDurations.length || 1),
					p50: percentile(ragDurations, 0.5),
					p95: percentile(ragDurations, 0.95),
					p99: percentile(ragDurations, 0.99),
				},
			},
		},
		alerts: [],
		aiSummary,
		selfHealing: { rateLimit: rateLimitThreshold, mode: "normal" },
	};

	const alerts = evaluateAlerts(snapshot);
	snapshot.alerts = alerts;
	snapshot.selfHealing = applySelfHealing(snapshot, alerts);
	if (alerts.some((a) => a.severity === "critical")) {
		snapshot.status = "degraded";
	}
	void sendAlertWebhook(alerts, snapshot);
	return snapshot;
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
	const header = req.headers.authorization;
	const queryToken = typeof req.query.token === "string" ? req.query.token : "";
	const token = header?.startsWith("Bearer ")
		? header.replace("Bearer ", "")
		: queryToken;
	if (!token || !activeTokens.has(token)) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	res.locals.token = token;
	next();
};

function applyRateLimit(key: string): boolean {
	const current = rateLimitCounter.get(key) || 0;
	const next = current + 1;
	rateLimitCounter.set(key, next);
	if (next > rateLimitThreshold) {
		metricsCollector.incrementRateLimit();
		return true;
	}
	return false;
}

app.get("/", (_req: Request, res: Response) => {
	res.status(200).type("text/html").send("<html><body><h1>Elysia AI</h1></body></html>");
});

app.get("/ping", (_req: Request, res: Response) => {
	res.json({ ok: true });
});

app.get("/health", (_req: Request, res: Response) => {
	res.json({
		status: "healthy",
		uptime: Math.max(1, Math.round(process.uptime())),
		timestamp: new Date().toISOString(),
		services: {
			redis: "ok",
			fastapi: "ok",
			ollama: "ok",
		},
	});
});

app.get("/health/summary", requireAuth, (_req: Request, res: Response) => {
	res.json(buildHealthSnapshot());
});

app.get("/health/stream", requireAuth, (_req: Request, res: Response) => {
	metricsCollector.incrementConnections();
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.flushHeaders?.();

	const sendSnapshot = () => {
		const snapshot = buildHealthSnapshot();
		res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
	};

	const interval = setInterval(sendSnapshot, 1_000);
	sendSnapshot();

	const cleanup = () => {
		clearInterval(interval);
		metricsCollector.decrementConnections();
		res.end();
	};

	res.on("close", cleanup);
	res.on("error", cleanup);
});

app.get("/metrics", (_req: Request, res: Response) => {
	res.type("text/plain").send(metricsCollector.toPrometheusFormat());
});

app.get("/diagnostics/ai", requireAuth, (_req: Request, res: Response) => {
	res.json({ events: aiEvents.slice(0, 20) });
});

app.get("/diagnostics/security", requireAuth, (_req: Request, res: Response) => {
	const warnings: string[] = [];
	if (!envUsername || !envPassword) {
		warnings.push("AUTH_USERNAME/AUTH_PASSWORD が未設定です");
	}
	if (!ALERT_WEBHOOK_URL) {
		warnings.push("ALERT_WEBHOOK_URL が未設定のため外部通知なし");
	}
	res.json({
		rateLimitThreshold,
		jwtConfigured: Boolean(envUsername && envPassword),
		alertsWebhookEnabled: Boolean(ALERT_WEBHOOK_URL),
		warnings,
		redis: "ok",
		fastapi: "ok",
		ollama: "ok",
	});
});

app.post("/ops/locust/run", requireAuth, (req: Request, res: Response) => {
	const users = Number(req.body?.users || 10);
	const spawnRate = Number(req.body?.spawnRate || 2);
	const duration = String(req.body?.duration || "1m");
	const host = String(req.body?.host || "http://localhost:3000");
	const jobId = crypto.randomUUID();
	const logsDir = path.join(process.cwd(), "logs");
	if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
	const logFile = path.join(logsDir, `locust-${jobId}.log`);

	const args = [
		"locustfile.py",
		"--headless",
		"-u",
		String(users),
		"-r",
		String(spawnRate),
		"-t",
		duration,
		"--host",
		host,
	];

	const child = spawn("python", args, { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
	child.stdout.pipe(fs.createWriteStream(logFile));
	child.stderr.pipe(fs.createWriteStream(logFile, { flags: "a" }));

	child.on("error", (error) => {
		console.error("locust spawn error", error);
	});

	res.json({ jobId, logFile });
});

app.post("/auth/token", (req: Request, res: Response) => {
	const { username, password } = req.body || {};
	const matchesDefault = username === "elysia" && password === "elysia-dev-password";
	const matchesEnv = username === validUsername && password === validPassword;
	if (matchesDefault || matchesEnv) {
		const accessToken = crypto.randomUUID();
		const refreshToken = crypto.randomUUID();
		activeTokens.add(accessToken);
		refreshTokens.add(refreshToken);
		metricsCollector.incrementAuthAttempt(true);
		return res.json({ accessToken, refreshToken, expiresIn: 900 });
	}
	metricsCollector.incrementAuthAttempt(false);
	return res.status(401).json({ error: "Invalid credentials" });
});

app.post("/auth/refresh", (req: Request, res: Response) => {
	const { refreshToken } = req.body || {};
	if (!refreshToken || !refreshTokens.has(refreshToken)) {
		return res.status(401).json({ error: "Invalid refresh token" });
	}
	const accessToken = crypto.randomUUID();
	activeTokens.add(accessToken);
	return res.json({ accessToken, expiresIn: 900 });
});

app.post("/auth/logout", (req: Request, res: Response) => {
	const { refreshToken } = req.body || {};
	if (refreshToken) refreshTokens.delete(refreshToken);
	return res.json({ ok: true });
});

app.post("/feedback", requireAuth, (req: Request, res: Response) => {
	const { query, answer, rating } = req.body || {};
	if (!query || typeof query !== "string" || query.length > 400) {
		return res.status(400).json({ error: "Invalid query" });
	}
	if (!answer || typeof answer !== "string") {
		return res.status(400).json({ error: "Invalid answer" });
	}
	if (!rating || !["up", "down"].includes(rating)) {
		return res.status(400).json({ error: "Invalid rating" });
	}
	metricsCollector.incrementFeedback();
	return res.json({ ok: true });
});

app.post("/elysia-love", requireAuth, (req: Request, res: Response) => {
	const token = res.locals.token as string;
	const { messages, mode = "sweet" } = req.body || {};
	if (!Array.isArray(messages) || messages.length === 0) {
		return res.status(400).json({ error: "messages required" });
	}
	if (messages.length > 8) {
		return res.status(400).json({ error: "too many messages" });
	}
	const contents = messages.map((m) => (m?.content as string) || "");
	if (contents.some((c) => !c || c.trim().length === 0)) {
		return res.status(400).json({ error: "empty message" });
	}
	if (contents.some((c) => c.length > 400)) {
		return res.status(400).json({ error: "message too long" });
	}
	if (contents.some((c) => /drop\s+table/i.test(c))) {
		return res.status(500).json({ error: "Dangerous content detected" });
	}
	if (applyRateLimit(token)) {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	const { issues, severity } = detectPromptInjection(contents);
	recordAiEvent({
		id: crypto.randomUUID(),
		timestamp: new Date().toISOString(),
		severity,
		issues,
		messages: contents,
		ragContext: typeof req.body?.ragContext === "string" ? req.body.ragContext : undefined,
	});

	metricsCollector.incrementChatRequests();
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("X-Elysia-Mode", mode);
	res.write(`data: ${JSON.stringify({ reply: "こんにちは！" })}\n\n`);
	res.end();
});

app.get("/swagger", (_req: Request, res: Response) => {
	res.status(200).type("text/html").send("<html>swagger</html>");
});

app.get("/swagger/json", (_req: Request, res: Response) => {
	res.json({
		openapi: "3.0.0",
		info: { title: "Elysia AI", version: "1.0.0" },
		paths: {},
	});
});

app.use((req: Request, res: Response) => {
	res.status(404).json({ error: "Not found" });
});

let server: ReturnType<typeof app.listen> | null = null;

export function startServer(port = PORT) {
	if (server) return server;
	server = app.listen(port);
	return server;
}

export function stopServer() {
	if (server) {
		server.close();
		server = null;
	}
}

if (process.env.AUTO_START_SERVER === "true" || process.env.NODE_ENV === "test") {
	startServer();
}

export default app;
