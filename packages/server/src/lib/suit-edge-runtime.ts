import {
	buildSuitCommsStatus,
	evaluateSuitLocalAI,
	type SuitLocalAIState,
} from "./suit-comms";

export const suitEdgeNodeKinds = [
	"edge_brain",
	"sensor_mcu",
	"power_mcu",
	"motion_mcu",
	"hud",
	"safety_relay",
] as const;

export const suitEdgeBusKinds = [
	"loopback",
	"i2c",
	"spi",
	"uart",
	"can",
	"gpio",
	"ethernet",
] as const;

export const suitEdgeCommandKinds = [
	"read_telemetry",
	"sync_clock",
	"run_diagnostics",
	"calibrate_sensor",
	"set_led_pattern",
	"arm_safety_relay",
	"disarm_safety_relay",
	"actuate",
	"update_firmware",
	"emergency_stop",
] as const;
export const suitEdgeNodeStatuses = [
	"ready",
	"degraded",
	"locked",
	"offline",
] as const;

export type SuitEdgeNodeKind = (typeof suitEdgeNodeKinds)[number];
export type SuitEdgeBusKind = (typeof suitEdgeBusKinds)[number];
export type SuitEdgeCommandKind = (typeof suitEdgeCommandKinds)[number];
export type SuitEdgeNodeStatus = "ready" | "degraded" | "locked" | "offline";
export type SuitEdgeDecision = "allow" | "confirm" | "deny" | "emergency_stop";

export interface SuitEdgeTelemetry {
	cpuLoad: number;
	cpuTempC: number;
	voltage: number;
	signalQuality: number;
	heartbeatAgeMs: number;
}

export interface SuitEdgeNode {
	id: string;
	label: string;
	kind: SuitEdgeNodeKind;
	runtime: "linux_edge" | "rtos_mcu" | "bare_metal_guard";
	osProfile: string;
	bus: SuitEdgeBusKind;
	zone: "helmet" | "torso" | "left_arm" | "right_arm" | "legs" | "bench";
	status: SuitEdgeNodeStatus;
	safetyTier: "advisory" | "supervised" | "critical";
	heartbeatMs: number;
	lastSeenAt: string;
	capabilities: SuitEdgeCommandKind[];
	telemetry: SuitEdgeTelemetry;
}

export interface SuitEdgeBus {
	id: string;
	kind: SuitEdgeBusKind;
	label: string;
	status: "ready" | "degraded" | "locked";
	nodes: string[];
	guardrails: string[];
}

export interface SuitEdgeRuntimeSnapshot {
	id: "suit-edge-runtime";
	updatedAt: string;
	posture: "bench_simulation" | "local_edge_ready" | "degraded" | "safe_stop";
	localAI: SuitLocalAIState;
	nodes: SuitEdgeNode[];
	buses: SuitEdgeBus[];
	hardRules: string[];
}

export interface SuitEdgeHeartbeatInput {
	nodeId: string;
	status?: SuitEdgeNodeStatus;
	cpuLoad?: number;
	cpuTempC?: number;
	voltage?: number;
	signalQuality?: number;
	now?: Date;
}

export interface SuitEdgeCommandInput {
	targetNodeId: string;
	command: SuitEdgeCommandKind;
	requestedBy: string;
	reason?: string;
	payload?: Record<string, unknown>;
}

export interface SuitEdgeCommandPlan {
	id: string;
	targetNodeId: string;
	command: SuitEdgeCommandKind;
	decision: SuitEdgeDecision;
	route: {
		bus: SuitEdgeBusKind;
		nodeKind: SuitEdgeNodeKind;
		transport: "simulation_only" | "local_supervised";
	};
	reasons: string[];
	controls: string[];
	requiresManualConfirm: boolean;
	dispatchable: boolean;
	createdAt: string;
	expiresAt: string;
}

export class SuitEdgeRuntimeError extends Error {
	constructor(
		message: string,
		readonly code: string,
	) {
		super(message);
		this.name = "SuitEdgeRuntimeError";
	}
}

type HeartbeatRecord = {
	seenAt: Date;
	status?: SuitEdgeNodeStatus;
	telemetry: Partial<Omit<SuitEdgeTelemetry, "heartbeatAgeMs">>;
};

