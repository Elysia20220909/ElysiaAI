import {
	existsSync,
	readdirSync,
	readFileSync,
	statfsSync,
	statSync,
} from "node:fs";
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

export interface LocalOpsHomeServerGate {
	id:
		| "blueprint"
		| "backup"
		| "storage"
		| "secure-access"
		| "models"
		| "monitoring"
		| "network-plan"
		| "lab-isolation";
	label: string;
	status: "ready" | "attention" | "missing";
	signal: string;
	nextAction: string;
	evidence: string[];
}

export interface LocalOpsHomeServerProbe {
	id:
		| "backup"
		| "storage"
		| "secure-access"
		| "public-ports"
		| "monitoring"
		| "network-plan"
		| "lab-isolation";
	label: string;
	status: "ready" | "attention" | "missing";
	detail: string;
	evidence: string[];
	checkedAt: string;
	command?: string;
}

export interface LocalOpsHomeServerReadiness {
	status: "ready" | "partial" | "attention";
	score: number;
	summary: string;
	gates: LocalOpsHomeServerGate[];
	probes: LocalOpsHomeServerProbe[];
}

export interface LocalOpsFutureStage {
	id:
		| "foundation"
		| "recovery"
		| "secure-mesh"
		| "observability"
		| "local-intelligence"
		| "ambient-home"
		| "multi-user-support"
		| "readme-screenshots"
		| "rag-import-ux"
		| "advanced-ci-cd"
		| "abyss-rtos"
		| "shield-agent"
		| "sovereign-mesh"
		| "tauri-distribution";
	title: string;
	status: "ready" | "next" | "locked";
	horizon: "now" | "next" | "later";
	track: "core" | "planned" | "experimental" | "frontier";
	readinessGain: number;
	dependencies: string[];
	nextAction: string;
	safety: "manual-only";
}

export interface LocalOpsFuturePlan {
	codename: "ElysiaFuturePath";
	summary: string;
	nextStageId: LocalOpsFutureStage["id"];
	stages: LocalOpsFutureStage[];
}

export interface LocalOpsClientSurface {
	id: "windows" | "macos" | "linux" | "android" | "ios";
	label: string;
	status: "ready" | "attention" | "planned";
	surface: string;
	entrypoint: string;
	signal: string;
	nextAction: string;
	constraints: string[];
}

export interface LocalOpsSecureMeshRoute {
	id: LocalOpsClientSurface["id"];
	label: string;
	status: "ready" | "partial" | "attention";
	access: "localhost" | "private-vpn" | "lan-pwa";
	entrypoint: string;
	signal: string;
	nextAction: string;
	guardrails: string[];
}

export interface LocalOpsSecureMeshGuard {
	id:
		| "private-vpn"
		| "public-port-lock"
		| "desktop-cockpit"
		| "mobile-pwa"
		| "manual-only";
	label: string;
	status: "ready" | "partial" | "attention";
	signal: string;
	nextAction: string;
}

