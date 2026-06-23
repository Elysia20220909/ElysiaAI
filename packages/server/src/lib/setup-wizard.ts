import { existsSync } from "node:fs";
import net from "node:net";
import { join } from "node:path";
import { config } from "../../../../src/config.ts";
import type { LocalOpsOverview, LocalOpsService } from "./local-ops";
import { checkOllamaStatus, getWorkspaceRoot } from "./mvp-local-ai";

export type SetupStepStatus = "ready" | "attention" | "blocked" | "optional";

export type SetupPortState = {
	id: string;
	host: string;
	port: number;
	open: boolean;
};

export type SetupWizardStep = {
	id: string;
	title: string;
	status: SetupStepStatus;
	detail: string;
	command?: string;
	url?: string;
	evidence?: string[];
	action?: {
		id: string;
		label: string;
		method: "GET" | "POST";
		path: string;
	};
};

export type SetupWizardReadiness = {
	status: "ready" | "attention" | "blocked";
	score: number;
	summary: string;
	generatedAt: string;
	model: {
		target: string;
		available: boolean;
		installed: string[];
		pullCommand: string;
	};
	steps: SetupWizardStep[];
	commands: Array<{ label: string; command: string; when: string }>;
	logs: Array<{ id: string; label: string; status: string; lines: string[] }>;
	ports: SetupPortState[];
};

type OllamaSetupStatus = Awaited<ReturnType<typeof checkOllamaStatus>>;

function serviceById(overview: LocalOpsOverview, id: string) {
	return overview.services.find((service) => service.id === id);
}

function stepStatusForService(
	service: LocalOpsService | undefined,
	required: boolean,
): SetupStepStatus {
	if (!service || service.status === "unknown") return required ? "attention" : "optional";
	if (["up", "ready", "degraded"].includes(service.status)) return "ready";
	if (service.status === "disabled") return "optional";
	return required ? "blocked" : "optional";
}

function portEvidence(port: SetupPortState | undefined, serviceName: string) {
	if (!port) return [];
	return [
		`${serviceName} port ${port.host}:${port.port} is ${port.open ? "open" : "closed"}`,
	];
}

function buildOllamaStep(
	service: LocalOpsService | undefined,
	ollama: OllamaSetupStatus,
	port: SetupPortState | undefined,
): SetupWizardStep {
	if (ollama.status !== "up") {
		return {
			id: "ollama",
			title: "Ollama local model engine",
			status: "blocked",
			detail: "Ollamaが応答していません。ローカル推論を使うにはOllamaを起動してください。",
			command: "ollama serve",
			url: service?.url,
			evidence: [
				ollama.error || "Ollama status check failed",
				...portEvidence(port, "Ollama"),
			],
		};
	}

	if (ollama.modelAvailable === false) {
		return {
			id: "ollama-model",
			title: `Ollama model ${ollama.model}`,
			status: "attention",
			detail: `Ollamaは起動していますが、対象モデル ${ollama.model} がまだ見つかりません。`,
			command: `ollama pull ${ollama.model}`,
			url: service?.url,
			evidence: [
				`installed: ${ollama.models.length ? ollama.models.join(", ") : "none"}`,
			],
			action: {
				id: "pull-model-command",
				label: "Pull command",
				method: "POST",
				path: "/api/setup/actions/pull-model",
			},
		};
	}

	return {
		id: "ollama",
		title: "Ollama local model engine",
		status: "ready",
		detail: `Ollama is reachable. Target model: ${ollama.model}.`,
		url: service?.url,
		evidence: [
			`installed: ${ollama.models.length ? ollama.models.join(", ") : "detected"}`,
		],
	};
}

