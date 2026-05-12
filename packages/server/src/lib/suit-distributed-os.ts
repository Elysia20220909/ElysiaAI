import {
	buildSuitCommsStatus,
	buildSuitIntent,
	evaluateSuitPolicy,
	type SuitPolicyDecision,
	type SuitRelayKind,
} from "./suit-comms";
import {
	buildSuitEdgeRuntimeSnapshot,
	planSuitEdgeCommand,
	type SuitEdgeCommandPlan,
	type SuitEdgeRuntimeSnapshot,
} from "./suit-edge-runtime";
import {
	buildSuitHardwareStatus,
	type SuitHardwareStatus,
} from "./suit-hardware-adapter";
import {
	type Mark85ModePlan,
	matchMark85Mode,
	planMark85OperationalMode,
} from "./suit-mark85-profile";
import { buildSuitStatus, type SuitStatus } from "./suit-system";

export const suitOsDomainIds = [
	"pilot_interface",
	"ai_copilot",
	"mission_linux",
	"sensor_fusion",
	"realtime_motion",
	"life_support",
	"power_thermal",
	"nanite_fabric",
	"security_policy",
	"hardware_boundary",
] as const;

export const suitOsPostures = [
	"bench_simulation",
	"guardian_ready",
	"reduced_motion",
	"safe_stop",
] as const;

export type SuitOsDomainId = (typeof suitOsDomainIds)[number];
export type SuitOsPosture = (typeof suitOsPostures)[number];
export type SuitOsDomainStatus =
	| "ready"
	| "supervised"
	| "locked"
	| "degraded"
	| "safe_stop";

export interface SuitOsDomain {
	id: SuitOsDomainId;
	label: string;
	layer: "human" | "assistant" | "linux" | "rtos" | "bare_metal" | "simulation";
	runtime:
		| "operator"
		| "local_ai"
		| "linux_edge"
		| "rtos_mcu"
		| "bare_metal_guard"
		| "simulated_material_kernel";
	authority: "advisory" | "supervised" | "critical" | "locked";
	status: SuitOsDomainStatus;
	updateBudgetMs: number;
	isolation:
		| "shared_ui"
		| "signed_intent"
		| "bus_guarded"
		| "air_gapped"
		| "manual";
	nodes: string[];
	responsibilities: string[];
	forbiddenActions: string[];
}

export interface SuitOsPartition {
	id: string;
	label: string;
	domains: SuitOsDomainId[];
	trust: "public_input" | "operator_private" | "safety_critical";
	writeAuthority: "none" | "plan_only" | "confirm_required" | "local_final";
	allowedTraffic: string[];
	guardrails: string[];
}

export interface SuitOsLoop {
	id: string;
	label: string;
	domainId: SuitOsDomainId;
	runtime: SuitOsDomain["runtime"];
	periodMs: number;
	jitterBudgetMs: number;
	status: "running" | "supervised" | "locked";
	notes: string[];
}

export interface SuitOsRisk {
	id: string;
	severity: "info" | "low" | "medium" | "high";
	domainId: SuitOsDomainId;
	reason: string;
	mitigation: string;
}

export interface SuitOsTopologyLink {
	from: SuitOsDomainId;
	to: SuitOsDomainId;
	bus: string;
	trustBoundary: "same_process" | "encrypted_intent" | "field_bus" | "manual";
	allowedTraffic: string[];
}

export interface SuitDistributedOsSnapshot {
	id: "suit-distributed-os";
	version: "mark85-inspired-local-safe-v1";
	updatedAt: string;
	posture: SuitOsPosture;
	summary: string;
	status: SuitStatus;
	edge: SuitEdgeRuntimeSnapshot;
	hardware: SuitHardwareStatus;
	domains: SuitOsDomain[];
	partitions: SuitOsPartition[];
	loops: SuitOsLoop[];
	topology: SuitOsTopologyLink[];
	riskLedger: SuitOsRisk[];
	safetyInvariants: string[];
	actionSurface: {
		allow: string[];
		confirm: string[];
		deny: string[];
	};
	links: {
		hud: string;
		viewer3d: string;
		standalone: string;
	};
}

export interface SuitDistributedOsPlanInput {
	request: string;
	requestedBy: string;
	relay?: SuitRelayKind;
	now?: Date;
}