export interface LocalOpsSecureMeshPlan {
	codename: "ElysiaSecureMesh";
	status: "ready" | "partial" | "attention";
	score: number;
	summary: string;
	routes: LocalOpsSecureMeshRoute[];
	guards: LocalOpsSecureMeshGuard[];
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
	homeServer: LocalOpsHomeServerReadiness;
	future: LocalOpsFuturePlan;
	clients: LocalOpsClientSurface[];
	secureMesh: LocalOpsSecureMeshPlan;
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
	homeServer?: LocalOpsHomeServerReadiness;
	homeServerProbes?: LocalOpsHomeServerProbe[];
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

function gib(bytes: number) {
	return Math.round((bytes / 1024 / 1024 / 1024) * 10) / 10;
}

function textFromSpawnBuffer(value: unknown) {
	if (!value) return "";
	if (typeof value === "string") return value;
	if (value instanceof Uint8Array) return new TextDecoder().decode(value);
	if (value instanceof ArrayBuffer) return new TextDecoder().decode(value);
	return String(value);
}

function runCli(command: string, args: string[] = []) {
	try {
		const result = Bun.spawnSync([command, ...args], {
			stdout: "pipe",
			stderr: "pipe",
		});
		return {
			exitCode: result.exitCode,
			stdout: textFromSpawnBuffer(result.stdout).trim(),
			stderr: textFromSpawnBuffer(result.stderr).trim(),
		};
	} catch (error) {
		return {
			exitCode: 1,
			stdout: "",
			stderr: error instanceof Error ? error.message : String(error),
		};
	}
}

function commandExists(command: string) {
	const executable = process.platform === "win32" ? "where" : "which";
	return runCli(executable, [command]).exitCode === 0;
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

function hasAnyPath(cwd: string, relativePaths: string[]) {
	return relativePaths.some((relativePath) =>
		existsSync(join(cwd, relativePath)),
	);
}

function existingPaths(cwd: string, relativePaths: string[]) {
	return relativePaths.filter((relativePath) =>
		existsSync(join(cwd, relativePath)),
	);
}

function gateScore(status: LocalOpsHomeServerGate["status"]) {
	if (status === "ready") return 1;
	if (status === "attention") return 0.5;
	return 0;
}

function safeStat(path: string) {
	try {
		return statSync(path);
	} catch {
		return undefined;
	}
}

function safeReadText(path: string) {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
}

function formatAge(mtimeMs: number, nowMs = Date.now()) {
	const ageHours = Math.max(0, Math.round((nowMs - mtimeMs) / 36e5));
	if (ageHours < 48) return `${ageHours}h old`;
	return `${Math.round(ageHours / 24)}d old`;
}

function latestBackupArtifact(cwd: string, roots: string[]) {
	const artifacts: Array<{ relativePath: string; mtimeMs: number }> = [];
	const visit = (absolutePath: string, relativePath: string, depth: number) => {
		if (artifacts.length >= 160 || depth > 3) return;
		const stats = safeStat(absolutePath);
		if (!stats) return;
		if (depth > 0) {
			artifacts.push({ relativePath, mtimeMs: stats.mtimeMs });
		}
		if (!stats.isDirectory()) return;

		for (const entry of readdirSync(absolutePath).slice(0, 80)) {
			visit(join(absolutePath, entry), join(relativePath, entry), depth + 1);
		}
	};

	for (const root of roots) {
		const absolutePath = join(cwd, root);
		if (existsSync(absolutePath)) visit(absolutePath, root, 0);
	}

	return artifacts.sort((left, right) => right.mtimeMs - left.mtimeMs)[0];
}

function collectBackupProbe(cwd: string): LocalOpsHomeServerProbe {
	const checkedAt = new Date().toISOString();
	const backupRoots = ["backups", "backup", ".backups", "snapshots"];
	const runbookPaths = ["docs/BACKUP.md", "docs/RUNBOOK_BACKUP.md"];
	const restoreMarkers = [
		"docs/RESTORE_DRILL.md",
		"docs/RUNBOOK_RESTORE.md",
		"backups/RESTORE_DRILL.md",
		"backups/restore-drill.md",
		"backups/restore-drill.json",
	];
	const roots = existingPaths(cwd, backupRoots);
	const runbooks = existingPaths(cwd, runbookPaths);
	const restoreEvidence = existingPaths(cwd, restoreMarkers);
	const latest = latestBackupArtifact(cwd, backupRoots);
	const latestAgeDays = latest
		? Math.floor((Date.now() - latest.mtimeMs) / 864e5)
		: undefined;
	const freshBackup = latestAgeDays !== undefined && latestAgeDays <= 7;
	const status =
		freshBackup && runbooks.length > 0 && restoreEvidence.length > 0
			? "ready"
			: roots.length > 0 || runbooks.length > 0 || restoreEvidence.length > 0
				? "attention"
				: "missing";

	return {
		id: "backup",
		label: "Backup And Restore Evidence",
		status,
		detail: latest
			? `Latest backup evidence is ${formatAge(latest.mtimeMs)}`
			: roots.length > 0
				? "Backup directory exists, but no dated artifact was found"
				: "No local backup artifact or restore drill marker found",
		evidence: [
			...(latest ? [`latest: ${latest.relativePath}`] : []),
			...(runbooks.length > 0
				? runbooks.map((path) => `runbook: ${path}`)
				: []),
			...(restoreEvidence.length > 0
				? restoreEvidence.map((path) => `restore: ${path}`)
				: []),
			...(roots.length > 0 ? roots.map((path) => `root: ${path}`) : []),
		].slice(0, 6),
		checkedAt,
		command:
			status === "ready"
				? "bun run ops"
				: "New-Item -ItemType File docs/RUNBOOK_BACKUP.md",
	};
}

function collectStorageProbe(cwd: string): LocalOpsHomeServerProbe {
	const checkedAt = new Date().toISOString();
	try {
		const stats = statfsSync(cwd);
		const blockSize = Number(stats.bsize);
		const totalBytes = Number(stats.blocks) * blockSize;
		const freeBytes = Number(stats.bavail) * blockSize;
		const usedBytes = totalBytes - freeBytes;
		const usedPercent =
			totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
		const status = usedPercent >= 85 ? "attention" : "ready";

		return {
			id: "storage",
			label: "Repo Volume Capacity",
			status,
			detail: `${usedPercent}% used on the repo volume`,
			evidence: [
				`cwd: ${cwd}`,
				`free: ${gib(freeBytes)} GiB`,
				`total: ${gib(totalBytes)} GiB`,
			],
			checkedAt,
		};
	} catch (error) {
		return {
			id: "storage",
			label: "Repo Volume Capacity",
			status: "missing",
			detail:
				error instanceof Error
					? `Disk probe failed: ${error.message}`
					: "Disk probe failed",
			evidence: [cwd],
			checkedAt,
		};
	}
}

function collectSecureAccessProbe(): LocalOpsHomeServerProbe {
	const checkedAt = new Date().toISOString();
	if (!commandExists("tailscale")) {
		return {
			id: "secure-access",
			label: "Tailscale Status",
			status: "missing",
			detail: "Tailscale CLI is not installed or not on PATH",
			evidence: ["tailscale status --json"],
			checkedAt,
			command: "tailscale status",
		};
	}

	const result = runCli("tailscale", ["status", "--json"]);
	if (result.exitCode !== 0) {
		return {
			id: "secure-access",
			label: "Tailscale Status",
			status: "attention",
			detail: result.stderr || "Tailscale status command failed",
			evidence: ["tailscale status --json"],
			checkedAt,
			command: "tailscale up",
		};
	}

	try {
		const data = JSON.parse(result.stdout) as {
			BackendState?: string;
			Self?: {
				Online?: boolean;
				DNSName?: string;
				TailscaleIPs?: string[];
			};
		};
		const online = data.Self?.Online === true;
		const ips = data.Self?.TailscaleIPs ?? [];

		return {
			id: "secure-access",
			label: "Tailscale Status",
			status: online ? "ready" : "attention",
			detail: online
				? "Tailscale is online for private management access"
				: `Tailscale backend state: ${data.BackendState ?? "unknown"}`,
			evidence: [
				`backend: ${data.BackendState ?? "unknown"}`,
				`dns: ${data.Self?.DNSName ?? "unavailable"}`,
				ips.length > 0 ? `ip: ${ips[0]}` : "ip: unavailable",
			],
			checkedAt,
			command: online ? "tailscale status" : "tailscale up",
		};
	} catch (error) {
		return {
			id: "secure-access",
			label: "Tailscale Status",
			status: "attention",
			detail:
				error instanceof Error
					? `Could not parse tailscale status: ${error.message}`
					: "Could not parse tailscale status",
			evidence: ["tailscale status --json"],
			checkedAt,
			command: "tailscale status",
		};
	}
}

function watchedManagementPorts() {
	return [3000, 8000, 11434, 3001, 50021, 12393, 8080, 9090, 9093];
}

function isLoopbackAddress(address: string) {
	const normalized = address.trim().toLowerCase();
	return (
		normalized === "127.0.0.1" ||
		normalized === "::1" ||
		normalized === "localhost"
	);
}

function isWildcardAddress(address: string) {
	const normalized = address.trim().toLowerCase();
	return (
		normalized === "0.0.0.0" ||
		normalized === "::" ||
		normalized === "[::]" ||
		normalized === "*"
	);
}

function parsePowerShellListeners(output: string) {
	return output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [address, port] = line.split("|");
			return {
				address: address ?? "",
				port: Number(port),
			};
		})
		.filter((listener) => Number.isFinite(listener.port));
}

function parseSsListeners(output: string) {
	return output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const parts = line.split(/\s+/);
			const local = parts.at(3) ?? "";
			const match = local.match(/^(.*):(\d+)$/);
			return {
				address: match?.[1]?.replace(/^\[|\]$/g, "") ?? local,
				port: Number(match?.[2]),
			};
		})
		.filter((listener) => Number.isFinite(listener.port));
}