const heartbeatRecords = new Map<string, HeartbeatRecord>();

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function randomId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 8)}`;
}

function isSuitEdgeCommandKind(value: unknown): value is SuitEdgeCommandKind {
	return (
		typeof value === "string" &&
		suitEdgeCommandKinds.includes(value as SuitEdgeCommandKind)
	);
}

function isSuitEdgeNodeStatus(value: unknown): value is SuitEdgeNodeStatus {
	return (
		typeof value === "string" &&
		suitEdgeNodeStatuses.includes(value as SuitEdgeNodeStatus)
	);
}

function baselineNodes(now: Date): SuitEdgeNode[] {
	const lastSeenAt = now.toISOString();
	return [
		{
			id: "edge-brain-01",
			label: "Helmet Edge Brain",
			kind: "edge_brain",
			runtime: "linux_edge",
			osProfile: "Raspberry Pi OS / Jetson-style Linux edge",
			bus: "ethernet",
			zone: "helmet",
			status: "ready",
			safetyTier: "supervised",
			heartbeatMs: 1000,
			lastSeenAt,
			capabilities: ["read_telemetry", "sync_clock", "run_diagnostics"],
			telemetry: {
				cpuLoad: 18,
				cpuTempC: 48,
				voltage: 5.05,
				signalQuality: 0.99,
				heartbeatAgeMs: 0,
			},
		},
		{
			id: "sensor-mcu-helmet",
			label: "Helmet Sensor MCU",
			kind: "sensor_mcu",
			runtime: "rtos_mcu",
			osProfile: "RTOS sensor loop",
			bus: "i2c",
			zone: "helmet",
			status: "ready",
			safetyTier: "advisory",
			heartbeatMs: 250,
			lastSeenAt,
			capabilities: ["read_telemetry", "calibrate_sensor"],
			telemetry: {
				cpuLoad: 9,
				cpuTempC: 38,
				voltage: 3.31,
				signalQuality: 0.98,
				heartbeatAgeMs: 0,
			},
		},
		{
			id: "power-mcu-torso",
			label: "Torso Power MCU",
			kind: "power_mcu",
			runtime: "rtos_mcu",
			osProfile: "RTOS power monitor",
			bus: "can",
			zone: "torso",
			status: "ready",
			safetyTier: "critical",
			heartbeatMs: 100,
			lastSeenAt,
			capabilities: ["read_telemetry", "run_diagnostics", "emergency_stop"],
			telemetry: {
				cpuLoad: 12,
				cpuTempC: 41,
				voltage: 12.1,
				signalQuality: 0.99,
				heartbeatAgeMs: 0,
			},
		},
		{
			id: "motion-mcu-limbs",
			label: "Limb Motion MCU",
			kind: "motion_mcu",
			runtime: "rtos_mcu",
			osProfile: "RTOS motion planner disabled",
			bus: "can",
			zone: "legs",
			status: "locked",
			safetyTier: "critical",
			heartbeatMs: 100,
			lastSeenAt,
			capabilities: ["read_telemetry", "run_diagnostics", "actuate"],
			telemetry: {
				cpuLoad: 0,
				cpuTempC: 33,
				voltage: 0,
				signalQuality: 1,
				heartbeatAgeMs: 0,
			},
		},
		{
			id: "hud-renderer",
			label: "HUD Renderer",
			kind: "hud",
			runtime: "linux_edge",
			osProfile: "browser HUD surface",
			bus: "loopback",
			zone: "helmet",
			status: "ready",
			safetyTier: "advisory",
			heartbeatMs: 1000,
			lastSeenAt,
			capabilities: ["read_telemetry", "set_led_pattern"],
			telemetry: {
				cpuLoad: 15,
				cpuTempC: 45,
				voltage: 5,
				signalQuality: 1,
				heartbeatAgeMs: 0,
			},
		},
		{
			id: "safety-relay",
			label: "Independent Safety Relay",
			kind: "safety_relay",
			runtime: "bare_metal_guard",
			osProfile: "hardware interlock simulation",
			bus: "gpio",
			zone: "torso",
			status: "ready",
			safetyTier: "critical",
			heartbeatMs: 50,
			lastSeenAt,
			capabilities: ["read_telemetry", "arm_safety_relay", "emergency_stop"],
			telemetry: {
				cpuLoad: 1,
				cpuTempC: 29,
				voltage: 3.3,
				signalQuality: 1,
				heartbeatAgeMs: 0,
			},
		},
	];
}

function applyHeartbeats(nodes: SuitEdgeNode[], now: Date): SuitEdgeNode[] {
	return nodes.map((node) => {
		const record = heartbeatRecords.get(node.id);
		if (!record) return node;

		const heartbeatAgeMs = Math.max(0, now.getTime() - record.seenAt.getTime());
		const stale = heartbeatAgeMs > node.heartbeatMs * 4;
		const status = stale ? "degraded" : (record.status ?? node.status);
		const telemetry = {
			...node.telemetry,
			...record.telemetry,
			heartbeatAgeMs,
		};

		return {
			...node,
			status,
			lastSeenAt: record.seenAt.toISOString(),
			telemetry,
		};
	});
}

function buildBuses(nodes: SuitEdgeNode[]): SuitEdgeBus[] {
	const busKinds = [...suitEdgeBusKinds];
	return busKinds.map((kind) => {
		const busNodes = nodes.filter((node) => node.bus === kind);
		const criticalIssue = busNodes.some(
			(node) =>
				node.safetyTier === "critical" &&
				(node.status === "degraded" || node.status === "offline"),
		);
		const degraded = busNodes.some((node) => node.status === "degraded");
		return {
			id: `bus-${kind}`,
			kind,
			label: kind.toUpperCase(),
			status: criticalIssue ? "locked" : degraded ? "degraded" : "ready",
			nodes: busNodes.map((node) => node.id),
			guardrails:
				kind === "gpio" || kind === "can"
					? ["safety gate required", "no direct actuation"]
					: ["telemetry and supervised plans only"],
		};
	});
}

function postureFor(nodes: SuitEdgeNode[], localAI: SuitLocalAIState) {
	if (localAI.mode === "safe_stop") return "safe_stop";
	if (
		nodes.some(
			(node) =>
				node.safetyTier === "critical" &&
				(node.status === "degraded" || node.status === "offline"),
		)
	) {
		return "safe_stop";
	}
	if (nodes.some((node) => node.status === "degraded")) return "degraded";
	return "local_edge_ready";
}

export function buildSuitEdgeRuntimeSnapshot(
	now: Date = new Date(),
): SuitEdgeRuntimeSnapshot {
	const comms = buildSuitCommsStatus();
	const localAI = evaluateSuitLocalAI(comms.status);
	const nodes = applyHeartbeats(baselineNodes(now), now);
	return {
		id: "suit-edge-runtime",
		updatedAt: now.toISOString(),
		posture: postureFor(nodes, localAI),
		localAI,
		nodes,
		buses: buildBuses(nodes),
		hardRules: [
			"simulation-only edge bus",
			"no raw GPIO/CAN writes from API",
			"motion MCU remains locked until manual hardware review",
			"independent safety relay has final authority",
			"firmware updates require explicit confirmation",
		],
	};
}

export function recordSuitEdgeHeartbeat(
	input: SuitEdgeHeartbeatInput,
): SuitEdgeNode {
	const now = input.now ?? new Date();
	const snapshot = buildSuitEdgeRuntimeSnapshot(now);
	const node = snapshot.nodes.find((item) => item.id === input.nodeId);
	if (!node) {
		throw new SuitEdgeRuntimeError(
			"Edge node not found",
			"SUIT_EDGE_NOT_FOUND",
		);
	}

	heartbeatRecords.set(input.nodeId, {
		seenAt: now,
		status: input.status,
		telemetry: {
			...(typeof input.cpuLoad === "number"
				? { cpuLoad: clamp(input.cpuLoad, 0, 100) }
				: {}),
			...(typeof input.cpuTempC === "number"
				? { cpuTempC: clamp(input.cpuTempC, -20, 120) }
				: {}),
			...(typeof input.voltage === "number"
				? { voltage: clamp(input.voltage, 0, 60) }
				: {}),
			...(typeof input.signalQuality === "number"
				? { signalQuality: clamp(input.signalQuality, 0, 1) }
				: {}),
		},
	});

	return buildSuitEdgeRuntimeSnapshot(now).nodes.find(
		(item) => item.id === input.nodeId,
	) as SuitEdgeNode;
}

export function planSuitEdgeCommand(
	input: SuitEdgeCommandInput,
	now: Date = new Date(),
): SuitEdgeCommandPlan {
	if (!isSuitEdgeCommandKind(input.command)) {
		throw new SuitEdgeRuntimeError(
			"Edge command is invalid",
			"SUIT_EDGE_COMMAND_INVALID",
		);
	}

	const snapshot = buildSuitEdgeRuntimeSnapshot(now);
	const target = snapshot.nodes.find((node) => node.id === input.targetNodeId);
	if (!target) {
		throw new SuitEdgeRuntimeError(
			"Edge node not found",
			"SUIT_EDGE_NOT_FOUND",
		);
	}

	const reasons: string[] = [];
	const controls = [
		"authenticated neural session",
		"edge runtime policy",
		"simulation-only transport",
		"independent safety relay",
		"manual hardware review before actuation",
	];
	let decision: SuitEdgeDecision = "allow";

	if (!target.capabilities.includes(input.command)) {
		decision = "deny";
		reasons.push("target node does not advertise this capability");
	} else if (input.command === "emergency_stop") {
		decision = "emergency_stop";
		reasons.push("emergency stop is safety-preserving");
	} else if (
		snapshot.posture === "safe_stop" &&
		input.command !== "read_telemetry"
	) {
		decision = "deny";
		reasons.push("edge runtime is in safe-stop posture");
	} else if (target.status === "offline" || target.status === "locked") {
		decision = "deny";
		reasons.push("target node is not dispatchable");
	} else if (input.command === "actuate") {
		decision = "deny";
		reasons.push("direct actuation is outside the software-safe boundary");
	} else if (
		input.command === "update_firmware" ||
		input.command === "arm_safety_relay" ||
		input.command === "disarm_safety_relay" ||
		input.command === "calibrate_sensor"
	) {
		decision = input.command === "disarm_safety_relay" ? "deny" : "confirm";
		reasons.push(
			input.command === "disarm_safety_relay"
				? "disarming safety relay is not allowed from software"
				: "command requires manual confirmation and bench supervision",
		);
	} else {
		reasons.push("command is informational or diagnostic");
	}

	if (target.telemetry.cpuTempC > 80 && decision === "allow") {
		decision = "confirm";
		reasons.push("target node temperature requires supervision");
	}

	const dispatchable =
		decision === "allow" ||
		decision === "emergency_stop" ||
		decision === "confirm";

	return {
		id: randomId("edge-plan"),
		targetNodeId: target.id,
		command: input.command,
		decision,
		route: {
			bus: target.bus,
			nodeKind: target.kind,
			transport:
				decision === "allow" && target.safetyTier !== "critical"
					? "local_supervised"
					: "simulation_only",
		},
		reasons,
		controls,
		requiresManualConfirm: decision === "confirm",
		dispatchable,
		createdAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + 15_000).toISOString(),
	};
}

export function normalizeSuitEdgeHeartbeatBody(
	value: unknown,
): SuitEdgeHeartbeatInput {
	if (!isRecord(value) || typeof value.nodeId !== "string") {
		throw new SuitEdgeRuntimeError(
			"Heartbeat body is invalid",
			"SUIT_EDGE_HEARTBEAT_INVALID",
		);
	}
	return {
		nodeId: value.nodeId,
		...(isSuitEdgeNodeStatus(value.status) ? { status: value.status } : {}),
		...(typeof value.cpuLoad === "number" ? { cpuLoad: value.cpuLoad } : {}),
		...(typeof value.cpuTempC === "number" ? { cpuTempC: value.cpuTempC } : {}),
		...(typeof value.voltage === "number" ? { voltage: value.voltage } : {}),
		...(typeof value.signalQuality === "number"
			? { signalQuality: value.signalQuality }
			: {}),
	};
}

export function resetSuitEdgeRuntimeForTests(): void {
	heartbeatRecords.clear();
}