export interface SuitDistributedOsPlan {
	id: string;
	ok: boolean;
	request: string;
	matchedRequest: string;
	posture: SuitOsPosture;
	decision: SuitPolicyDecision;
	requiresManualConfirm: boolean;
	dispatch: "plan_only" | "simulation_only" | "emergency_stop_only";
	modePlan: Mark85ModePlan | null;
	intent: ReturnType<typeof buildSuitIntent> | null;
	policy: ReturnType<typeof evaluateSuitPolicy> | null;
	edgePlans: SuitEdgeCommandPlan[];
	hardware: SuitHardwareStatus;
	domainsTouched: SuitOsDomainId[];
	scheduler: SuitOsLoop[];
	controls: string[];
	reasons: string[];
	blockedCapabilities: string[];
	createdAt: string;
	expiresAt: string;
}

export class SuitDistributedOsError extends Error {
	constructor(
		message: string,
		readonly code: string,
	) {
		super(message);
		this.name = "SuitDistributedOsError";
	}
}

function randomId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 8)}`;
}

function unique<T>(values: T[]): T[] {
	return Array.from(new Set(values));
}

function nodeStatus(
	edge: SuitEdgeRuntimeSnapshot,
	nodeIds: string[],
): SuitOsDomainStatus {
	const nodes = edge.nodes.filter((node) => nodeIds.includes(node.id));
	if (nodes.some((node) => node.status === "offline")) return "degraded";
	if (nodes.some((node) => node.status === "degraded")) return "degraded";
	if (nodes.some((node) => node.status === "locked")) return "locked";
	return "ready";
}

function postureFor(
	edge: SuitEdgeRuntimeSnapshot,
	hardware: SuitHardwareStatus,
): SuitOsPosture {
	if (edge.posture === "safe_stop" || edge.localAI.mode === "safe_stop") {
		return "safe_stop";
	}
	if (edge.posture === "degraded" || edge.localAI.mode === "reduced_motion") {
		return "reduced_motion";
	}
	if (hardware.mode === "locked") return "bench_simulation";
	return "guardian_ready";
}

function domainStatusForAi(edge: SuitEdgeRuntimeSnapshot): SuitOsDomainStatus {
	if (edge.localAI.mode === "safe_stop") return "safe_stop";
	if (edge.localAI.mode === "reduced_motion") return "supervised";
	return "ready";
}

function domainStatusForHardware(
	hardware: SuitHardwareStatus,
): SuitOsDomainStatus {
	if (hardware.mode === "locked") return "locked";
	if (hardware.mode === "dry_run") return "supervised";
	return "ready";
}

function buildDomains(
	edge: SuitEdgeRuntimeSnapshot,
	hardware: SuitHardwareStatus,
): SuitOsDomain[] {
	return [
		{
			id: "pilot_interface",
			label: "Pilot Interface",
			layer: "human",
			runtime: "operator",
			authority: "supervised",
			status: "ready",
			updateBudgetMs: 250,
			isolation: "shared_ui",
			nodes: [],
			responsibilities: [
				"operator intent",
				"manual confirmation",
				"abort and safe posture selection",
			],
			forbiddenActions: ["silent execution", "hidden background launch"],
		},
		{
			id: "ai_copilot",
			label: "AEGIS-FRIDAY Copilot",
			layer: "assistant",
			runtime: "local_ai",
			authority: "advisory",
			status: domainStatusForAi(edge),
			updateBudgetMs: 500,
			isolation: "signed_intent",
			nodes: ["edge-brain-01"],
			responsibilities: [
				"translate intent to safe plans",
				"explain risk",
				"prefer guardian posture",
			],
			forbiddenActions: [
				"override pilot sovereignty",
				"release emergency stop",
				"select weapon-like behavior",
			],
		},
		{
			id: "mission_linux",
			label: "Mission Linux Layer",
			layer: "linux",
			runtime: "linux_edge",
			authority: "supervised",
			status: nodeStatus(edge, ["edge-brain-01", "hud-renderer"]),
			updateBudgetMs: 33,
			isolation: "signed_intent",
			nodes: ["edge-brain-01", "hud-renderer"],
			responsibilities: ["HUD", "logs", "sealed comms", "diagnostics"],
			forbiddenActions: ["raw GPIO writes", "raw CAN writes"],
		},
		{
			id: "sensor_fusion",
			label: "Sensor Fusion",
			layer: "rtos",
			runtime: "rtos_mcu",
			authority: "supervised",
			status: nodeStatus(edge, ["sensor-mcu-helmet"]),
			updateBudgetMs: 20,
			isolation: "bus_guarded",
			nodes: ["sensor-mcu-helmet"],
			responsibilities: [
				"local scanner telemetry",
				"camera permission gate",
				"privacy-preserving overlays",
			],
			forbiddenActions: ["cloud face recognition", "target-to-weapon chaining"],
		},
		{
			id: "realtime_motion",
			label: "Realtime Motion Reflex",
			layer: "rtos",
			runtime: "rtos_mcu",
			authority: "locked",
			status: nodeStatus(edge, ["motion-mcu-limbs"]),
			updateBudgetMs: 1,
			isolation: "air_gapped",
			nodes: ["motion-mcu-limbs"],
			responsibilities: [
				"fictional posture model",
				"deny direct actuation",
				"safe-stop compatibility",
			],
			forbiddenActions: ["actuation", "propulsion", "high-power motion"],
		},
		{
			id: "life_support",
			label: "Life Support Guard",
			layer: "bare_metal",
			runtime: "bare_metal_guard",
			authority: "critical",
			status: nodeStatus(edge, ["safety-relay"]),
			updateBudgetMs: 5,
			isolation: "air_gapped",
			nodes: ["safety-relay"],
			responsibilities: [
				"independent safety relay",
				"emergency stop authority",
				"critical telemetry thresholding",
			],
			forbiddenActions: ["software-only stop release", "remote override"],
		},
		{
			id: "power_thermal",
			label: "Power And Thermal Envelope",
			layer: "rtos",
			runtime: "rtos_mcu",
			authority: "critical",
			status: nodeStatus(edge, ["power-mcu-torso"]),
			updateBudgetMs: 10,
			isolation: "bus_guarded",
			nodes: ["power-mcu-torso"],
			responsibilities: [
				"battery-style telemetry",
				"temperature budget",
				"safe standby recommendation",
			],
			forbiddenActions: [
				"reactor implementation",
				"thermal overdrive",
				"energy weapon path",
			],
		},
		{
			id: "nanite_fabric",
			label: "Nanite Fabric Kernel",
			layer: "simulation",
			runtime: "simulated_material_kernel",
			authority: "supervised",
			status: "ready",
			updateBudgetMs: 50,
			isolation: "signed_intent",
			nodes: ["edge-brain-01"],
			responsibilities: [
				"armor-state model",
				"simulated repair mesh",
				"formation telemetry",
			],
			forbiddenActions: [
				"material fabrication instructions",
				"medical automation",
			],
		},
		{
			id: "security_policy",
			label: "Zero-Trust Policy Gate",
			layer: "linux",
			runtime: "linux_edge",
			authority: "critical",
			status: "ready",
			updateBudgetMs: 30,
			isolation: "signed_intent",
			nodes: ["edge-brain-01"],
			responsibilities: [
				"encrypted envelopes",
				"replay protection",
				"relay limits",
				"audit-ready decisions",
			],
			forbiddenActions: ["unsigned actuator command", "policy bypass"],
		},
		{
			id: "hardware_boundary",
			label: "Hardware Boundary",
			layer: "bare_metal",
			runtime: "bare_metal_guard",
			authority: hardware.enabled ? "critical" : "locked",
			status: domainStatusForHardware(hardware),
			updateBudgetMs: 100,
			isolation: "manual",
			nodes: ["safety-relay", "power-mcu-torso"],
			responsibilities: [
				"GPIO/CAN allowlist",
				"arm-token checks",
				"manual bench supervision",
			],
			forbiddenActions: ["shell command construction", "non-allowlisted IO"],
		},
	];
}

function buildPartitions(): SuitOsPartition[] {
	return [
		{
			id: "external-comms",
			label: "External Comms Partition",
			domains: ["security_policy", "ai_copilot"],
			trust: "public_input",
			writeAuthority: "none",
			allowedTraffic: ["sealed intents", "telemetry requests"],
			guardrails: ["AES-GCM envelope", "HMAC signature", "nonce replay guard"],
		},
		{
			id: "pilot-shell",
			label: "Pilot Shell Partition",
			domains: ["pilot_interface", "mission_linux", "ai_copilot"],
			trust: "operator_private",
			writeAuthority: "confirm_required",
			allowedTraffic: ["HUD state", "manual confirmation", "diagnostics"],
			guardrails: ["operator present", "clear result", "no hidden launch"],
		},
		{
			id: "realtime-safety",
			label: "Realtime Safety Partition",
			domains: ["life_support", "power_thermal", "realtime_motion"],
			trust: "safety_critical",
			writeAuthority: "local_final",
			allowedTraffic: ["read telemetry", "emergency stop"],
			guardrails: [
				"safe-stop wins",
				"motion controller locked",
				"software cannot release stop",
			],
		},
		{
			id: "material-simulation",
			label: "Material Simulation Partition",
			domains: ["nanite_fabric", "sensor_fusion"],
			trust: "operator_private",
			writeAuthority: "plan_only",
			allowedTraffic: ["formation state", "simulated repair posture"],
			guardrails: ["no fabrication recipe", "no medical automation"],
		},
		{
			id: "bench-hardware",
			label: "Bench Hardware Partition",
			domains: ["hardware_boundary"],
			trust: "safety_critical",
			writeAuthority: "confirm_required",
			allowedTraffic: ["allowlisted GPIO/CAN plan", "emergency stop path"],
			guardrails: ["locked by default", "arm token", "manual bench review"],
		},
	];
}

function buildLoops(domains: SuitOsDomain[]): SuitOsLoop[] {
	const statusByDomain = new Map(domains.map((domain) => [domain.id, domain]));
	const loop = (
		id: string,
		label: string,
		domainId: SuitOsDomainId,
		periodMs: number,
		jitterBudgetMs: number,
		notes: string[],
	): SuitOsLoop => {
		const domain = statusByDomain.get(domainId);
		const locked = domain?.status === "locked";
		const supervised = domain?.status === "supervised";
		return {
			id,
			label,
			domainId,
			runtime: domain?.runtime ?? "local_ai",
			periodMs,
			jitterBudgetMs,
			status: locked ? "locked" : supervised ? "supervised" : "running",
			notes,
		};
	};

	return [
		loop(
			"pilot-intent-loop",
			"Pilot Intent Loop",
			"pilot_interface",
			250,
			100,
			["human pace", "confirmation owns risky transitions"],
		),
		loop(
			"copilot-reasoning-loop",
			"Copilot Reasoning Loop",
			"ai_copilot",
			500,
			150,
			["advisory only", "explains denied actions"],
		),
		loop("hud-render-loop", "HUD Render Loop", "mission_linux", 33, 8, [
			"browser surface",
			"no actuator authority",
		]),
		loop("sensor-fusion-loop", "Sensor Fusion Loop", "sensor_fusion", 20, 4, [
			"local privacy gate",
			"scan overlay only",
		]),
		loop("power-thermal-loop", "Power Thermal Loop", "power_thermal", 10, 2, [
			"critical telemetry",
			"bias to standby",
		]),
		loop("safety-relay-loop", "Safety Relay Loop", "life_support", 5, 1, [
			"local final authority",
			"stop release is not software-enabled",
		]),
		loop(
			"motion-reflex-loop",
			"Motion Reflex Loop",
			"realtime_motion",
			1,
			0.2,
			["locked simulation boundary", "no propulsion or actuation"],
		),
		loop("nanite-state-loop", "Nanite State Loop", "nanite_fabric", 50, 10, [
			"formation telemetry",
			"simulated material kernel",
		]),
	];
}

function buildTopology(): SuitOsTopologyLink[] {
	return [
		{
			from: "pilot_interface",
			to: "ai_copilot",
			bus: "neural session",
			trustBoundary: "same_process",
			allowedTraffic: ["intent", "confirmation", "cancel"],
		},
		{
			from: "ai_copilot",
			to: "security_policy",
			bus: "signed intent",
			trustBoundary: "encrypted_intent",
			allowedTraffic: ["policy evaluation", "audit metadata"],
		},
		{
			from: "security_policy",
			to: "mission_linux",
			bus: "loopback",
			trustBoundary: "same_process",
			allowedTraffic: ["HUD state", "diagnostics"],
		},
		{
			from: "mission_linux",
			to: "sensor_fusion",
			bus: "I2C/SPI model",
			trustBoundary: "field_bus",
			allowedTraffic: ["read telemetry", "calibrate with confirmation"],
		},
		{
			from: "mission_linux",
			to: "power_thermal",
			bus: "CAN model",
			trustBoundary: "field_bus",
			allowedTraffic: ["read telemetry", "emergency stop"],
		},
		{
			from: "power_thermal",
			to: "life_support",
			bus: "hardwired interlock",
			trustBoundary: "manual",
			allowedTraffic: ["stop request", "fault signal"],
		},
		{
			from: "security_policy",
			to: "hardware_boundary",
			bus: "allowlisted adapter",
			trustBoundary: "manual",
			allowedTraffic: ["plan", "confirmed allowlisted IO"],
		},
	];
}

function buildRiskLedger(
	edge: SuitEdgeRuntimeSnapshot,
	hardware: SuitHardwareStatus,
): SuitOsRisk[] {
	const comms = buildSuitCommsStatus();
	const risks: SuitOsRisk[] = [
		{
			id: "motion-locked",
			severity: "info",
			domainId: "realtime_motion",
			reason: "motion MCU is intentionally locked in the software-safe model",
			mitigation: "keep propulsion and actuation outside this runtime",
		},
	];

	if (hardware.mode === "locked") {
		risks.push({
			id: "hardware-locked",
			severity: "low",
			domainId: "hardware_boundary",
			reason: "real GPIO/CAN adapter is locked by default",
			mitigation:
				"use plan-only simulation unless a manual bench setup is armed",
		});
	}
	if (hardware.mode === "enabled") {
		risks.push({
			id: "hardware-enabled",
			severity: "medium",
			domainId: "hardware_boundary",
			reason: "real GPIO/CAN dispatch is enabled",
			mitigation:
				"require allowlist, manual confirmation, arm token, and Linux tools",
		});
	}
	if (!comms.crypto.keyConfigured) {
		risks.push({
			id: "dev-comms-key",
			severity: "medium",
			domainId: "security_policy",
			reason: "development suit comms key is active",
			mitigation: "set ELYSIA_SUIT_COMMS_KEY before any private network use",
		});
	}
	if (edge.localAI.risk !== "low") {
		risks.push({
			id: "local-ai-risk",
			severity: edge.localAI.risk,
			domainId: "ai_copilot",
			reason: edge.localAI.reasons.join("; "),
			mitigation: "reduce motion envelope and prefer telemetry or standby",
		});
	}

	return risks;
}

export function buildSuitDistributedOsSnapshot(
	now: Date = new Date(),
): SuitDistributedOsSnapshot {
	const status = buildSuitStatus({ updatedAt: now.toISOString() });
	const edge = buildSuitEdgeRuntimeSnapshot(now);
	const hardware = buildSuitHardwareStatus();
	const domains = buildDomains(edge, hardware);
	const posture = postureFor(edge, hardware);

	return {
		id: "suit-distributed-os",
		version: "mark85-inspired-local-safe-v1",
		updatedAt: now.toISOString(),
		posture,
		summary: `Distributed guardian OS: ${posture}; ${edge.nodes.length} nodes, ${edge.buses.length} buses, hardware ${hardware.mode}.`,
		status,
		edge,
		hardware,
		domains,
		partitions: buildPartitions(),
		loops: buildLoops(domains),
		topology: buildTopology(),
		riskLedger: buildRiskLedger(edge, hardware),
		safetyInvariants: [
			"pilot confirmation owns risky transitions",
			"life support and emergency stop have local final authority",
			"Linux edge may advise but may not directly actuate",
			"RTOS and bare-metal domains stay separated from public comms",
			"weapon-like, propulsion, overdrive, and Infinity-style requests are denied",
			"nanite behavior is simulation-only material-state telemetry",
		],
		actionSurface: {
			allow: [
				"status",
				"diagnostics",
				"sensor_fusion",
				"flight_visualization",
				"standby",
			],
			confirm: ["guardian", "nano_repair", "calibrate_sensor"],
			deny: [
				"weapon_like",
				"physical_actuation",
				"high_power_motion",
				"infinity_emergency",
			],
		},
		links: {
			hud: "/suit-hud.html",
			viewer3d: "/suit-viewer.html",
			standalone: "/standalone/nanotech-suit/index.html",
		},
	};
}

function normalizeRequest(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

function isEmergencyStopRequest(value: string): boolean {
	const normalized = normalizeRequest(value);
	return (
		normalized === "emergency_stop" ||
		normalized === "e_stop" ||
		normalized.includes("safe_stop")
	);
}

function isHardwareProbeRequest(value: string): boolean {
	const normalized = normalizeRequest(value);
	return (
		normalized.includes("hardware_probe") ||
		normalized.includes("gpio") ||
		normalized.includes("can_bus") ||
		(normalized.includes("hardware") && normalized.includes("status"))
	);
}

function dedupeEdgePlans(plans: SuitEdgeCommandPlan[]): SuitEdgeCommandPlan[] {
	const seen = new Set<string>();
	const result: SuitEdgeCommandPlan[] = [];
	for (const plan of plans) {
		const key = `${plan.targetNodeId}:${plan.command}`;
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(plan);
	}
	return result;
}

function supportingPlansForMode(
	modeId: string,
	requestedBy: string,
): SuitEdgeCommandPlan[] {
	if (modeId === "flight_visualization") {
		return [
			planSuitEdgeCommand({
				targetNodeId: "sensor-mcu-helmet",
				command: "read_telemetry",
				requestedBy,
				reason: "support flight-style HUD with sensor telemetry",
			}),
		];
	}
	if (modeId === "guardian") {
		return [
			planSuitEdgeCommand({
				targetNodeId: "power-mcu-torso",
				command: "read_telemetry",
				requestedBy,
				reason: "confirm power and thermal envelope before guardian posture",
			}),
		];
	}
	if (modeId === "nano_repair") {
		return [
			planSuitEdgeCommand({
				targetNodeId: "safety-relay",
				command: "read_telemetry",
				requestedBy,
				reason: "verify safety relay before simulated repair posture",
			}),
		];
	}
	return [];
}

function aggregateDecision(
	baseDecision: SuitPolicyDecision,
	policy: ReturnType<typeof evaluateSuitPolicy> | null,
	edgePlans: SuitEdgeCommandPlan[],
): SuitPolicyDecision {
	if (
		baseDecision === "emergency_stop" ||
		policy?.decision === "emergency_stop" ||
		edgePlans.some((plan) => plan.decision === "emergency_stop")
	) {
		return "emergency_stop";
	}
	if (
		baseDecision === "deny" ||
		policy?.decision === "deny" ||
		edgePlans.some((plan) => plan.decision === "deny")
	) {
		return "deny";
	}
	if (
		baseDecision === "confirm" ||
		policy?.decision === "confirm" ||
		edgePlans.some((plan) => plan.decision === "confirm")
	) {
		return "confirm";
	}
	return "allow";
}

function touchedDomainsFor(
	modeId: string,
	edgePlans: SuitEdgeCommandPlan[],
): SuitOsDomainId[] {
	const domains: SuitOsDomainId[] = [
		"pilot_interface",
		"ai_copilot",
		"security_policy",
	];
	if (modeId === "flight_visualization") {
		domains.push("mission_linux", "sensor_fusion");
	}
	if (modeId === "guardian") domains.push("life_support", "power_thermal");
	if (modeId === "nano_repair") domains.push("nanite_fabric", "life_support");
	if (modeId === "diagnostics" || modeId === "standby") {
		domains.push("mission_linux");
	}
	for (const plan of edgePlans) {
		if (plan.route.nodeKind === "sensor_mcu") domains.push("sensor_fusion");
		if (plan.route.nodeKind === "power_mcu") domains.push("power_thermal");
		if (plan.route.nodeKind === "safety_relay") domains.push("life_support");
		if (plan.route.nodeKind === "hud" || plan.route.nodeKind === "edge_brain") {
			domains.push("mission_linux");
		}
		if (plan.route.nodeKind === "motion_mcu") domains.push("realtime_motion");
	}
	return unique(domains);
}

function loopsForDomains(
	snapshot: SuitDistributedOsSnapshot,
	domains: SuitOsDomainId[],
): SuitOsLoop[] {
	return snapshot.loops.filter((loop) => domains.includes(loop.domainId));
}

function planEmergencyStop(
	input: SuitDistributedOsPlanInput,
	snapshot: SuitDistributedOsSnapshot,
	now: Date,
): SuitDistributedOsPlan {
	const intent = buildSuitIntent({
		kind: "emergency_stop",
		relay: input.relay ?? "wifi_lan",
		requestedBy: input.requestedBy,
		reason: "operator emergency stop request",
		now,
	});
	const policy = evaluateSuitPolicy(intent, snapshot.edge.localAI, now);
	const edgePlans = dedupeEdgePlans([
		planSuitEdgeCommand(
			{
				targetNodeId: "power-mcu-torso",
				command: "emergency_stop",
				requestedBy: input.requestedBy,
				reason: "cut to safe power posture",
			},
			now,
		),
		planSuitEdgeCommand(
			{
				targetNodeId: "safety-relay",
				command: "emergency_stop",
				requestedBy: input.requestedBy,
				reason: "assert independent safety relay",
			},
			now,
		),
	]);
	const domainsTouched = touchedDomainsFor("emergency_stop", edgePlans);

	return {
		id: randomId("suit-os-plan"),
		ok: true,
		request: input.request,
		matchedRequest: "emergency_stop",
		posture: snapshot.posture,
		decision: "emergency_stop",
		requiresManualConfirm: false,
		dispatch: "emergency_stop_only",
		modePlan: null,
		intent,
		policy,
		edgePlans,
		hardware: snapshot.hardware,
		domainsTouched,
		scheduler: loopsForDomains(snapshot, domainsTouched),
		controls: unique([
			...policy.controls,
			...edgePlans.flatMap((plan) => plan.controls),
			"local safety controller final authority",
		]),
		reasons: unique([
			...policy.reasons,
			...edgePlans.flatMap((plan) => plan.reasons),
			"emergency stop is safety-preserving",
		]),
		blockedCapabilities: ["stop release", "motion restart", "remote override"],
		createdAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + 5_000).toISOString(),
	};
}

function planHardwareProbe(
	input: SuitDistributedOsPlanInput,
	snapshot: SuitDistributedOsSnapshot,
	now: Date,
): SuitDistributedOsPlan {
	const intent = buildSuitIntent({
		kind: "health_check",
		relay: input.relay ?? "wifi_lan",
		requestedBy: input.requestedBy,
		reason: "hardware boundary health probe",
		now,
	});
	const policy = evaluateSuitPolicy(intent, snapshot.edge.localAI, now);
	const edgePlans = dedupeEdgePlans([
		planSuitEdgeCommand(
			{
				targetNodeId: "safety-relay",
				command: "read_telemetry",
				requestedBy: input.requestedBy,
				reason: "read safety relay state",
			},
			now,
		),
		planSuitEdgeCommand(
			{
				targetNodeId: "power-mcu-torso",
				command: "read_telemetry",
				requestedBy: input.requestedBy,
				reason: "read power bus state",
			},
			now,
		),
	]);
	const decision = aggregateDecision("allow", policy, edgePlans);
	const domainsTouched = unique([
		...touchedDomainsFor("hardware_probe", edgePlans),
		"hardware_boundary" as SuitOsDomainId,
	]);

	return {
		id: randomId("suit-os-plan"),
		ok: decision === "allow",
		request: input.request,
		matchedRequest: "hardware_probe",
		posture: snapshot.posture,
		decision,
		requiresManualConfirm: decision === "confirm",
		dispatch: "plan_only",
		modePlan: null,
		intent,
		policy,
		edgePlans,
		hardware: snapshot.hardware,
		domainsTouched,
		scheduler: loopsForDomains(snapshot, domainsTouched),
		controls: unique([
			...policy.controls,
			...edgePlans.flatMap((plan) => plan.controls),
			"hardware adapter remains locked unless explicitly armed",
		]),
		reasons: unique([
			...policy.reasons,
			...edgePlans.flatMap((plan) => plan.reasons),
			`hardware adapter mode is ${snapshot.hardware.mode}`,
		]),
		blockedCapabilities: ["raw GPIO write", "raw CAN write", "actuation"],
		createdAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + 15_000).toISOString(),
	};
}

function planMark85Request(
	input: SuitDistributedOsPlanInput,
	snapshot: SuitDistributedOsSnapshot,
	now: Date,
): SuitDistributedOsPlan {
	const modePlan = planMark85OperationalMode(
		input.request,
		input.requestedBy,
		input.relay ?? "wifi_lan",
	);
	const edgePlans = dedupeEdgePlans([
		modePlan.edgePlan,
		...supportingPlansForMode(modePlan.mode.id, input.requestedBy),
	]);
	const decision = aggregateDecision(
		modePlan.decision,
		modePlan.policy,
		edgePlans,
	);
	const domainsTouched = touchedDomainsFor(modePlan.mode.id, edgePlans);
	const requiresManualConfirm =
		decision === "confirm" ||
		modePlan.policy.requiresManualConfirm ||
		edgePlans.some((plan) => plan.requiresManualConfirm);

	return {
		id: randomId("suit-os-plan"),
		ok: decision === "allow",
		request: input.request,
		matchedRequest: modePlan.mode.id,
		posture: snapshot.posture,
		decision,
		requiresManualConfirm,
		dispatch: decision === "allow" ? "simulation_only" : "plan_only",
		modePlan,
		intent: modePlan.intent,
		policy: modePlan.policy,
		edgePlans,
		hardware: snapshot.hardware,
		domainsTouched,
		scheduler: loopsForDomains(snapshot, domainsTouched),
		controls: unique([
			...modePlan.policy.controls,
			...edgePlans.flatMap((plan) => plan.controls),
			...modePlan.mode.requiredControls,
		]),
		reasons: unique([
			...modePlan.reasons,
			...edgePlans.flatMap((plan) => plan.reasons),
		]),
		blockedCapabilities: unique(modePlan.mode.blockedCapabilities),
		createdAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + 15_000).toISOString(),
	};
}

export function planSuitDistributedOsRequest(
	input: SuitDistributedOsPlanInput,
): SuitDistributedOsPlan {
	const request = input.request.trim();
	const requestedBy = input.requestedBy.trim();
	if (!request) {
		throw new SuitDistributedOsError(
			"Suit OS request is required",
			"SUIT_OS_REQUEST_REQUIRED",
		);
	}
	if (!requestedBy) {
		throw new SuitDistributedOsError(
			"requestedBy is required",
			"SUIT_OS_OPERATOR_REQUIRED",
		);
	}

	const now = input.now ?? new Date();
	const snapshot = buildSuitDistributedOsSnapshot(now);

	if (isEmergencyStopRequest(request)) {
		return planEmergencyStop({ ...input, request, requestedBy }, snapshot, now);
	}
	if (isHardwareProbeRequest(request)) {
		return planHardwareProbe({ ...input, request, requestedBy }, snapshot, now);
	}
	if (matchMark85Mode(request)) {
		return planMark85Request({ ...input, request, requestedBy }, snapshot, now);
	}

	return {
		id: randomId("suit-os-plan"),
		ok: false,
		request,
		matchedRequest: "unmapped",
		posture: snapshot.posture,
		decision: "deny",
		requiresManualConfirm: false,
		dispatch: "plan_only",
		modePlan: null,
		intent: null,
		policy: null,
		edgePlans: [],
		hardware: snapshot.hardware,
		domainsTouched: ["pilot_interface", "ai_copilot", "security_policy"],
		scheduler: loopsForDomains(snapshot, [
			"pilot_interface",
			"ai_copilot",
			"security_policy",
		]),
		controls: [
			"request must map to a known safe operating mode",
			"pilot can choose diagnostics, sensor fusion, guardian, nano repair, or flight visualization",
		],
		reasons: ["request is not mapped to a safe suit OS operation"],
		blockedCapabilities: ["unmapped physical action", "implicit actuation"],
		createdAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + 15_000).toISOString(),
	};
}