function collectPublicPortProbe(): LocalOpsHomeServerProbe {
	const checkedAt = new Date().toISOString();
	const ports = watchedManagementPorts();
	let listeners: Array<{ address: string; port: number }> = [];
	let command = "";

	if (process.platform === "win32") {
		command =
			"Get-NetTCPConnection -State Listen | Where-Object { @(3000,8000,11434,3001,50021,12393,8080,9090,9093) -contains $_.LocalPort }";
		const result = runCli("powershell", [
			"-NoProfile",
			"-Command",
			`$ports=@(${ports.join(",")}); Get-NetTCPConnection -State Listen | Where-Object { $ports -contains $_.LocalPort } | ForEach-Object { "$($_.LocalAddress)|$($_.LocalPort)" }`,
		]);
		if (result.exitCode === 0) {
			listeners = parsePowerShellListeners(result.stdout);
		}
	} else if (commandExists("ss")) {
		command = "ss -ltnH";
		const result = runCli("ss", ["-ltnH"]);
		if (result.exitCode === 0) {
			listeners = parseSsListeners(result.stdout).filter((listener) =>
				ports.includes(listener.port),
			);
		}
	} else if (commandExists("netstat")) {
		command = "netstat -tuln";
		const result = runCli("netstat", ["-tuln"]);
		if (result.exitCode === 0) {
			listeners = parseSsListeners(result.stdout).filter((listener) =>
				ports.includes(listener.port),
			);
		}
	}

	const exposed = listeners.filter(
		(listener) =>
			isWildcardAddress(listener.address) ||
			!isLoopbackAddress(listener.address),
	);
	const localOnly = listeners.filter((listener) =>
		isLoopbackAddress(listener.address),
	);
	const evidence = [
		...exposed.map(
			(listener) => `review: ${listener.address}:${listener.port}`,
		),
		...localOnly.map(
			(listener) => `loopback: ${listener.address}:${listener.port}`,
		),
	].slice(0, 6);

	return {
		id: "public-ports",
		label: "Management Port Exposure",
		status: exposed.length > 0 ? "attention" : "ready",
		detail:
			exposed.length > 0
				? `${exposed.length} watched management listener(s) are not loopback-only`
				: listeners.length > 0
					? "Watched management listeners are loopback-only"
					: "No watched management ports are listening",
		evidence: evidence.length > 0 ? evidence : [`watched: ${ports.join(", ")}`],
		checkedAt,
		command: command || "ss -ltnH",
	};
}

function collectNetworkPlanProbe(cwd: string): LocalOpsHomeServerProbe {
	const checkedAt = new Date().toISOString();
	const planPaths = [
		"docs/ELYSIA_HOME_SERVER_BLUEPRINT.md",
		"docs/VLAN.md",
		"docs/NETWORK_SEGMENTATION.md",
	];
	const existing = existingPaths(cwd, planPaths);
	const content = existing
		.map((relativePath) => safeReadText(join(cwd, relativePath)))
		.join("\n");
	const hasVlanIntent = /VLAN(?:\d+)?|network segmentation/i.test(content);
	const hasDenyRules =
		/deny by default|Lab\s*\|\s*Main\s*\/\s*Servers\s*\|\s*Deny|no LAN access/i.test(
			content,
		);
	const status =
		hasVlanIntent && hasDenyRules
			? "ready"
			: existing.length > 0
				? "attention"
				: "missing";

	return {
		id: "network-plan",
		label: "Network Segmentation Plan",
		status,
		detail:
			status === "ready"
				? "VLAN intent and deny-by-default rules are documented"
				: existing.length > 0
					? "Network notes exist, but VLAN intent or deny rules are incomplete"
					: "No network segmentation plan found",
		evidence:
			existing.length > 0
				? [
						...existing,
						hasVlanIntent ? "signal: VLAN intent" : "missing: VLAN intent",
						hasDenyRules ? "signal: deny rules" : "missing: deny rules",
					]
				: planPaths,
		checkedAt,
		command: "bun run ops",
	};
}

function collectLabIsolationProbe(cwd: string): LocalOpsHomeServerProbe {
	const checkedAt = new Date().toISOString();
	const checklistPaths = [
		"docs/LAB_ISOLATION.md",
		"docs/VLAN.md",
		"docs/NETWORK_SEGMENTATION.md",
	];
	const fallbackPlan = "docs/ELYSIA_HOME_SERVER_BLUEPRINT.md";
	const checklists = existingPaths(cwd, checklistPaths);
	const fallbackExists = existsSync(join(cwd, fallbackPlan));
	const content = [
		...checklists.map((relativePath) => safeReadText(join(cwd, relativePath))),
		fallbackExists ? safeReadText(join(cwd, fallbackPlan)) : "",
	].join("\n");
	const hasLabIntent = /VLAN50\s+Lab|Lab VLAN|lab-net|Lab sandbox/i.test(
		content,
	);
	const hasIsolationRule =
		/Lab\s*\|\s*Main\s*\/\s*Servers\s*\|\s*Deny|cannot reach Main|no path back/i.test(
			content,
		);
	const status =
		checklists.length > 0 && hasLabIntent && hasIsolationRule
			? "ready"
			: hasLabIntent || hasIsolationRule || fallbackExists
				? "attention"
				: "missing";

	return {
		id: "lab-isolation",
		label: "Lab Isolation Checklist",
		status,
		detail:
			status === "ready"
				? "Lab isolation checklist is documented with deny rules"
				: fallbackExists
					? "Lab isolation intent exists; enforcement checklist is still missing"
					: "No lab isolation plan found",
		evidence:
			checklists.length > 0
				? checklists
				: fallbackExists
					? [
							fallbackPlan,
							hasLabIntent ? "signal: lab VLAN" : "missing: lab VLAN",
							hasIsolationRule
								? "signal: lab deny rule"
								: "missing: lab deny rule",
						]
					: checklistPaths,
		checkedAt,
		command: "New-Item -ItemType File docs/LAB_ISOLATION.md",
	};
}

