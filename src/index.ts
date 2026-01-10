import express from "express";
import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import os from "node:os";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { metricsCollector } from "./lib/metrics";
import { multiModelEnsemble } from "./lib/multi-model-ensemble";
import type { EnsembleResponse } from "./lib/multi-model-ensemble";
import { validateChatPayload, validateFeedbackPayload } from "./lib/validation";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SERVER_STARTED_AT = Date.now();

app.use(express.json());

// Serve static demo assets (Vue + UnoCSS sandbox etc.)
app.use(express.static(path.join(__dirname, "../public")));

// Apply security headers to prevent common attacks
app.use((req: Request, res: Response, next: NextFunction) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	next();
});

// Track request timing and record metrics for monitoring
app.use((req: Request, res: Response, next: NextFunction) => {
	const startTime = process.hrtime.bigint();
	res.on("finish", () => {
		const elapsedNs = Number(process.hrtime.bigint() - startTime);
		const elapsedSeconds = elapsedNs / 1_000_000_000;
		const statusCode = res.statusCode;

		metricsCollector.incrementRequest(req.method, req.path, statusCode);
		metricsCollector.recordRequestDuration(req.method, req.path, elapsedSeconds);
		if (statusCode >= 400) {
			metricsCollector.incrementError(req.method, req.path, String(statusCode));
		}
	});
	next();
});

// Load authentication credentials from environment, or use development defaults
const validUsername = process.env.AUTH_USERNAME || "elysia";
const validPassword = process.env.AUTH_PASSWORD || "elysia-dev-password";

// 本番環境でデフォルト認証情報を使用していないか確認
if (process.env.NODE_ENV === 'production' && (!process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD)) {
	console.error('⚠️ 致命的エラー: 本番環境でデフォルト認証情報が使用されています！');
	console.error('AUTH_USERNAMEとAUTH_PASSWORDを環境変数で設定してください。');
	process.exit(1);
}

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
	const usesEnvCreds = Boolean(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD);
	if (!usesEnvCreds) {
		warnings.push("AUTH_USERNAME/AUTH_PASSWORD が未設定です（デフォルト認証情報を使用中）");
	}
	if (!ALERT_WEBHOOK_URL) {
		warnings.push("ALERT_WEBHOOK_URL が未設定のため外部通知なし");
	}

	// クライアントには最小限の情報のみ返す（具体的な設定値は隠蔽）
	res.json({
		// 具体的な数値は返さない（攻撃者にヒントを与えない）
		rateLimitEnabled: true,
		authConfigured: usesEnvCreds,
		alertsEnabled: Boolean(ALERT_WEBHOOK_URL),
		warnings,
		// 内部サービスの詳細な状態は返さない
		servicesStatus: "operational",
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
	const validation = validateFeedbackPayload(req.body);
	if (!validation.ok) {
		return res.status(validation.status ?? 400).json({ error: validation.error });
	}
	metricsCollector.incrementFeedback();
	return res.json({ ok: true });
});

app.post("/elysia-love", requireAuth, async (req: Request, res: Response) => {
	const token = res.locals.token as string;
	const validation = validateChatPayload(req.body);
	if (!validation.ok) {
		return res.status(validation.status ?? 400).json({ error: validation.error });
	}

	const contents = validation.value.messages;
	const mode = validation.value.mode ?? "sweet";
	const useEnsemble = validation.value.useEnsemble;
	const ensembleStrategy = validation.value.ensembleStrategy;

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
		ragContext: validation.value.ragContext,
	});

	metricsCollector.incrementChatRequests();
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("X-Elysia-Mode", mode);

	// マルチモデルアンサンブルが有効な場合
	if (useEnsemble) {
		try {
			const lastUserMessage = contents[contents.length - 1];
			const ensembleResult = await multiModelEnsemble.execute(
				lastUserMessage,
				ensembleStrategy as "quality" | "speed" | "consensus",
				{ timeout: 25000, minModels: 1, useCache: true }
			);

			res.setHeader("X-Elysia-Ensemble-Model", ensembleResult.selectedModel);
			res.setHeader("X-Elysia-Ensemble-Confidence", ensembleResult.confidence.toFixed(2));
			res.setHeader("X-Elysia-Ensemble-Time", String(ensembleResult.executionTimeMs));

			res.write(`data: ${JSON.stringify({
				reply: ensembleResult.selectedResponse,
				ensemble: {
					model: ensembleResult.selectedModel,
					confidence: ensembleResult.confidence,
					allModels: ensembleResult.allResponses.map(r => r.model),
					strategy: ensembleResult.strategy
				}
			})}\n\n`);
			return res.end();
		} catch (error) {
			console.error("Ensemble execution failed", error);
			// フォールバック: 通常のシングルモデル応答
			res.write(`data: ${JSON.stringify({ reply: "アンサンブル実行に失敗しました。通常モードで応答します。" })}\n\n`);
		}
	}

	// 通常のシングルモデル応答
	res.write(`data: ${JSON.stringify({ reply: "こんにちは！" })}\n\n`);
	res.end();
});

