import { basename, dirname, resolve } from "node:path";
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

	return {
		codename: "StarkHouseLocalOps",
		generatedAt,
		mode: "manual-supervised",
		readiness: summarizeOpsReadiness(services),
		endpoints: {
			commandCenter: "/stark-ops.html",
			health: "/health",
			metrics: "/metrics",
			api: "/api/local-ops",
		},
		services,
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

	return buildLocalOpsOverview({ health, core, voicevox });
}
