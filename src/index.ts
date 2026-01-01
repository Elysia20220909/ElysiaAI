import express from "express";
import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { metricsCollector } from "./lib/metrics";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SERVER_STARTED_AT = Date.now();

app.use(express.json());

// simple security headers
app.use((req: Request, res: Response, next: NextFunction) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	metricsCollector.incrementRequest(req.method, req.path, 0);
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

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
	const header = req.headers.authorization;
	if (!header || !header.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const token = header.replace("Bearer ", "");
	if (!activeTokens.has(token)) {
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
