import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import {
	arch,
	cpus,
	freemem,
	hostname,
	platform,
	release,
	totalmem,
} from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { config } from "../../../../src/config.ts";
import type { HealthStatus, ServiceHealth } from "./health";
import { performHealthCheck } from "./health";

export type LocalOpsServiceCategory =
	| "core"
	| "ai"
	| "voice"
	| "companion"
	| "storage"
	| "desktop";

export type LocalOpsStatus =
	| ServiceHealth["status"]
	| "unknown"
	| "ready"
	| "attention";

export interface LocalOpsLink {
	label: string;
	url: string;
}

export interface LocalOpsService {
	id: string;
	name: string;
	role: string;
	category: LocalOpsServiceCategory;
	enabled: boolean;
	status: LocalOpsStatus;
	url?: string;
	responseTime?: number;
	detail?: string;
	lastCheck?: string;
	links: LocalOpsLink[];
	startCommand?: string;
}

export interface LocalOpsCommand {
	label: string;
	command: string;
	cwd: string;
	when: string;
}

export interface LocalOpsHostInventory {
	hostname: string;
	platform: string;
	arch: string;
	cpu: string;
	cpuCores: number;
	memory: {
		totalMb: number;
		freeMb: number;
		usedPercent: number;
	};
	runtime: {
		bun: string;
		node: string;
		pid: number;
		uptimeSeconds: number;
	};
	repo: {
		cwd: string;
	};
}

export interface LocalOpsLogSummary {
	id: string;
	label: string;
	path: string;
	status: "quiet" | "attention" | "missing";
	lines: string[];
	updatedAt?: string;
}

export interface LocalOpsDiagnostic {
	id: string;
	label: string;
	status: "ready" | "attention" | "missing";
	detail: string;
	nextAction: string;
	command?: string;
	items?: string[];
}

export interface LocalOpsImprovementSuggestion {
	id: string;
	title: string;
	priority: "P0" | "P1" | "P2" | "P3";
	impact: "high" | "medium" | "low";
	effort: "small" | "medium" | "large";
	reason: string;
	nextAction: string;
	command?: string;
	safety: "manual-only";
}

export interface LocalOpsOverview {
	codename: "StarkHouseLocalOps";
	generatedAt: string;
	mode: "manual-supervised";
	readiness: {
		status: "ready" | "partial" | "attention";
		score: number;
		summary: string;
	};
	endpoints: {
		commandCenter: string;
		health: string;
		metrics: string;
		api: string;
	};
	services: LocalOpsService[];
	commands: LocalOpsCommand[];
	host: LocalOpsHostInventory;
	logs: LocalOpsLogSummary[];
	diagnostics: LocalOpsDiagnostic[];
	improvements: LocalOpsImprovementSuggestion[];
	briefing: string[];
	safety: {
		manualStartOnly: true;
		noDeviceAutomation: true;
		localFirst: true;
	};
}

type BuildLocalOpsOptions = {
	health: HealthStatus;
	core?: ServiceHealth;
	voicevox?: ServiceHealth;
	ollamaModels?: LocalOpsDiagnostic;
	generatedAt?: string;
	cwd?: string;
};

type CollectLocalOpsOptions = {
	assumeCoreUp?: boolean;
};

function trimTrailingSlash(value: string) {
	return value.replace(/\/+$/, "");
}

export function normalizeLocalOpsUrl(value: string, fallback: string) {
	try {
		return trimTrailingSlash(new URL(value || fallback).toString());
	} catch {
		return fallback;
	}
}

function localCoreBaseUrl() {
	const port = Number(config.port) || 3000;
	return `http://127.0.0.1:${port}`;
}

function resolveRepoCwd(cwd = process.cwd()) {
	if (basename(cwd).toLowerCase() === "server") {
		const parent = dirname(cwd);
		if (basename(parent).toLowerCase() === "packages") {
			return resolve(cwd, "..", "..");
		}
	}

	return cwd;
}

function mb(bytes: number) {
	return Math.round(bytes / 1024 / 1024);
}