async function checkUptimeKumaProbe(
	baseUrl = "http://127.0.0.1:3001",
	timeoutMs = 750,
): Promise<LocalOpsHomeServerProbe> {
	const checkedAt = new Date().toISOString();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(baseUrl, {
			headers: { accept: "text/html,application/json" },
			signal: controller.signal,
		});

		return {
			id: "monitoring",
			label: "Uptime Kuma",
			status: response.ok ? "ready" : "attention",
			detail: response.ok
				? "Uptime Kuma responded on the local monitoring port"
				: `Uptime Kuma returned HTTP ${response.status}`,
			evidence: [baseUrl, `http: ${response.status}`],
			checkedAt,
		};
	} catch (error) {
		const message =
			error instanceof DOMException && error.name === "AbortError"
				? `Timed out after ${timeoutMs}ms`
				: error instanceof Error
					? error.message
					: "Connection failed";
		return {
			id: "monitoring",
			label: "Uptime Kuma",
			status: "missing",
			detail: message,
			evidence: [baseUrl],
			checkedAt,
			command: "docker compose up -d uptime-kuma",
		};
	} finally {
		clearTimeout(timeout);
	}
}

async function collectHomeServerProbes(cwd: string) {
	const [monitoring] = await Promise.all([checkUptimeKumaProbe()]);
	return [
		collectBackupProbe(cwd),
		collectStorageProbe(cwd),
		collectSecureAccessProbe(),
		collectPublicPortProbe(),
		monitoring,
		collectNetworkPlanProbe(cwd),
		collectLabIsolationProbe(cwd),
	];
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
	homeServer: LocalOpsHomeServerReadiness,
	future: LocalOpsFuturePlan,
	clients: LocalOpsClientSurface[],
	secureMesh: LocalOpsSecureMeshPlan,
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

	const blockedHomeGates = homeServer.gates.filter(
		(gate) => gate.status !== "ready",
	);
	if (blockedHomeGates.length > 0) {
		briefing.push(
			`Home server gates need setup: ${blockedHomeGates
				.slice(0, 3)
				.map((gate) => gate.label)
				.join(", ")}`,
		);
	}

	if (improvements.length > 0) {
		briefing.push(`Next improvement: ${improvements[0].title}`);
	}

	briefing.push(`Future path: ${future.summary}`);
	briefing.push(
		`Client surfaces: ${clients.map((client) => client.label).join(", ")}`,
	);
	briefing.push(
		`Secure mesh: ${secureMesh.status} (${secureMesh.score}%) - ${secureMesh.summary}`,
	);
	briefing.push("No device, game, or hidden background automation is armed");
	return briefing;
}

function buildHomeServerReadiness(
	cwd: string,
	diagnostics: LocalOpsDiagnostic[],
	logs: LocalOpsLogSummary[],
	probes: LocalOpsHomeServerProbe[] = [],
): LocalOpsHomeServerReadiness {
	const blueprintPath = "docs/ELYSIA_HOME_SERVER_BLUEPRINT.md";
	const blueprintReady = existsSync(join(cwd, blueprintPath));
	const probeById = new Map(probes.map((probe) => [probe.id, probe]));
	const backupProbe = probeById.get("backup");
	const storageProbe = probeById.get("storage");
	const secureAccessProbe = probeById.get("secure-access");
	const publicPortsProbe = probeById.get("public-ports");
	const monitoringProbe = probeById.get("monitoring");
	const networkPlanProbe = probeById.get("network-plan");
	const labIsolationProbe = probeById.get("lab-isolation");
	const backupMarkers = [
		"backups",
		"backup",
		".backups",
		"snapshots",
		"docs/BACKUP.md",
		"docs/RUNBOOK_BACKUP.md",
	];
	const storageMarkers = [
		"prisma/dev.db",
		"uploads",
		"data",
		"storage",
		"docs/NAS.md",
	];
	const secureAccessMarkers = [
		"tailscale.json",
		"docs/TAILSCALE.md",
		"docs/VPN.md",
		"docs/SECURE_ACCESS.md",
	];
	const monitoringMarkers = [
		"docker-compose.yml",
		"compose.yml",
		"docs/MONITORING.md",
		"docs/UPTIME_KUMA.md",
	];
	const labMarkers = [
		"docs/LAB_ISOLATION.md",
		"docs/VLAN.md",
		"docs/NETWORK_SEGMENTATION.md",
	];
	const ollamaModels = diagnostics.find(
		(diagnostic) => diagnostic.id === "ollama-models",
	);
	const liveLogs = logs.filter((log) => log.status !== "missing");
	const storageMarkerExists = hasAnyPath(cwd, storageMarkers);
	const secureAccessMarkerExists = hasAnyPath(cwd, secureAccessMarkers);
	const monitoringMarkerExists = hasAnyPath(cwd, monitoringMarkers);
	const backupMarkerExists = hasAnyPath(cwd, backupMarkers);
	const backupStatus =
		backupProbe?.status ?? (backupMarkerExists ? "attention" : "missing");
	const storageStatus =
		storageProbe?.status ?? (storageMarkerExists ? "attention" : "missing");
	const secureAccessStatus =
		publicPortsProbe?.status === "attention"
			? "attention"
			: secureAccessProbe?.status === "missing" && secureAccessMarkerExists
				? "attention"
				: (secureAccessProbe?.status ??
					(secureAccessMarkerExists ? "attention" : "missing"));
	const secureAccessSignal = [
		secureAccessProbe?.detail,
		publicPortsProbe?.detail,
	]
		.filter(Boolean)
		.join(" / ");
	const secureAccessEvidence = [
		...(secureAccessProbe?.evidence ?? []),
		...(publicPortsProbe?.evidence ?? []),
	].slice(0, 6);
	const monitoringStatus =
		monitoringProbe?.status === "ready"
			? "ready"
			: monitoringMarkerExists || liveLogs.length > 0
				? "attention"
				: "missing";
	const networkPlanStatus =
		networkPlanProbe?.status ?? (blueprintReady ? "ready" : "missing");
	const labIsolationStatus =
		labIsolationProbe?.status ??
		(hasAnyPath(cwd, labMarkers) || blueprintReady ? "attention" : "missing");

	const gates: LocalOpsHomeServerGate[] = [
		{
			id: "blueprint",
			label: "Architecture Blueprint",
			status: blueprintReady ? "ready" : "missing",
			signal: blueprintReady
				? "Home server target architecture is documented"
				: "No home server blueprint found",
			nextAction: blueprintReady
				? "Keep the blueprint aligned with implemented gates"
				: "Create docs/ELYSIA_HOME_SERVER_BLUEPRINT.md",
			evidence: [blueprintPath],
		},
		{
			id: "backup",
			label: "Backup And Restore",
			status: backupStatus,
			signal:
				backupProbe?.detail ??
				(backupMarkerExists
					? "Backup marker exists, but latest backup and restore drill age are not wired yet"
					: "No backup marker or restore runbook detected"),
			nextAction:
				backupStatus === "ready"
					? "Keep latest backup and restore drill evidence fresh"
					: "Record latest backup age and one restore drill marker",
			evidence: backupProbe?.evidence ?? backupMarkers,
		},
		{
			id: "storage",
			label: "Storage Inventory",
			status: storageStatus,
			signal:
				storageProbe?.detail ??
				(storageMarkerExists
					? "Local storage exists, NAS and snapshot telemetry are not wired yet"
					: "No local storage marker found"),
			nextAction:
				storageStatus === "ready"
					? "Add NAS reachability and snapshot-age telemetry next"
					: "Expose disk usage, snapshot age, and NAS reachability in Local Ops",
			evidence: storageProbe?.evidence ?? storageMarkers,
		},
		{
			id: "secure-access",
			label: "Secure Access",
			status: secureAccessStatus,
			signal:
				secureAccessSignal ||
				(secureAccessMarkerExists
					? "Secure access notes exist, live VPN state is not wired yet"
					: "No Tailscale or VPN readiness marker detected"),
			nextAction:
				secureAccessStatus === "ready"
					? "Add exposed-port checks before any remote service publishing"
					: "Add Tailscale or VPN status and bind management ports to loopback or private routes",
			evidence:
				secureAccessEvidence.length > 0
					? secureAccessEvidence
					: secureAccessMarkers,
		},
		{
			id: "models",
			label: "Model Inventory",
			status: ollamaModels?.status ?? "missing",
			signal: ollamaModels?.detail ?? "Ollama model inventory is not available",
			nextAction:
				ollamaModels?.nextAction ??
				"Collect Ollama model tags before enabling local AI workflows",
			evidence: ollamaModels?.items?.length
				? ollamaModels.items
				: [ollamaModels?.command ?? "ollama serve"],
		},
		{
			id: "monitoring",
			label: "Monitoring",
			status: monitoringStatus,
			signal:
				monitoringProbe?.status === "ready"
					? monitoringProbe.detail
					: liveLogs.length > 0
						? "Local logs are visible; external uptime monitoring is not wired yet"
						: (monitoringProbe?.detail ?? "No monitoring marker detected"),
			nextAction:
				monitoringStatus === "ready"
					? "Import Uptime Kuma monitor counts when credentials are configured"
					: "Connect Uptime Kuma or Prometheus health state to the Local Ops API",
			evidence:
				monitoringProbe?.status === "ready"
					? monitoringProbe.evidence
					: liveLogs.length > 0
						? liveLogs.map((log) => log.path)
						: monitoringMarkers,
		},
		{
			id: "network-plan",
			label: "Network Segmentation",
			status: networkPlanStatus,
			signal:
				networkPlanProbe?.detail ??
				(blueprintReady
					? "VLAN intent is documented in the home server blueprint"
					: "No VLAN or network separation plan found"),
			nextAction:
				networkPlanStatus === "ready"
					? "Keep VLAN intent aligned with firewall rules and client surfaces"
					: "Turn VLAN intent into a machine-readable checklist before device integration",
			evidence: networkPlanProbe?.evidence ?? [blueprintPath],
		},
		{
			id: "lab-isolation",
			label: "Lab Isolation",
			status: labIsolationStatus,
			signal:
				labIsolationProbe?.detail ??
				(blueprintReady
					? "Lab VLAN intent exists, enforcement evidence is not wired yet"
					: "No isolated lab plan found"),
			nextAction:
				labIsolationStatus === "ready"
					? "Keep lab isolation evidence current before any experiment network expands"
					: "Add a lab isolation checklist that proves Lab cannot reach Main, Servers, or NAS",
			evidence:
				labIsolationProbe?.evidence ??
				(blueprintReady ? [blueprintPath] : labMarkers),
		},
	];
	const score = Math.round(
		(gates.reduce((sum, gate) => sum + gateScore(gate.status), 0) /
			gates.length) *
			100,
	);

	return {
		status: score >= 85 ? "ready" : score >= 45 ? "partial" : "attention",
		score,
		summary:
			score >= 85
				? "Home server gates mostly ready"
				: score >= 45
					? "Home server gates are planned; instrumentation is next"
					: "Home server safety gates need setup",
		gates,
		probes,
	};
}