function buildServiceStep({
	id,
	title,
	service,
	required,
	blockedDetail,
	readyDetail,
	command,
	port,
}: {
	id: string;
	title: string;
	service?: LocalOpsService;
	required: boolean;
	blockedDetail: string;
	readyDetail: string;
	command?: string;
	port?: SetupPortState;
}): SetupWizardStep {
	const status = stepStatusForService(service, required);
	const detail =
		status === "ready"
			? readyDetail
			: service?.detail || service?.responseTime
				? `${blockedDetail} Last response: ${service.responseTime ?? "unknown"}ms.`
				: blockedDetail;
	return {
		id,
		title,
		status,
		detail,
		command: status === "ready" ? undefined : command || service?.startCommand,
		url: service?.url,
		evidence: [
			...(service?.detail ? [service.detail] : []),
			...(service?.lastCheck ? [`last check: ${service.lastCheck}`] : []),
			...portEvidence(port, title),
		],
	};
}

function buildTauriStep(root: string): SetupWizardStep {
	const configPath = join(root, "src-tauri", "tauri.conf.json");
	const ready = existsSync(configPath);
	return {
		id: "tauri",
		title: "Tauri desktop shell",
		status: ready ? "ready" : "blocked",
		detail: ready
			? "Tauri configuration is present. Desktop shell can be prepared from this workspace."
			: "src-tauri/tauri.conf.json が見つかりません。デスクトップ配布前にTauri設定を確認してください。",
		command: ready ? "bun run desktop" : "bun tauri init",
		evidence: [configPath],
	};
}

function buildPrismaStep(overview: LocalOpsOverview): SetupWizardStep {
	const diagnostic = overview.diagnostics.find((item) => item.id === "prisma");
	if (!diagnostic) {
		return {
			id: "database",
			title: "Prisma local database",
			status: "attention",
			detail: "Prisma診断がまだありません。DBセットアップを確認してください。",
			command: "bun scripts/manage.ts setup-db",
		};
	}
	return {
		id: "database",
		title: "Prisma local database",
		status: diagnostic.status === "ready" ? "ready" : "attention",
		detail: diagnostic.detail,
		command: diagnostic.status === "ready" ? undefined : diagnostic.command,
		evidence: diagnostic.items,
	};
}

function summarizeSetup(steps: SetupWizardStep[]) {
	const required = steps.filter((step) => step.status !== "optional");
	const blocked = required.filter((step) => step.status === "blocked");
	const attention = required.filter((step) => step.status === "attention");
	const ready = required.filter((step) => step.status === "ready");
	const score =
		required.length === 0 ? 100 : Math.round((ready.length / required.length) * 100);

	if (blocked.length > 0) {
		return {
			status: "blocked" as const,
			score,
			summary: `${blocked[0].title} needs setup before the cockpit feels ready.`,
		};
	}
	if (attention.length > 0) {
		return {
			status: "attention" as const,
			score,
			summary: `${attention.length} setup item${attention.length === 1 ? "" : "s"} need attention.`,
		};
	}
	return {
		status: "ready" as const,
		score,
		summary: "Local cockpit is ready for daily use.",
	};
}

function normalizeSetupUrl(value: string, fallback: string) {
	try {
		return new URL(value || fallback).toString().replace(/\/$/, "");
	} catch {
		return fallback.replace(/\/$/, "");
	}
}