function buildHostInventory(cwd: string): LocalOpsHostInventory {
	const cpu = cpus()[0]?.model ?? "unknown";
	const totalMemory = totalmem();
	const freeMemory = freemem();
	return {
		hostname: hostname(),
		platform: `${platform()} ${release()}`,
		arch: arch(),
		cpu,
		cpuCores: cpus().length,
		memory: {
			totalMb: mb(totalMemory),
			freeMb: mb(freeMemory),
			usedPercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
		},
		runtime: {
			bun:
				(globalThis as { Bun?: { version?: string } }).Bun?.version ??
				"unknown",
			node: process.version,
			pid: process.pid,
			uptimeSeconds: Math.round(process.uptime()),
		},
		repo: {
			cwd,
		},
	};
}

function hasGeneratedPrismaClient(cwd: string) {
	const directCandidates = [
		join(cwd, "node_modules", ".prisma", "client", "default.js"),
		join(cwd, "node_modules", ".prisma", "client", "index.js"),
	];
	if (directCandidates.some((candidate) => existsSync(candidate))) {
		return true;
	}

	const bunModulesDir = join(cwd, "node_modules", ".bun");
	if (!existsSync(bunModulesDir)) return false;

	return readdirSync(bunModulesDir)
		.filter((entry) => entry.startsWith("@prisma+client@"))
		.some((entry) =>
			existsSync(
				join(
					bunModulesDir,
					entry,
					"node_modules",
					".prisma",
					"client",
					"default.js",
				),
			),
		);
}

function buildPrismaDiagnostic(cwd: string): LocalOpsDiagnostic {
	const schemaPath = join(cwd, "prisma", "schema.prisma");
	const dbPath = join(cwd, "prisma", "dev.db");
	const migrationPath = join(cwd, "prisma", "migrations");
	const generatedClient = hasGeneratedPrismaClient(cwd);
	const schemaExists = existsSync(schemaPath);
	const dbExists = existsSync(dbPath);
	const migrationsExist = existsSync(migrationPath);
	const missing = [
		!schemaExists ? "schema.prisma" : "",
		!generatedClient ? "generated Prisma client" : "",
		!dbExists ? "dev.db" : "",
		!migrationsExist ? "migrations" : "",
	].filter(Boolean);

	return {
		id: "prisma",
		label: "Prisma Local Database",
		status: missing.length === 0 ? "ready" : "attention",
		detail:
			missing.length === 0
				? "Schema, generated client, local database, and migrations are present"
				: `Needs attention: ${missing.join(", ")}`,
		nextAction:
			missing.length === 0
				? "No repair needed"
				: "Regenerate the client, then restart the local stack",
		command: "bun scripts/manage.ts setup-db",
		items: [
			`schema: ${schemaExists ? "present" : "missing"}`,
			`client: ${generatedClient ? "generated" : "missing"}`,
			`database: ${dbExists ? "present" : "missing"}`,
			`migrations: ${migrationsExist ? "present" : "missing"}`,
		],
	};
}

async function checkOllamaModelDiagnostic(
	baseUrl = config.ollamaBaseUrl,
	timeoutMs = 750,
): Promise<LocalOpsDiagnostic> {
	const url = normalizeLocalOpsUrl(baseUrl, "http://127.0.0.1:11434");
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(`${url}/api/tags`, {
			headers: { accept: "application/json" },
			signal: controller.signal,
		});

		if (!response.ok) {
			return {
				id: "ollama-models",
				label: "Ollama Models",
				status: "attention",
				detail: `Ollama responded with HTTP ${response.status}`,
				nextAction: "Check Ollama server logs",
				command: "ollama serve",
			};
		}

		const data = (await response.json()) as {
			models?: Array<{ name?: string; model?: string }>;
		};
		const models = (data.models ?? [])
			.map((model) => model.name ?? model.model ?? "")
			.filter(Boolean)
			.slice(0, 8);

		return {
			id: "ollama-models",
			label: "Ollama Models",
			status: models.length > 0 ? "ready" : "attention",
			detail:
				models.length > 0
					? `${models.length} local model(s) visible`
					: "Ollama is running but no local models were reported",
			nextAction:
				models.length > 0
					? "Pick a configured local model"
					: `Pull the configured model: ${config.ollamaModel}`,
			command:
				models.length > 0
					? `set OLLAMA_MODEL=${models[0]}`
					: `ollama pull ${config.ollamaModel}`,
			items: models,
		};
	} catch (error) {
		const message =
			error instanceof DOMException && error.name === "AbortError"
				? `Timed out after ${timeoutMs}ms`
				: error instanceof Error
					? error.message
					: "Connection failed";
		return {
			id: "ollama-models",
			label: "Ollama Models",
			status: "missing",
			detail: message,
			nextAction: "Start Ollama manually, then refresh Local Ops",
			command: "ollama serve",
		};
	} finally {
		clearTimeout(timeout);
	}
}