function buildFuturePlan(
	homeServer: LocalOpsHomeServerReadiness,
	services: LocalOpsService[],
	diagnostics: LocalOpsDiagnostic[],
	cwd: string,
): LocalOpsFuturePlan {
	const gateById = new Map(homeServer.gates.map((gate) => [gate.id, gate]));
	const serviceById = new Map(services.map((service) => [service.id, service]));
	const diagnosticById = new Map(
		diagnostics.map((diagnostic) => [diagnostic.id, diagnostic]),
	);
	const isReadyGate = (id: LocalOpsHomeServerGate["id"]) =>
		gateById.get(id)?.status === "ready";
	const isReadyService = (id: string) => serviceById.get(id)?.status === "up";
	const modelReady =
		isReadyService("ollama") &&
		diagnosticById.get("ollama-models")?.status === "ready";
	const fileIncludes = (relativePath: string, needle: string) => {
		const path = join(cwd, ...relativePath.split("/"));
		try {
			return existsSync(path) && readFileSync(path, "utf8").includes(needle);
		} catch {
			return false;
		}
	};
	const multiUserUiReady = fileIncludes(
		"public/stark-ops.html",
		'id="operator-profiles-title"',
	);
	const ragImportUxReady = fileIncludes(
		"public/stark-ops.html",
		'id="rag-import-title"',
	);
	const readmeScreenshotReady = [
		"docs/screenshots/desktop.png",
		"docs/screenshots/local-ops.png",
		"docs/screenshots/security-center.png",
	].every((relativePath) => existsSync(join(cwd, ...relativePath.split("/"))));
	const advancedCiReady =
		fileIncludes(".github/workflows/ci.yml", "Run TypeScript Typecheck") &&
		fileIncludes(".github/workflows/ci.yml", "Repository Security Audit");
	const shieldAgentReady =
		existsSync(join(cwd, "packages", "shield-agent", "Cargo.toml")) &&
		existsSync(join(cwd, "packages", "shield-agent", "src", "main.rs"));
	const tauriDistributionReady =
		existsSync(join(cwd, "src-tauri", "tauri.conf.json")) &&
		existsSync(join(cwd, "docs", "TAURI_DISTRIBUTION.md"));
	const rawStages: Array<
		Omit<LocalOpsFutureStage, "status" | "horizon"> & {
			ready: boolean;
		}
	> = [
		{
			id: "foundation",
			title: "House Telemetry Foundation",
			ready: isReadyGate("blueprint") && isReadyGate("storage"),
			track: "core",
			readinessGain: 8,
			dependencies: ["Architecture blueprint", "Repo volume capacity"],
			nextAction:
				"Keep Local Ops as the single source of truth for server readiness",
			safety: "manual-only",
		},
		{
			id: "recovery",
			title: "Recovery Memory Vault",
			ready: isReadyGate("backup"),
			track: "core",
			readinessGain: 12,
			dependencies: ["Backup marker", "Restore drill runbook"],
			nextAction:
				"Record latest backup age and one restore drill result in Local Ops",
			safety: "manual-only",
		},
		{
			id: "secure-mesh",
			title: "Private Secure Mesh",
			ready: isReadyGate("secure-access"),
			track: "core",
			readinessGain: 16,
			dependencies: ["Tailscale or VPN online", "No public management UI"],
			nextAction:
				"Install or connect Tailscale, then expose only private management routes",
			safety: "manual-only",
		},
		{
			id: "observability",
			title: "Predictive Monitoring Room",
			ready: isReadyGate("monitoring"),
			track: "core",
			readinessGain: 14,
			dependencies: ["Uptime Kuma or Prometheus", "Alert channel ready"],
			nextAction:
				"Start Uptime Kuma locally and import monitor counts into the API",
			safety: "manual-only",
		},
		{
			id: "local-intelligence",
			title: "Local Intelligence Core",
			ready: modelReady,
			track: "core",
			readinessGain: 18,
			dependencies: ["Ollama online", "At least one local model visible"],
			nextAction:
				"Start Ollama and pull the configured model before RAG expansion",
			safety: "manual-only",
		},
		{
			id: "ambient-home",
			title: "Ambient Home Interface",
			ready:
				isReadyGate("network-plan") &&
				isReadyGate("lab-isolation") &&
				isReadyGate("secure-access") &&
				isReadyGate("monitoring") &&
				modelReady,
			track: "planned",
			readinessGain: 20,
			dependencies: [
				"Network segmentation",
				"Lab isolation",
				"Secure access",
				"Monitoring",
				"Local model",
				"Windows/macOS/Linux/Android/iOS client surfaces",
			],
			nextAction:
				"Design cross-platform Home Assistant read-only status ingestion before any device control",
			safety: "manual-only",
		},
		{
			id: "multi-user-support",
			title: "Multi-User Support",
			ready: multiUserUiReady,
			track: "planned",
			readinessGain: 10,
			dependencies: [
				"Operator profiles",
				"UI-level account switching",
				"Per-user local preferences",
			],
			nextAction: multiUserUiReady
				? "Validate profile switching against authenticated sessions before changing auth policy"
				: "Design UI-level user switching and management without changing auth policy yet",
			safety: "manual-only",
		},
		{
			id: "readme-screenshots",
			title: "README Screenshots",
			ready: readmeScreenshotReady,
			track: "core",
			readinessGain: 8,
			dependencies: [
				"Desktop screenshot",
				"Local Ops screenshot",
				"Security Center screenshot",
			],
			nextAction: readmeScreenshotReady
				? "Refresh screenshots only after visible UI changes"
				: "Capture real UI screenshots into docs/screenshots",
			safety: "manual-only",
		},
		{
			id: "rag-import-ux",
			title: "RAG Import UX",
			ready: ragImportUxReady,
			track: "planned",
			readinessGain: 10,
			dependencies: [
				"Local document staging",
				"Import queue review",
				"Auth-aware upload handoff",
			],
			nextAction: ragImportUxReady
				? "Wire staged documents into the FastAPI memory importer after manual review"
				: "Add local document staging and import review before full ingestion",
			safety: "manual-only",
		},
		{
			id: "advanced-ci-cd",
			title: "Advanced CI/CD",
			ready: advancedCiReady,
			track: "experimental",
			readinessGain: 12,
			dependencies: [
				"ZAP scan workflow",
				"Automated integration test coverage",
				"Coverage gate reporting",
			],
			nextAction: advancedCiReady
				? "Keep gates visible and make enforcement stricter only after the signal is stable"
				: "Add a non-blocking ZAP scan and integration coverage report before enforcing 100% gates",
			safety: "manual-only",
		},
		{
			id: "abyss-rtos",
			title: "AbyssRTOS Integration",
			ready: false,
			track: "experimental",
			readinessGain: 16,
			dependencies: [
				"Isolated execution profile",
				"Filesystem and network deny rules",
				"Manual escape hatch",
			],
			nextAction:
				"Prototype a fully isolated execution sandbox with no default host or network reach",
			safety: "manual-only",
		},
		{
			id: "shield-agent",
			title: "Shield Agent",
			ready: shieldAgentReady,
			track: "experimental",
			readinessGain: 12,
			dependencies: ["Rust crate", "Cargo check", "Threat validation loop"],
			nextAction: shieldAgentReady
				? "Promote Shield signals into Local Ops without enabling hidden remediation"
				: "Restore the Rust Shield Agent crate and minimal validation entrypoint",
			safety: "manual-only",
		},
		{
			id: "sovereign-mesh",
			title: "Sovereign Mesh",
			ready: false,
			track: "frontier",
			readinessGain: 20,
			dependencies: [
				"Secure mesh routes",
				"Distributed node identity",
				"Read-only federation protocol",
			],
			nextAction:
				"Draft the distributed AI OS network protocol after private mesh and recovery are proven",
			safety: "manual-only",
		},
		{
			id: "tauri-distribution",
			title: "Tauri Distribution",
			ready: tauriDistributionReady,
			track: "planned",
			readinessGain: 8,
			dependencies: [
				"Tauri config",
				"Packaging runbook",
				"Release artifact policy",
			],
			nextAction: tauriDistributionReady
				? "Dry-run desktop packaging on each target OS before publishing release assets"
				: "Document desktop build, signing, and release artifact steps",
			safety: "manual-only",
		},
	];
	const firstBlocked = rawStages.findIndex((stage) => !stage.ready);
	const nextIndex = firstBlocked === -1 ? rawStages.length - 1 : firstBlocked;
	const stages = rawStages.map(({ ready, ...stage }, index) => ({
		...stage,
		status: ready ? "ready" : index === nextIndex ? "next" : "locked",
		horizon: ready ? "now" : index === nextIndex ? "next" : "later",
	})) satisfies LocalOpsFutureStage[];
	const nextStage = stages[nextIndex] ?? stages[0];

	return {
		codename: "ElysiaFuturePath",
		summary: `${nextStage.title} is the next futuristic build stage`,
		nextStageId: nextStage.id,
		stages,
	};
}

