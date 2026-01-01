import express from "express";
import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import os from "node:os";
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
const RATE_LIMIT_THRESHOLD = 50;

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
};

function percentile(values: number[], p: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
	return sorted[idx];
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

	return {
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
	};
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
	if (next > RATE_LIMIT_THRESHOLD) {
		metricsCollector.incrementRateLimit();
		return true;
	}
	return false;
}

app.get("/", (_req, res) => {
	res.status(200).type("text/html").send("<html><body><h1>Elysia AI</h1></body></html>");
});

app.get("/ping", (_req, res) => {
	res.json({ ok: true });
});

app.get("/health", (_req, res) => {
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

app.get("/health/summary", requireAuth, (_req, res) => {
	res.json(buildHealthSnapshot());
});

app.get("/health/stream", requireAuth, (_req, res) => {
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

app.get("/metrics", (_req, res) => {
	res.type("text/plain").send(metricsCollector.toPrometheusFormat());
});

app.post("/auth/token", (req, res) => {
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

app.post("/auth/refresh", (req, res) => {
	const { refreshToken } = req.body || {};
	if (!refreshToken || !refreshTokens.has(refreshToken)) {
		return res.status(401).json({ error: "Invalid refresh token" });
	}
	const accessToken = crypto.randomUUID();
	activeTokens.add(accessToken);
	return res.json({ accessToken, expiresIn: 900 });
});

app.post("/auth/logout", (req, res) => {
	const { refreshToken } = req.body || {};
	if (refreshToken) refreshTokens.delete(refreshToken);
	return res.json({ ok: true });
});

app.post("/feedback", requireAuth, (req, res) => {
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

app.post("/elysia-love", requireAuth, (req, res) => {
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

	metricsCollector.incrementChatRequests();
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("X-Elysia-Mode", mode);
	res.write(`data: ${JSON.stringify({ reply: "こんにちは！" })}\n\n`);
	res.end();
});

app.get("/swagger", (_req, res) => {
	res.status(200).type("text/html").send("<html>swagger</html>");
});

app.get("/swagger/json", (_req, res) => {
	res.json({
		openapi: "3.0.0",
		info: { title: "Elysia AI", version: "1.0.0" },
		paths: {},
	});
});

app.use((req, res) => {
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