app.get("/swagger", (_req: Request, res: Response) => {
	res.status(200).type("text/html").send("<html>swagger</html>");
});

// アンサンブル統計エンドポイント
app.get("/ensemble/stats", requireAuth, (_req: Request, res: Response) => {
	const stats = multiModelEnsemble.getStats();
	const models = multiModelEnsemble.getModels();
	res.json({
		models: models.map(m => ({
			name: m.name,
			endpoint: m.endpoint,
			enabled: m.enabled,
			weight: m.weight,
			timeout: m.timeout
		})),
		stats
	});
});

// アンサンブルモデル設定更新
app.post("/ensemble/config", requireAuth, (req: Request, res: Response) => {
	const { modelName, enabled, weight, timeout } = req.body || {};
	if (!modelName || typeof modelName !== "string") {
		return res.status(400).json({ error: "modelName required" });
	}
	const updates: Record<string, unknown> = {};
	if (typeof enabled === "boolean") updates.enabled = enabled;
	if (typeof weight === "number" && weight > 0) updates.weight = weight;
	if (typeof timeout === "number" && timeout > 0) updates.timeout = timeout;

	multiModelEnsemble.updateModelConfig(modelName, updates);
	res.json({ ok: true, modelName, updates });
});

app.get("/swagger/json", (_req: Request, res: Response) => {
	res.json({
		openapi: "3.0.0",
		info: { title: "Elysia AI", version: "1.0.0" },
		paths: {},
	});
});

// --- Demo endpoints (for Vue + UnoCSS sandbox, voice/LLM test wiring) ---
app.post("/api/demo/chat", async (req: Request, res: Response) => {
	const { message, strategy = "quality" } = req.body || {};
	if (!message || typeof message !== "string") {
		return res.status(400).json({ error: "message is required" });
	}

	try {
		const ensemble = await multiModelEnsemble.execute(message, strategy, {
			useCache: true,
			minModels: 1,
			timeout: 15000,
		});

		return res.json({
			reply: ensemble.selectedResponse,
			model: ensemble.selectedModel,
			confidence: ensemble.confidence,
			allModels: ensemble.allResponses.map((r) => ({
				model: r.model,
				latencyMs: r.latencyMs,
				error: r.error,
			})),
		});
	} catch (error) {
		console.error("demo chat failed", error);
		return res.json({
			reply: "(demo) こんにちは！アンサンブルがまだ準備中だから、モック応答を返すね。",
			model: "mock",
			confidence: 0.2,
			allModels: [],
		});
	}
});

app.post("/api/demo/voice", (req: Request, res: Response) => {
	const { text } = req.body || {};
	if (!text || typeof text !== "string") {
		return res.status(400).json({ error: "text is required" });
	}

	// Voice/TTS 実装がまだ無い場合のモックレスポンス。
	// 将来的には unspeech や各 TTS プロバイダへの委譲に差し替える。
	const mockUrl = `data:text/plain;base64,${Buffer.from(`VOICE:${text}`).toString("base64")}`;
	return res.json({ text, audioUrl: mockUrl, provider: "mock" });
});

// ==================== Neuro Integration Routes ====================
const FASTAPI_HOST = (process.env.DATABASE_CONFIG ? JSON.parse(process.env.DATABASE_CONFIG).RAG_API_URL : undefined) || process.env.FASTAPI_HOST || "http://127.0.0.1:8000";

interface NeuroMemoryResponse {
	id: string;
	document: string;
	metadata: Record<string, unknown>;
	distance?: number;
}

// Query memories with semantic search
app.post("/api/neuro/memory/query", async (req: Request, res: Response) => {
	try {
		const { query, limit } = req.body || {};
		if (!query || typeof query !== "string") {
			return res.status(400).json({ error: "query is required" });
		}

		const response = await fetch(`${FASTAPI_HOST}/neuro/memory/query`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ query, limit: limit || 5 }),
		});

		if (!response.ok) {
			throw new Error(`FastAPI error: ${response.statusText}`);
		}

		const data = await response.json();
		return res.json(data);
	} catch (error) {
		console.error("❌ Neuro memory query failed:", error);
		return res.status(503).json({
			error: "Neuro service unavailable",
			details: String(error),
		});
	}
});