function buildClientSurfaces(cwd: string): LocalOpsClientSurface[] {
	const browserReady = existsSync(join(cwd, "public", "stark-ops.html"));
	const tauriReady = existsSync(join(cwd, "src-tauri", "tauri.conf.json"));
	const manifestReady = existsSync(join(cwd, "public", "manifest.webmanifest"));
	const serviceWorkerReady = existsSync(
		join(cwd, "public", "service-worker.js"),
	);
	const pwaReady = manifestReady && serviceWorkerReady;
	const webSignal = browserReady
		? "Local Ops web cockpit is present"
		: "Local Ops web cockpit is missing";
	const pwaSignal = pwaReady
		? "PWA manifest and service worker are present"
		: "PWA install metadata is incomplete";

	return [
		{
			id: "windows",
			label: "Windows Command Center",
			status: browserReady ? "ready" : "planned",
			surface: "Edge or Chrome web cockpit with optional Tauri desktop shell",
			entrypoint: "http://127.0.0.1:3000/stark-ops.html",
			signal: tauriReady
				? "Tauri metadata and Local Ops web cockpit are present"
				: webSignal,
			nextAction: tauriReady
				? "Add a signed Windows desktop build after ops stabilizes"
				: "Use the web cockpit first, then package a Windows shell",
			constraints: [
				"Local network or private VPN only",
				"No hidden device automation",
			],
		},
		{
			id: "macos",
			label: "macOS Cockpit",
			status: browserReady ? "ready" : "planned",
			surface: "Safari or Chrome web cockpit with optional Tauri desktop shell",
			entrypoint: tauriReady
				? "bun run desktop"
				: "http://127.0.0.1:3000/stark-ops.html",
			signal: tauriReady
				? "Tauri metadata and Local Ops web cockpit are present"
				: webSignal,
			nextAction: tauriReady
				? "Add signed macOS builds after local ops stabilizes"
				: "Use the web cockpit first, then package a macOS shell",
			constraints: [
				"Local network or private VPN only",
				"No hidden device automation",
			],
		},
		{
			id: "linux",
			label: "Linux Ops Node",
			status: browserReady ? "ready" : "planned",
			surface: "Firefox or Chrome web cockpit on a desktop or server console",
			entrypoint: "http://127.0.0.1:3000/stark-ops.html",
			signal: webSignal,
			nextAction:
				"Keep Linux as the service host and browser-first operations target",
			constraints: [
				"Local network or private VPN only",
				"Prefer read-only status for remote dashboards",
			],
		},
		{
			id: "android",
			label: "Android Field Panel",
			status: pwaReady ? "ready" : "attention",
			surface: "Chrome PWA over local network or VPN",
			entrypoint: "/stark-ops.html",
			signal: pwaSignal,
			nextAction: pwaReady
				? "Test Android install prompt after secure access is ready"
				: "Add manifest.webmanifest and a minimal service worker",
			constraints: [
				"Use private routes before exposing server UI",
				"Keep controls manual-only",
			],
		},
		{
			id: "ios",
			label: "iOS Field Panel",
			status: pwaReady ? "ready" : "attention",
			surface: "Safari PWA over local network or VPN",
			entrypoint: "/stark-ops.html",
			signal: pwaSignal,
			nextAction: pwaReady
				? "Test Add to Home Screen on iOS after VPN is ready"
				: "Add manifest.webmanifest and a minimal service worker",
			constraints: [
				"HTTPS or trusted local/VPN access for install-like behavior",
				"Read-only status first",
			],
		},
	];
}