function redactLogLine(line: string) {
	const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
	const redacted = line
		.replace(ansiPattern, "")
		.replace(
			/([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*=)[^\s]+/gi,
			"$1[redacted]",
		)
		.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
		.replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[^"',\s]+/gi, "$1[redacted]");

	return redacted.length > 260 ? `${redacted.slice(0, 257)}...` : redacted;
}

function readLogSummary(
	cwd: string,
	id: string,
	label: string,
	relativePath: string,
): LocalOpsLogSummary {
	const path = join(cwd, relativePath);
	if (!existsSync(path)) {
		return {
			id,
			label,
			path: relativePath,
			status: "missing",
			lines: ["No local log file yet"],
		};
	}

	const stats = statSync(path);
	const text = readFileSync(path, "utf8");
	const lines = text
		.split(/\r?\n/)
		.filter(Boolean)
		.slice(-8)
		.map(redactLogLine);
	const hasAttention = lines.some((line) =>
		/error|failed|warn|down/i.test(line),
	);

	return {
		id,
		label,
		path: relativePath,
		status: hasAttention ? "attention" : "quiet",
		lines: lines.length > 0 ? lines : ["Log is empty"],
		updatedAt: stats.mtime.toISOString(),
	};
}

function collectLogSummaries(cwd: string): LocalOpsLogSummary[] {
	const logs = [
		readLogSummary(
			cwd,
			"lite-out",
			"Lite Stack Output",
			".tmp/elysia-stack-lite.out.log",
		),
		readLogSummary(
			cwd,
			"lite-err",
			"Lite Stack Kernel",
			".tmp/elysia-stack-lite.err.log",
		),
	];

	const logDir = join(cwd, "logs");
	if (existsSync(logDir)) {
		const latestLog = readdirSync(logDir)
			.map((entry) => join("logs", entry))
			.filter((entry) => {
				const fullPath = join(cwd, entry);
				return existsSync(fullPath) && statSync(fullPath).isFile();
			})
			.sort(
				(a, b) =>
					statSync(join(cwd, b)).mtimeMs - statSync(join(cwd, a)).mtimeMs,
			)
			.at(0);

		if (latestLog) {
			logs.push(
				readLogSummary(cwd, "runtime", "Latest Runtime Log", latestLog),
			);
		}
	}

	return logs;
}

function buildBriefing(
	readiness: LocalOpsOverview["readiness"],
	services: LocalOpsService[],
	host: LocalOpsHostInventory,
	logs: LocalOpsLogSummary[],
	diagnostics: LocalOpsDiagnostic[],
	improvements: LocalOpsImprovementSuggestion[],
) {
	const briefing = [
		readiness.summary,
		`Memory load ${host.memory.usedPercent}% across ${host.cpuCores} CPU threads`,
	];

	const downServices = services
		.filter((service) => service.enabled && service.status === "down")
		.map((service) => service.name);
	if (downServices.length > 0) {
		briefing.push(`Manual startup pending: ${downServices.join(", ")}`);
	}

	const noisyLogs = logs.filter((log) => log.status === "attention");
	if (noisyLogs.length > 0) {
		briefing.push(
			`Review logs: ${noisyLogs.map((log) => log.label).join(", ")}`,
		);
	} else {
		briefing.push("Recent local logs are quiet");
	}

	const pendingDiagnostics = diagnostics.filter(
		(diagnostic) => diagnostic.status !== "ready",
	);
	if (pendingDiagnostics.length > 0) {
		briefing.push(
			`Diagnostics pending: ${pendingDiagnostics
				.map((diagnostic) => diagnostic.label)
				.join(", ")}`,
		);
	}

	if (improvements.length > 0) {
		briefing.push(`Next improvement: ${improvements[0].title}`);
	}

	briefing.push("No device, game, or hidden background automation is armed");
	return briefing;
}

function buildImprovementSuggestions(
	services: LocalOpsService[],
	diagnostics: LocalOpsDiagnostic[],
	logs: LocalOpsLogSummary[],
	host: LocalOpsHostInventory,
): LocalOpsImprovementSuggestion[] {
	const suggestions: LocalOpsImprovementSuggestion[] = [];
	const serviceById = new Map(services.map((service) => [service.id, service]));
	const diagnosticById = new Map(
		diagnostics.map((diagnostic) => [diagnostic.id, diagnostic]),
	);
	const prisma = diagnosticById.get("prisma");
	const ollama = serviceById.get("ollama");
	const ollamaModels = diagnosticById.get("ollama-models");
	const voicevox = serviceById.get("voicevox");
	const fastapi = serviceById.get("fastapi-kernel");

	if (prisma && prisma.status !== "ready") {
		suggestions.push({
			id: "repair-prisma-client",
			title: "Regenerate Prisma client before the next server restart",
			priority: "P0",
			impact: "high",
			effort: "small",
			reason: prisma.detail,
			nextAction: prisma.nextAction,
			command: prisma.command,
			safety: "manual-only",
		});
	}

	if (ollama?.status === "down" || ollamaModels?.status === "missing") {
		suggestions.push({
			id: "start-ollama",
			title: "Bring Ollama online for local model responses",
			priority: "P1",
			impact: "high",
			effort: "small",
			reason: ollama?.detail ?? ollamaModels?.detail ?? "Ollama is offline",
			nextAction: "Start Ollama, then refresh Local Ops",
			command: "ollama serve",
			safety: "manual-only",
		});
	} else if (ollamaModels?.status === "attention") {
		suggestions.push({
			id: "pull-ollama-model",
			title: "Install the configured Ollama model",
			priority: "P1",
			impact: "high",
			effort: "medium",
			reason: ollamaModels.detail,
			nextAction: ollamaModels.nextAction,
			command: ollamaModels.command,
			safety: "manual-only",
		});
	}

	if (fastapi && fastapi.status === "degraded") {
		suggestions.push({
			id: "inspect-fastapi-latency",
			title: "Inspect FastAPI latency in lite mode",
			priority: "P2",
			impact: "medium",
			effort: "small",
			reason: `FastAPI responded in ${Math.round(fastapi.responseTime ?? 0)}ms`,
			nextAction:
				"Check whether heavy imports or cold starts are still occurring",
			command: "bun scripts/manage.ts dev:lite",
			safety: "manual-only",
		});
	}

	if (voicevox?.status === "down") {
		suggestions.push({
			id: "optional-voicevox",
			title: "Start VOICEVOX only when voice output is needed",
			priority: "P3",
			impact: "low",
			effort: "small",
			reason: voicevox.detail ?? "VOICEVOX is offline",
			nextAction:
				"Keep it off for lighter server operation, or start it manually for speech",
			command: voicevox.startCommand,
			safety: "manual-only",
		});
	}

	const noisyLogs = logs.filter((log) => log.status === "attention");
	if (noisyLogs.length > 0) {
		suggestions.push({
			id: "classify-runtime-logs",
			title: "Classify noisy runtime logs into test, config, and real errors",
			priority: "P2",
			impact: "medium",
			effort: "medium",
			reason: `Attention logs found: ${noisyLogs.map((log) => log.label).join(", ")}`,
			nextAction:
				"Add log categories so old test failures stop polluting operator briefings",
			command: "bun run ops",
			safety: "manual-only",
		});
	}

	if (host.memory.usedPercent >= 75) {
		suggestions.push({
			id: "reduce-memory-pressure",
			title: "Reduce local memory pressure before enabling full RAG",
			priority: "P1",
			impact: "medium",
			effort: "small",
			reason: `Host memory load is ${host.memory.usedPercent}%`,
			nextAction:
				"Stay on dev:lite or close optional companions before full stack startup",
			command: "bun scripts/manage.ts dev:lite",
			safety: "manual-only",
		});
	}

	if (suggestions.length === 0) {
		suggestions.push({
			id: "add-model-inventory",
			title: "Add disk, GPU, model, backup, and VPN inventory cards",
			priority: "P2",
			impact: "medium",
			effort: "medium",
			reason:
				"Core diagnostics are healthy; the next value is deeper home-server readiness visibility",
			nextAction:
				"Extend Native Lite and Local Ops with storage, model, backup, and secure-access inventory",
			command: "bun run native:lite",
			safety: "manual-only",
		});
	}

	const priorityRank = { P0: 0, P1: 1, P2: 2, P3: 3 };
	const impactRank = { high: 0, medium: 1, low: 2 };
	return suggestions
		.sort(
			(a, b) =>
				priorityRank[a.priority] - priorityRank[b.priority] ||
				impactRank[a.impact] - impactRank[b.impact],
		)
		.slice(0, 5);
}

function serviceFromHealth(
	id: string,
	name: string,
	role: string,
	category: LocalOpsServiceCategory,
	service: ServiceHealth,
	options: {
		enabled?: boolean;
		url?: string;
		links?: LocalOpsLink[];
		startCommand?: string;
	} = {},
): LocalOpsService {
	return {
		id,
		name,
		role,
		category,
		enabled: options.enabled ?? service.status !== "disabled",
		status: service.status,
		url: options.url,
		responseTime: service.responseTime,
		detail: service.error,
		lastCheck: service.lastCheck,
		links: options.links ?? [],
		startCommand: options.startCommand,
	};
}

function unknownServiceHealth(detail: string): ServiceHealth {
	return {
		status: "degraded",
		error: detail,
		lastCheck: new Date().toISOString(),
	};
}

function upServiceHealth(responseTime?: number): ServiceHealth {
	return {
		status: "up",
		responseTime,
		lastCheck: new Date().toISOString(),
	};
}

export async function checkElysiaCoreService(
	baseUrl = localCoreBaseUrl(),
	timeoutMs = 750,
): Promise<ServiceHealth> {
	const startedAt = Date.now();
	const url = normalizeLocalOpsUrl(baseUrl, localCoreBaseUrl());
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(`${url}/ping`, {
			headers: { accept: "application/json" },
			signal: controller.signal,
		});
		const responseTime = Date.now() - startedAt;

		return {
			status: response.ok ? "up" : "degraded",
			responseTime,
			error: response.ok ? undefined : `HTTP ${response.status}`,
			lastCheck: new Date().toISOString(),
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Connection failed";
		return {
			status: "down",
			responseTime: Date.now() - startedAt,
			error:
				error instanceof DOMException && error.name === "AbortError"
					? `Timed out after ${timeoutMs}ms`
					: message,
			lastCheck: new Date().toISOString(),
		};
	} finally {
		clearTimeout(timeout);
	}
}

export async function checkVoicevoxService(
	baseUrl = config.voicevoxBaseUrl,
	timeoutMs = 750,
): Promise<ServiceHealth> {
	const startedAt = Date.now();
	const url = normalizeLocalOpsUrl(baseUrl, "http://127.0.0.1:50021");
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(`${url}/version`, {
			headers: { accept: "application/json" },
			signal: controller.signal,
		});
		const responseTime = Date.now() - startedAt;

		return {
			status: response.ok ? "up" : "degraded",
			responseTime,
			error: response.ok ? undefined : `HTTP ${response.status}`,
			lastCheck: new Date().toISOString(),
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Connection failed";
		return {
			status: "down",
			responseTime: Date.now() - startedAt,
			error:
				error instanceof DOMException && error.name === "AbortError"
					? `Timed out after ${timeoutMs}ms`
					: message,
			lastCheck: new Date().toISOString(),
		};
	} finally {
		clearTimeout(timeout);
	}
}

export function summarizeOpsReadiness(
	services: Pick<LocalOpsService, "id" | "enabled" | "status">[],
): LocalOpsOverview["readiness"] {
	const requiredIds = new Set(["elysia-core", "fastapi-kernel", "ollama"]);
	const required = services.filter((service) => requiredIds.has(service.id));
	const optional = services.filter((service) => !requiredIds.has(service.id));
	const isOperational = (
		service: Pick<LocalOpsService, "enabled" | "status"> | undefined,
	) =>
		service !== undefined &&
		["up", "degraded", "ready"].includes(service.status);

	const requiredUp = required.filter(isOperational).length;
	const optionalUp = optional.filter(
		(service) =>
			!service.enabled ||
			["up", "degraded", "ready", "disabled"].includes(service.status),
	).length;
	const total = required.length + optional.length;
	const score =
		total === 0 ? 0 : Math.round(((requiredUp + optionalUp) / total) * 100);

	if (requiredUp === required.length) {
		return {
			status: optionalUp === optional.length ? "ready" : "partial",
			score,
			summary:
				optionalUp === optional.length
					? "House systems nominal"
					: "Core online, companions need attention",
		};
	}

	const coreOnline = isOperational(
		services.find((service) => service.id === "elysia-core"),
	);
	const fastApiOnline = isOperational(
		services.find((service) => service.id === "fastapi-kernel"),
	);
	const ollamaOnline = isOperational(
		services.find((service) => service.id === "ollama"),
	);

	if (coreOnline && fastApiOnline && !ollamaOnline) {
		return {
			status: "partial",
			score,
			summary: "Core online, Ollama needs manual startup",
		};
	}

	return {
		status: requiredUp > 0 ? "partial" : "attention",
		score,
		summary: "Core stack needs manual startup",
	};
}

export function buildLocalOpsOverview(
	options: BuildLocalOpsOptions,
): LocalOpsOverview {
	const generatedAt = options.generatedAt ?? new Date().toISOString();
	const cwd = options.cwd ?? resolveRepoCwd();
	const coreBaseUrl = localCoreBaseUrl();
	const fastApiUrl = normalizeLocalOpsUrl(
		config.fastApiBaseUrl,
		"http://127.0.0.1:8000",
	);
	const ollamaUrl = normalizeLocalOpsUrl(
		config.ollamaBaseUrl,
		"http://127.0.0.1:11434",
	);
	const voicevoxUrl = normalizeLocalOpsUrl(
		config.voicevoxBaseUrl,
		"http://127.0.0.1:50021",
	);
	const vtuberUrl = normalizeLocalOpsUrl(
		config.openLlmVtuberBaseUrl,
		"http://127.0.0.1:12393",
	);

	const voicevox =
		options.voicevox ??
		unknownServiceHealth("VOICEVOX status is checked on demand");
	const core = options.core ?? upServiceHealth();

	const services: LocalOpsService[] = [
		serviceFromHealth(
			"elysia-core",
			"Elysia Core",
			"House command bus",
			"core",
			core,
			{
				url: coreBaseUrl,
				links: [
					{ label: "Desktop", url: "/" },
					{ label: "Health", url: "/health-ui.html" },
				],
				startCommand: "bun scripts/manage.ts dev:lite",
			},
		),
		serviceFromHealth(
			"fastapi-kernel",
			"FastAPI Kernel",
			"AI cognition layer",
			"ai",
			options.health.services.fastapi,
			{
				url: fastApiUrl,
				links: [{ label: "Health", url: `${fastApiUrl}/health` }],
				startCommand: "bun scripts/manage.ts dev:lite",
			},
		),
		serviceFromHealth(
			"ollama",
			"Ollama",
			"Local model engine",
			"ai",
			options.health.services.ollama,
			{
				url: ollamaUrl,
				links: [{ label: "Version", url: `${ollamaUrl}/api/version` }],
				startCommand: "ollama serve",
			},
		),
		serviceFromHealth(
			"voicevox",
			"VOICEVOX",
			"Local voice synthesis",
			"voice",
			voicevox,
			{
				url: voicevoxUrl,
				links: [{ label: "Version", url: `${voicevoxUrl}/version` }],
				startCommand: "Start VOICEVOX Engine manually",
			},
		),
		serviceFromHealth(
			"open-llm-vtuber",
			"Open-LLM-VTuber",
			"Avatar companion bridge",
			"companion",
			options.health.companions.openLlmVtuber,
			{
				enabled: config.openLlmVtuberEnabled,
				url: vtuberUrl,
				links: [{ label: "Frontend", url: vtuberUrl }],
				startCommand: "Start Open-LLM-VTuber manually",
			},
		),
		serviceFromHealth(
			"redis",
			"Redis",
			"Optional cache and queue layer",
			"storage",
			options.health.services.redis,
			{
				enabled: config.redisEnabled,
				url: config.redisEnabled ? config.redisUrl : undefined,
				links: [],
				startCommand: "redis-server",
			},
		),
		{
			id: "tauri-desktop",
			name: "Tauri Desktop",
			role: "Local shell cockpit",
			category: "desktop",
			enabled: true,
			status: "unknown",
			detail: "Launch manually when desktop shell is needed",
			lastCheck: generatedAt,
			links: [{ label: "Web", url: "/" }],
			startCommand: "bun run desktop",
		},
	];
	const readiness = summarizeOpsReadiness(services);
	const host = buildHostInventory(cwd);
	const logs = collectLogSummaries(cwd);
	const diagnostics = [
		buildPrismaDiagnostic(cwd),
		options.ollamaModels ??
			({
				id: "ollama-models",
				label: "Ollama Models",
				status: "missing",
				detail: "Ollama model diagnostics were not collected",
				nextAction: "Refresh Local Ops",
				command: "bun run ops",
			} satisfies LocalOpsDiagnostic),
	];
	const improvements = buildImprovementSuggestions(
		services,
		diagnostics,
		logs,
		host,
	);

	return {
		codename: "StarkHouseLocalOps",
		generatedAt,
		mode: "manual-supervised",
		readiness,
		endpoints: {
			commandCenter: "/stark-ops.html",
			health: "/health",
			metrics: "/metrics",
			api: "/api/local-ops",
		},
		services,
		host,
		logs,
		diagnostics,
		improvements,
		briefing: buildBriefing(
			readiness,
			services,
			host,
			logs,
			diagnostics,
			improvements,
		),
		commands: [
			{
				label: "Setup",
				command: "bun scripts/manage.ts setup",
				cwd,
				when: "First run or dependency refresh",
			},
			{
				label: "Python Kernel",
				command: "bun scripts/manage.ts setup-python",
				cwd,
				when: "First run or Python dependency refresh",
			},
			{
				label: "Database Repair",
				command: "bun scripts/manage.ts setup-db",
				cwd,
				when: "Regenerate Prisma client after install or schema changes",
			},
			{
				label: "Local Stack",
				command: "bun scripts/manage.ts dev:lite",
				cwd,
				when: "Start the fast house server",
			},
			{
				label: "Full Stack",
				command: "bun scripts/manage.ts dev",
				cwd,
				when: "Start full RAG memory services",
			},
			{
				label: "Desktop",
				command: "bun run desktop",
				cwd,
				when: "Open the cockpit shell",
			},
			{
				label: "Ops Snapshot",
				command: "bun run ops",
				cwd,
				when: "Check local readiness from terminal",
			},
			{
				label: "Native Lite",
				command: "bun run native:lite",
				cwd,
				when: "Inspect Rust, Swift, and fallback weight budget",
			},
			{
				label: "Suit Status",
				command: "bun run suit -- status",
				cwd,
				when: "Check fictional HUD state",
			},
		],
		safety: {
			manualStartOnly: true,
			noDeviceAutomation: true,
			localFirst: true,
		},
	};
}

export async function collectLocalOpsOverview(
	options: CollectLocalOpsOptions = {},
) {
	const corePromise = options.assumeCoreUp
		? Promise.resolve(upServiceHealth())
		: checkElysiaCoreService();
	const [health, core, voicevox] = await Promise.all([
		performHealthCheck(),
		corePromise,
		checkVoicevoxService(),
	]);
	const ollamaModels = await checkOllamaModelDiagnostic();

	return buildLocalOpsOverview({ health, core, voicevox, ollamaModels });
}