export function buildSetupWizardReadiness({
	overview,
	ollama,
	root,
	ports = [],
}: {
	overview: LocalOpsOverview;
	ollama: OllamaSetupStatus;
	root: string;
	ports?: SetupPortState[];
}): SetupWizardReadiness {
	const portById = new Map(ports.map((port) => [port.id, port]));
	const fastapi = serviceById(overview, "fastapi-kernel");
	const ollamaService = serviceById(overview, "ollama");
	const voicevox = serviceById(overview, "voicevox");

	const steps: SetupWizardStep[] = [
		buildServiceStep({
			id: "core",
			title: "Bun / Elysia local server",
			service: serviceById(overview, "elysia-core"),
			required: true,
			readyDetail: "Local Bun / Elysia API is serving the cockpit.",
			blockedDetail: "Elysia local server is not reachable.",
			command: "bun run dev:lite",
			port: portById.get("core"),
		}),
		buildServiceStep({
			id: "fastapi",
			title: "FastAPI kernel",
			service: fastapi,
			required: true,
			readyDetail: "FastAPI kernel health check is responding.",
			blockedDetail: "FastAPI kernel is offline. RAG and heavier AI tools may fall back.",
			command: "bun scripts/manage.ts dev:lite",
			port: portById.get("fastapi"),
		}),
		buildOllamaStep(ollamaService, ollama, portById.get("ollama")),
		buildPrismaStep(overview),
		buildTauriStep(root),
		buildServiceStep({
			id: "voicevox",
			title: "VOICEVOX voice engine",
			service: voicevox,
			required: false,
			readyDetail: "VOICEVOX is available for local TTS.",
			blockedDetail: "VOICEVOX is optional. Start it when voice output is needed.",
			command: "Start VOICEVOX Engine manually",
			port: portById.get("voicevox"),
		}),
	];
	const summary = summarizeSetup(steps);

	return {
		...summary,
		generatedAt: overview.generatedAt,
		model: {
			target: ollama.model,
			available: ollama.status === "up" && ollama.modelAvailable !== false,
			installed: ollama.status === "up" ? ollama.models : [],
			pullCommand: `ollama pull ${ollama.model}`,
		},
		steps,
		commands: overview.commands.map((command) => ({
			label: command.label,
			command: command.command,
			when: command.when,
		})),
		logs: overview.logs.map((log) => ({
			id: log.id,
			label: log.label,
			status: log.status,
			lines: log.lines.slice(0, 4),
		})),
		ports,
	};
}

function urlPort(id: string, rawUrl: string, fallback: string) {
	const url = new URL(normalizeSetupUrl(rawUrl, fallback));
	return {
		id,
		host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname,
		port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
	};
}

async function probePort({
	id,
	host,
	port,
	timeoutMs = 400,
}: {
	id: string;
	host: string;
	port: number;
	timeoutMs?: number;
}): Promise<SetupPortState> {
	return await new Promise((resolve) => {
		const socket = net.createConnection({ host, port });
		const done = (open: boolean) => {
			socket.destroy();
			resolve({ id, host, port, open });
		};
		socket.setTimeout(timeoutMs);
		socket.once("connect", () => done(true));
		socket.once("timeout", () => done(false));
		socket.once("error", () => done(false));
	});
}

async function collectPortStates(): Promise<SetupPortState[]> {
	const targets = [
		urlPort("core", `http://127.0.0.1:${config.port}`, "http://127.0.0.1:3000"),
		urlPort("fastapi", config.fastApiBaseUrl, "http://127.0.0.1:8000"),
		urlPort("ollama", config.ollamaBaseUrl, "http://127.0.0.1:11434"),
		urlPort("voicevox", config.voicevoxBaseUrl, "http://127.0.0.1:50021"),
	];
	return await Promise.all(targets.map((target) => probePort(target)));
}

export async function collectSetupWizardReadiness({
	root = getWorkspaceRoot(),
}: {
	root?: string;
} = {}) {
	const { collectLocalOpsOverview } = await import("./local-ops");
	const [overview, ollama, ports] = await Promise.all([
		collectLocalOpsOverview({ assumeCoreUp: true }),
		checkOllamaStatus(1500),
		collectPortStates(),
	]);

	return buildSetupWizardReadiness({
		overview,
		ollama,
		root,
		ports,
	});
}

export function buildPullModelCommand(model = config.ollamaModel) {
	const safeModel = model.trim() || config.ollamaModel;
	return {
		action: "manual-command",
		model: safeModel,
		command: `ollama pull ${safeModel}`,
		note: "ElysiaAI does not run this automatically yet. Copy the command into a terminal when you are ready.",
	};
}