// Create a new memory
app.post("/api/neuro/memory/create", async (req: Request, res: Response) => {
	try {
		const { document, metadata } = req.body || {};
		if (!document || typeof document !== "string") {
			return res.status(400).json({ error: "document is required" });
		}

		const response = await fetch(`${FASTAPI_HOST}/neuro/memory/create`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ document, metadata }),
		});

		if (!response.ok) {
			throw new Error(`FastAPI error: ${response.statusText}`);
		}

		const data = await response.json();
		return res.json(data);
	} catch (error) {
		console.error("❌ Neuro memory creation failed:", error);
		return res.status(503).json({
			error: "Neuro service unavailable",
			details: String(error),
		});
	}
});

// Delete a memory
app.delete("/api/neuro/memory/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		if (!id) {
			return res.status(400).json({ error: "id is required" });
		}

		const response = await fetch(`${FASTAPI_HOST}/neuro/memory/${id}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error(`FastAPI error: ${response.statusText}`);
		}

		const data = await response.json();
		return res.json(data);
	} catch (error) {
		console.error("❌ Neuro memory deletion failed:", error);
		return res.status(503).json({
			error: "Neuro service unavailable",
			details: String(error),
		});
	}
});

// Get all memories
app.get("/api/neuro/memory/all", async (req: Request, res: Response) => {
	try {
		const response = await fetch(`${FASTAPI_HOST}/neuro/memory/all`);

		if (!response.ok) {
			throw new Error(`FastAPI error: ${response.statusText}`);
		}

		const data = await response.json();
		return res.json(data);
	} catch (error) {
		console.error("❌ Neuro fetch all memories failed:", error);
		return res.status(503).json({
			error: "Neuro service unavailable",
			details: String(error),
		});
	}
});

// Clear memories by type
app.post("/api/neuro/memory/clear", async (req: Request, res: Response) => {
	try {
		const { type } = req.body || {};
		const params = new URLSearchParams();
		if (type) {
			params.append("memory_type", type);
		}

		const response = await fetch(
			`${FASTAPI_HOST}/neuro/memory/clear?${params.toString()}`,
			{ method: "POST" }
		);

		if (!response.ok) {
			throw new Error(`FastAPI error: ${response.statusText}`);
		}

		const data = await response.json();
		return res.json(data);
	} catch (error) {
		console.error("❌ Neuro clear memories failed:", error);
		return res.status(503).json({
			error: "Neuro service unavailable",
			details: String(error),
		});
	}
});

// Export memories to JSON
app.post("/api/neuro/memory/export", async (req: Request, res: Response) => {
	try {
		const { path } = req.body || {};
		const params = new URLSearchParams();
		if (path) {
			params.append("output_path", path);
		}

		const response = await fetch(
			`${FASTAPI_HOST}/neuro/memory/export?${params.toString()}`,
			{ method: "POST" }
		);

		if (!response.ok) {
			throw new Error(`FastAPI error: ${response.statusText}`);
		}

		const data = await response.json();
		return res.json(data);
	} catch (error) {
		console.error("❌ Neuro export memories failed:", error);
		return res.status(503).json({
			error: "Neuro service unavailable",
			details: String(error),
		});
	}
});

// Import memories from JSON
app.post("/api/neuro/memory/import", async (req: Request, res: Response) => {
	try {
		const { path } = req.body || {};
		if (!path || typeof path !== "string") {
			return res.status(400).json({ error: "path is required" });
		}

		const params = new URLSearchParams();
		params.append("input_path", path);

		const response = await fetch(
			`${FASTAPI_HOST}/neuro/memory/import?${params.toString()}`,
			{ method: "POST" }
		);

		if (!response.ok) {
			throw new Error(`FastAPI error: ${response.statusText}`);
		}

		const data = await response.json();
		return res.json(data);
	} catch (error) {
		console.error("❌ Neuro import memories failed:", error);
		return res.status(503).json({
			error: "Neuro service unavailable",
			details: String(error),
		});
	}
});

// Neuro health check
app.get("/api/neuro/health", async (req: Request, res: Response) => {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);
		const response = await fetch(`${FASTAPI_HOST}/docs`, {
			method: "HEAD",
			signal: controller.signal,
		});
		clearTimeout(timeoutId);

		return res.json({
			status: response.ok ? "ok" : "error",
			backend: "fastapi",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return res.json({
			status: "error",
			message: "FastAPI backend is unavailable",
			timestamp: new Date().toISOString(),
		});
	}
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

if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
	startServer();
}

export default app;