function meshStatusScore(status: "ready" | "partial" | "attention") {
	if (status === "ready") return 100;
	if (status === "partial") return 60;
	return 20;
}

function buildSecureMeshPlan(
	homeServer: LocalOpsHomeServerReadiness,
	clients: LocalOpsClientSurface[],
): LocalOpsSecureMeshPlan {
	const gateById = new Map(homeServer.gates.map((gate) => [gate.id, gate]));
	const probeById = new Map(
		homeServer.probes.map((probe) => [probe.id, probe]),
	);
	const secureAccessReady = gateById.get("secure-access")?.status === "ready";
	const publicPortsReady = probeById.get("public-ports")?.status === "ready";
	const desktopIds = new Set<LocalOpsClientSurface["id"]>([
		"windows",
		"macos",
		"linux",
	]);
	const mobileIds = new Set<LocalOpsClientSurface["id"]>(["android", "ios"]);
	const desktopReady = clients
		.filter((client) => desktopIds.has(client.id))
		.every((client) => client.status === "ready");
	const mobileReady = clients
		.filter((client) => mobileIds.has(client.id))
		.every((client) => client.status === "ready");

	const routes = clients.map((client) => {
		const isMobile = mobileIds.has(client.id);
		const status: LocalOpsSecureMeshRoute["status"] =
			client.status !== "ready"
				? "attention"
				: secureAccessReady
					? "ready"
					: "partial";
		const access: LocalOpsSecureMeshRoute["access"] = isMobile
			? secureAccessReady
				? "private-vpn"
				: "lan-pwa"
			: secureAccessReady
				? "private-vpn"
				: "localhost";
		return {
			id: client.id,
			label: client.label,
			status,
			access,
			entrypoint: client.entrypoint,
			signal:
				status === "ready"
					? "Private mesh route can use the prepared client surface"
					: client.status === "ready"
						? "Client surface is ready; private mesh access is still pending"
						: client.signal,
			nextAction:
				status === "ready"
					? "Verify this route from the real device on the private mesh"
					: secureAccessReady
						? client.nextAction
						: "Bring up Tailscale or an equivalent private VPN before remote use",
			guardrails: [
				"Use localhost, LAN, or private VPN only",
				"Keep device control read-only until recovery is proven",
				"Do not enable public tunnels without an explicit review",
			],
		} satisfies LocalOpsSecureMeshRoute;
	});

	const guards: LocalOpsSecureMeshGuard[] = [
		{
			id: "private-vpn",
			label: "Private VPN",
			status: secureAccessReady ? "ready" : "attention",
			signal: secureAccessReady
				? "Secure access gate is ready"
				: "Secure access gate still needs Tailscale or equivalent VPN evidence",
			nextAction: secureAccessReady
				? "Test each client route over the private mesh"
				: "Install and authenticate Tailscale before remote access",
		},
		{
			id: "public-port-lock",
			label: "Public Port Lock",
			status: publicPortsReady ? "ready" : "attention",
			signal: publicPortsReady
				? "Watched management listeners are loopback-only"
				: "Management listener exposure needs review",
			nextAction: publicPortsReady
				? "Keep management ports bound to localhost or VPN"
				: "Review 3000/3001/8000/11434 listeners before remote use",
		},
		{
			id: "desktop-cockpit",
			label: "Desktop Cockpit",
			status: desktopReady ? "ready" : "partial",
			signal: desktopReady
				? "Windows, macOS, and Linux cockpit surfaces are present"
				: "One or more desktop cockpit surfaces still need packaging",
			nextAction: desktopReady
				? "Pin tested browser/Tauri entrypoints per desktop OS"
				: "Use the web cockpit first, then package native shells",
		},
		{
			id: "mobile-pwa",
			label: "Mobile PWA",
			status: mobileReady ? "ready" : "partial",
			signal: mobileReady
				? "Android and iOS PWA shells are present"
				: "Mobile PWA install metadata needs completion",
			nextAction: mobileReady
				? "Test Add to Home Screen on Android and iOS"
				: "Complete manifest and service worker before phone-first use",
		},
		{
			id: "manual-only",
			label: "Manual Only",
			status: "ready",
			signal: "No device, game, or hidden background automation is armed",
			nextAction: "Keep future controls behind explicit operator action",
		},
	];
	const score = Math.round(
		guards.reduce((total, guard) => total + meshStatusScore(guard.status), 0) /
			guards.length,
	);
	const status: LocalOpsSecureMeshPlan["status"] =
		score >= 90 ? "ready" : score >= 55 ? "partial" : "attention";
	const summary =
		status === "ready"
			? "Secure mesh is ready for cross-platform local operations"
			: status === "partial"
				? "Client shells exist; private mesh hardening is the next futuristic step"
				: "Secure mesh needs private access, port lock, and client shell evidence";

	return {
		codename: "ElysiaSecureMesh",
		status,
		score,
		summary,
		routes,
		guards,
	};
}

