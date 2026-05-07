import { CONFIG } from "./constants";
import { getCoreStatus } from "./elysia-core";
import { ELYSIA_CORE_PROTOCOL } from "./elysia-core-protocol";
import { performHealthCheck } from "./health";
import { collectLocalOpsOverview } from "./local-ops";
import { collectNativeLiteSnapshot } from "./native-lite";
import { getNeuralAuthEvents } from "./neural-auth-system";
import { buildSuitStatus } from "./suit-system";

export type ProjectReadiness = "ready" | "partial" | "attention";

export interface ProjectSubsystem {
	id:
		| "elysia-server"
		| "fastapi-kernel"
		| "elysia-core"
		| "neural-auth"
		| "core-protocol"
		| "nanotech-suit"
		| "native-lite"
		| "local-ops";
	name: string;
	status: "online" | "ready" | "degraded" | "attention" | "offline";
	summary: string;
	signal: string;
	nextAction: string;
}

export interface ProjectMissionControl {
	codename: "ElysiaProjectControl";
	generatedAt: string;
	readiness: ProjectReadiness;
	score: number;
	operator: {
		username: string;
		role: string;
		neuralSignature: string;
	};
	protocol: {
		name: typeof ELYSIA_CORE_PROTOCOL.name;
		version: typeof ELYSIA_CORE_PROTOCOL.version;
	};
	subsystems: ProjectSubsystem[];
	nextActions: string[];
	links: Array<{ label: string; href: string }>;
}

function statusWeight(status: ProjectSubsystem["status"]) {
	if (status === "online" || status === "ready") return 100;
	if (status === "degraded") return 70;
	if (status === "attention") return 45;
	return 10;
}

export function summarizeProjectReadiness(
	subsystems: Pick<ProjectSubsystem, "status">[],
): { readiness: ProjectReadiness; score: number } {
	const score = Math.round(
		subsystems.reduce(
			(sum, subsystem) => sum + statusWeight(subsystem.status),
			0,
		) / Math.max(subsystems.length, 1),
	);

	if (score >= 85) return { readiness: "ready", score };
	if (score >= 60) return { readiness: "partial", score };
	return { readiness: "attention", score };
}

async function probeFastApi() {
	const startedAt = Date.now();
	try {
		const abort = new AbortController();
		const timeout = setTimeout(() => abort.abort(), 3000);
		const response = await fetch(`${CONFIG.FASTAPI_BASE_URL}/health`, {
			signal: abort.signal,
		});
		clearTimeout(timeout);
		return {
			ok: response.ok,
			ms: Date.now() - startedAt,
			status: response.status,
		};
	} catch {
		return {
			ok: false,
			ms: Date.now() - startedAt,
			status: 0,
		};
	}
}

export async function buildProjectMissionControl(operator: {
	username: string;
	role: string;
	neuralSignature: string;
}): Promise<ProjectMissionControl> {
	const [health, fastApi, localOps] = await Promise.all([
		performHealthCheck(),
		probeFastApi(),
		collectLocalOpsOverview({ assumeCoreUp: true }),
	]);
	const core = getCoreStatus();
	const suit = buildSuitStatus();
	const nativeLite = collectNativeLiteSnapshot({ detectToolchains: false });
	const authEvents = getNeuralAuthEvents();

	const subsystems: ProjectSubsystem[] = [
		{
			id: "elysia-server",
			name: "Elysia Server",
			status: health.status === "healthy" ? "online" : "degraded",
			summary: "Bun/Elysia API gateway and static app host",
			signal: `health=${health.status}`,
			nextAction:
				"Keep /health and /metrics green before adding wider surfaces",
		},
		{
			id: "fastapi-kernel",
			name: "FastAPI Kernel",
			status: fastApi.ok ? "online" : "attention",
			summary: "Python AI kernel bridge for local model workflows",
			signal: fastApi.ok
				? `health ${fastApi.status} in ${fastApi.ms}ms`
				: "health probe failed",
			nextAction: fastApi.ok
				? "Use kernel mode for Core chat"
				: "Start lite kernel or inspect logs/dev-server.err.log",
		},
		{
			id: "elysia-core",
			name: core.name,
			status: core.status === "online" ? "online" : "degraded",
			summary: "Authenticated conversational core with local fallback",
			signal: `${core.activeSessions.length} active session(s)`,
			nextAction:
				"Continue routing user-facing chat through /api/elysia-core/chat",
		},
		{
			id: "neural-auth",
			name: "Neural Auth",
			status: "ready",
			summary: "Bearer token verification with sealed local audit events",
			signal: `${authEvents.length} recent auth event(s)`,
			nextAction: "Rotate development secrets before production packaging",
		},
		{
			id: "core-protocol",
			name: ELYSIA_CORE_PROTOCOL.name,
			status: "ready",
			summary: "Signed request and response frame contract",
			signal: ELYSIA_CORE_PROTOCOL.version,
			nextAction:
				"Use signed protocolFrame from API clients that can keep secrets server-side",
		},
		{
			id: "nanotech-suit",
			name: suit.model,
			status: suit.modules.some((module) => module.status === "online")
				? "online"
				: "attention",
			summary: "Fictional NSS-01 telemetry and command surface",
			signal: `armor=${suit.armorIntegrity}% energy=${suit.telemetry.energyLevel}%`,
			nextAction: "Keep commands cinematic and manual-only",
		},
		{
			id: "native-lite",
			name: "Native Lite",
			status: nativeLite.score >= 70 ? "ready" : "attention",
			summary: nativeLite.summary,
			signal: `score=${nativeLite.score}`,
			nextAction: "Prefer dev:lite for daily integrated checks",
		},
		{
			id: "local-ops",
			name: "Local Ops",
			status: localOps.readiness.status === "ready" ? "ready" : "attention",
			summary: localOps.readiness.summary,
			signal: `score=${localOps.readiness.score}`,
			nextAction:
				localOps.homeServer.gates[0]?.nextAction || "Review local ops gates",
		},
	];

	const readiness = summarizeProjectReadiness(subsystems);
	const nextActions = subsystems
		.filter(
			(subsystem) =>
				subsystem.status === "attention" || subsystem.status === "degraded",
		)
		.map((subsystem) => `${subsystem.name}: ${subsystem.nextAction}`)
		.slice(0, 5);

	return {
		codename: "ElysiaProjectControl",
		generatedAt: new Date().toISOString(),
		...readiness,
		operator,
		protocol: {
			name: ELYSIA_CORE_PROTOCOL.name,
			version: ELYSIA_CORE_PROTOCOL.version,
		},
		subsystems,
		nextActions:
			nextActions.length > 0
				? nextActions
				: ["All core lanes are ready. Continue with focused feature work."],
		links: [
			{ label: "Chat", href: "/index.html#chat" },
			{ label: "Project Cockpit", href: "/project-cockpit.html" },
			{ label: "Neural Auth", href: "/standalone/login/index.html" },
			{ label: "Nanotech Suit", href: "/standalone/nanotech-suit/index.html" },
			{ label: "Health", href: "/health" },
		],
	};
}