function buildImprovementSuggestions(
	services: LocalOpsService[],
	diagnostics: LocalOpsDiagnostic[],
	logs: LocalOpsLogSummary[],
	host: LocalOpsHostInventory,
	homeServer: LocalOpsHomeServerReadiness,
	future: LocalOpsFuturePlan,
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
	const nextFutureStage = future.stages.find(
		(stage) => stage.id === future.nextStageId,
	);

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

	const backupGate = homeServer.gates.find((gate) => gate.id === "backup");
	if (backupGate && backupGate.status !== "ready") {
		suggestions.push({
			id: "add-backup-restore-gate",
			title: "Add backup and restore readiness before home automation",
			priority: "P1",
			impact: "high",
			effort: "medium",
			reason: backupGate.signal,
			nextAction: backupGate.nextAction,
			command: "New-Item -ItemType File docs/RUNBOOK_BACKUP.md",
			safety: "manual-only",
		});
	}

	const secureAccessGate = homeServer.gates.find(
		(gate) => gate.id === "secure-access",
	);
	if (secureAccessGate && secureAccessGate.status !== "ready") {
		suggestions.push({
			id: "wire-secure-access-gate",
			title: "Wire VPN and exposed-port readiness into Local Ops",
			priority: "P2",
			impact: "high",
			effort: "medium",
			reason: secureAccessGate.signal,
			nextAction: secureAccessGate.nextAction,
			command: "tailscale status",
			safety: "manual-only",
		});
	}

	const labIsolationGate = homeServer.gates.find(
		(gate) => gate.id === "lab-isolation",
	);
	if (labIsolationGate && labIsolationGate.status !== "ready") {
		suggestions.push({
			id: "add-lab-isolation-checklist",
			title: "Add lab isolation evidence before experiment networks expand",
			priority: "P2",
			impact: "high",
			effort: "medium",
			reason: labIsolationGate.signal,
			nextAction: labIsolationGate.nextAction,
			command: "New-Item -ItemType File docs/LAB_ISOLATION.md",
			safety: "manual-only",
		});
	}

	const networkGate = homeServer.gates.find(
		(gate) => gate.id === "network-plan",
	);
	if (networkGate && networkGate.status !== "ready") {
		suggestions.push({
			id: "complete-network-segmentation-plan",
			title: "Complete VLAN and deny-rule evidence",
			priority: "P2",
			impact: "high",
			effort: "medium",
			reason: networkGate.signal,
			nextAction: networkGate.nextAction,
			command: "bun run ops",
			safety: "manual-only",
		});
	}

	if (nextFutureStage && nextFutureStage.status === "next") {
		suggestions.push({
			id: `future-${nextFutureStage.id}`,
			title: `Advance future stage: ${nextFutureStage.title}`,
			priority: "P2",
			impact: "medium",
			effort: "medium",
			reason: `Projected readiness gain: ${nextFutureStage.readinessGain}%`,
			nextAction: nextFutureStage.nextAction,
			command: "bun run ops",
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
	const homeServer =
		options.homeServer ??
		buildHomeServerReadiness(cwd, diagnostics, logs, options.homeServerProbes);
	const future = buildFuturePlan(homeServer, services, diagnostics, cwd);
	const clients = buildClientSurfaces(cwd);
	const secureMesh = buildSecureMeshPlan(homeServer, clients);
	const improvements = buildImprovementSuggestions(
		services,
		diagnostics,
		logs,
		host,
		homeServer,
		future,
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
		homeServer,
		future,
		clients,
		secureMesh,
		improvements,
		briefing: buildBriefing(
			readiness,
			services,
			host,
			logs,
			diagnostics,
			homeServer,
			future,
			clients,
			secureMesh,
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
	const cwd = resolveRepoCwd();
	const corePromise = options.assumeCoreUp
		? Promise.resolve(upServiceHealth())
		: checkElysiaCoreService();
	const [health, core, voicevox, homeServerProbes] = await Promise.all([
		performHealthCheck(),
		corePromise,
		checkVoicevoxService(),
		collectHomeServerProbes(cwd),
	]);
	const ollamaModels = await checkOllamaModelDiagnostic();

	return buildLocalOpsOverview({
		health,
		core,
		voicevox,
		ollamaModels,
		homeServerProbes,
		cwd,
	});
}
