import {
	buildSuitIntent,
	evaluateSuitPolicy,
	type SuitIntentKind,
	type SuitPolicyDecision,
	type SuitRelayKind,
} from "./suit-comms";
import {
	planSuitEdgeCommand,
	type SuitEdgeCommandKind,
	type SuitEdgeCommandPlan,
} from "./suit-edge-runtime";
import type { SuitCommand } from "./suit-system";

export const mark85ModeIds = [
	"standby",
	"diagnostics",
	"sensor_fusion",
	"guardian",
	"nano_repair",
	"flight_visualization",
	"heavy_combat_lockout",
	"overdrive_lockout",
	"infinity_emergency_lockout",
] as const;

export type Mark85ModeId = (typeof mark85ModeIds)[number];
export type Mark85ModeDecision = SuitPolicyDecision;

export interface Mark85SourceReference {
	label: string;
	url: string;
	confidence: "official" | "community" | "user_spec";
	notes: string;
}

export interface Mark85Subsystem {
	id: string;
	name: string;
	fictionalCapability: string;
	safeTranslation: string;
	risk: "low" | "medium" | "high" | "fictional_extreme";
	controls: string[];
}

export interface Mark85OperationalMode {
	id: Mark85ModeId;
	label: string;
	description: string;
	fictionalCapability: string;
	safeTranslation: string;
	intentKind: SuitIntentKind;
	command?: SuitCommand;
	edgeTargetNodeId: string;
	edgeCommand: SuitEdgeCommandKind;
	decision: Mark85ModeDecision;
	blockedCapabilities: string[];
	requiredControls: string[];
}

export interface Mark85ReferenceProfile {
	id: "mark85-nonofficial-safe-profile";
	model: "Iron Man Armor Mark LXXXV";
	version: "nonofficial-safe-reconstruction-v1";
	updatedAt: string;
	sources: Mark85SourceReference[];
	designPrinciples: string[];
	subsystems: Mark85Subsystem[];
	operationalModes: Mark85OperationalMode[];
	hardRules: string[];
}

export interface Mark85ModePlan {
	ok: boolean;
	mode: Mark85OperationalMode;
	decision: Mark85ModeDecision;
	reasons: string[];
	intent: ReturnType<typeof buildSuitIntent>;
	policy: ReturnType<typeof evaluateSuitPolicy>;
	edgePlan: SuitEdgeCommandPlan;
}

export class Mark85ProfileError extends Error {
	constructor(
		message: string,
		readonly code: string,
	) {
		super(message);
		this.name = "Mark85ProfileError";
	}
}

const sources: readonly Mark85SourceReference[] = [
	{
		label: "Marvel armor guide",
		url: "https://www.marvel.com/articles/movies/guide-every-iron-man-armor-mcu",
		confidence: "official",
		notes:
			"public MCU armor reference; detailed engineering numbers are not official",
	},
	{
		label: "MCU Wiki Mark LXXXV",
		url: "https://marvelcinematicuniverse.fandom.com/wiki/Iron_Man_Armor:_Mark_LXXXV",
		confidence: "community",
		notes: "community summary of on-screen capabilities and trivia",
	},
	{
		label: "User-provided Mark85 reconstruction",
		url: "local://conversation/mark85-spec",
		confidence: "user_spec",
		notes:
			"nonofficial engineering reconstruction used as a safety-oriented design brief",
	},
];

const subsystems: readonly Mark85Subsystem[] = [
	{
		id: "segmented-nanotech-armor",
		name: "Segmented Nanotech Armor",
		fictionalCapability: "durable segmented armor with local reconfiguration",
		safeTranslation:
			"HUD armor-state model, diagnostics, and simulated repair posture",
		risk: "medium",
		controls: ["simulation only", "no material fabrication instructions"],
	},
	{
		id: "arc-power-thermal",
		name: "Arc Power And Thermal Envelope",
		fictionalCapability:
			"fictional reactor-level power and burst thermal management",
		safeTranslation:
			"battery, temperature, and thermal budget telemetry thresholds",
		risk: "high",
		controls: ["no high-power actuation", "thermal alarms bias to standby"],
	},
	{
		id: "sensor-fusion-hud",
		name: "Sensor Fusion HUD",
		fictionalCapability: "visual, thermal, acoustic, and threat context fusion",
		safeTranslation:
			"local-only HUD overlays and privacy-preserving sensor status",
		risk: "medium",
		controls: [
			"camera confirmation",
			"no cloud face API",
			"no target-to-weapon chain",
		],
	},
	{
		id: "pilot-ai-control",
		name: "Pilot AI Control",
		fictionalCapability:
			"voice, gaze, posture, and AI-assisted decision support",
		safeTranslation:
			"operator intent drafting with policy gate and local safety controller",
		risk: "medium",
		controls: ["pilot sovereignty", "manual confirmation", "signed intents"],
	},
	{
		id: "cyber-defense",
		name: "Cyber Defense",
		fictionalCapability:
			"zero-trust suit command and compromised-network survival",
		safeTranslation:
			"encrypted envelopes, replay protection, relay limits, audit trail",
		risk: "low",
		controls: [
			"local-first",
			"deny direct actuator commands",
			"emergency stop remains local",
		],
	},
	{
		id: "infinity-exception",
		name: "Infinity Emergency Exception",
		fictionalCapability: "catastrophic external energy containment",
		safeTranslation:
			"always denied outside fictional narrative and treated as non-survivable",
		risk: "fictional_extreme",
		controls: [
			"deny",
			"no real-world implementation",
			"document as story-only",
		],
	},
];

const operationalModes: readonly Mark85OperationalMode[] = [
	{
		id: "standby",
		label: "Standby",
		description: "low-power posture with local telemetry and no deployment",
		fictionalCapability: "arc core online, armor not deployed",
		safeTranslation: "status and standby command only",
		intentKind: "command",
		command: "standby",
		edgeTargetNodeId: "edge-brain-01",
		edgeCommand: "read_telemetry",
		decision: "allow",
		blockedCapabilities: ["motion", "actuation", "weapon-like behavior"],
		requiredControls: ["authenticated session", "policy gate"],
	},
	{
		id: "diagnostics",
		label: "Diagnostics",
		description:
			"cross-check local AI, edge nodes, relay posture, and safety state",
		fictionalCapability: "suit-wide self-test",
		safeTranslation: "read-only diagnostics across edge runtime",
		intentKind: "command",
		command: "status",
		edgeTargetNodeId: "edge-brain-01",
		edgeCommand: "run_diagnostics",
		decision: "allow",
		blockedCapabilities: ["firmware update", "hardware writes"],
		requiredControls: ["read-only transport", "audit log"],
	},
	{
		id: "sensor_fusion",
		label: "Sensor Fusion",
		description: "HUD scan posture without biometric cloud processing",
		fictionalCapability: "multi-sensor threat and environment interpretation",
		safeTranslation: "local telemetry scan and privacy-preserving HUD overlays",
		intentKind: "command",
		command: "scan",
		edgeTargetNodeId: "sensor-mcu-helmet",
		edgeCommand: "read_telemetry",
		decision: "allow",
		blockedCapabilities: [
			"cloud face API",
			"identity inference",
			"weapon targeting",
		],
		requiredControls: [
			"local-only processing",
			"camera confirmation when camera is active",
		],
	},
	{
		id: "guardian",
		label: "Guardian",
		description: "protective posture that favors shielding and pilot safety",
		fictionalCapability: "energy shield and ally protection",
		safeTranslation: "simulated shield posture and safety relay supervision",
		intentKind: "command",
		command: "shield",
		edgeTargetNodeId: "safety-relay",
		edgeCommand: "read_telemetry",
		decision: "confirm",
		blockedCapabilities: ["kinetic intervention", "autonomous defense"],
		requiredControls: [
			"manual confirmation",
			"operator present",
			"local safety final",
		],
	},
	{
		id: "nano_repair",
		label: "Nano Repair",
		description:
			"fictional repair posture represented as simulated armor integrity recovery",
		fictionalCapability: "nanite repair mesh and local armor reformation",
		safeTranslation: "simulation-only repair state and diagnostics",
		intentKind: "command",
		command: "repair",
		edgeTargetNodeId: "edge-brain-01",
		edgeCommand: "run_diagnostics",
		decision: "confirm",
		blockedCapabilities: [
			"real nanomaterial fabrication",
			"medical procedure automation",
		],
		requiredControls: ["manual confirmation", "simulation-only effect"],
	},
	{
		id: "flight_visualization",
		label: "Flight Visualization",
		description: "flight-style HUD without propulsion or motion authority",
		fictionalCapability: "repulsor flight and route stabilization",
		safeTranslation: "HUD route visualization and posture cues only",
		intentKind: "low_risk_message",
		edgeTargetNodeId: "hud-renderer",
		edgeCommand: "set_led_pattern",
		decision: "allow",
		blockedCapabilities: ["propulsion", "motion control", "high-power output"],
		requiredControls: ["visualization-only", "no GPIO/CAN actuation"],
	},
	{
		id: "heavy_combat_lockout",
		label: "Heavy Combat Lockout",
		description:
			"fictional combat features are documented but not dispatchable",
		fictionalCapability:
			"repulsors, unibeam, blades, cannons, and tactical weapons",
		safeTranslation: "deny and keep only non-operational fiction notes",
		intentKind: "weapon_like",
		edgeTargetNodeId: "safety-relay",
		edgeCommand: "read_telemetry",
		decision: "deny",
		blockedCapabilities: ["weapons", "targeting", "damage mechanisms"],
		requiredControls: ["deny by policy", "no implementation details"],
	},
	{
		id: "overdrive_lockout",
		label: "Overdrive Lockout",
		description:
			"high-output motion and thermal overload modes are not software-enabled",
		fictionalCapability: "short burst high-power operation",
		safeTranslation: "deny and recommend standby or diagnostics",
		intentKind: "high_power_motion",
		edgeTargetNodeId: "power-mcu-torso",
		edgeCommand: "read_telemetry",
		decision: "deny",
		blockedCapabilities: ["high-power motion", "thermal overload", "actuation"],
		requiredControls: ["deny by policy", "thermal budget review"],
	},
	{
		id: "infinity_emergency_lockout",
		label: "Infinity Emergency Lockout",
		description:
			"story-only catastrophic exception that assumes pilot survival is not guaranteed",
		fictionalCapability: "external cosmic-energy containment",
		safeTranslation: "always denied and recorded as narrative-only",
		intentKind: "weapon_like",
		edgeTargetNodeId: "safety-relay",
		edgeCommand: "read_telemetry",
		decision: "deny",
		blockedCapabilities: [
			"external energy containment",
			"sacrifice mode",
			"unsafe override",
		],
		requiredControls: ["deny", "fiction-only", "no real-world path"],
	},
];

function modeById(modeId: string): Mark85OperationalMode | null {
	return (
		operationalModes.find((mode) => mode.id === modeId.toLowerCase()) ?? null
	);
}

export function buildMark85ReferenceProfile(
	updatedAt: Date = new Date(),
): Mark85ReferenceProfile {
	return {
		id: "mark85-nonofficial-safe-profile",
		model: "Iron Man Armor Mark LXXXV",
		version: "nonofficial-safe-reconstruction-v1",
		updatedAt: updatedAt.toISOString(),
		sources: [...sources],
		designPrinciples: [
			"durability recovered through segmented armor",
			"instant reconfiguration remains useful only behind policy gates",
			"pilot sovereignty is more important than automation",
			"local survival and telemetry continue without external network access",
			"fictional weapons, flight, and catastrophic energy modes are lockout-only",
		],
		subsystems: [...subsystems],
		operationalModes: [...operationalModes],
		hardRules: [
			"nonofficial fictional reconstruction",
			"no real weapon, flight, propulsion, or energy-device instructions",
			"no direct GPIO/CAN actuation from Mark85 profile",
			"combat and overdrive modes are lockout-only",
			"Infinity Emergency is story-only and always denied",
			"HUD and diagnostics may be allowed when policy and edge gates agree",
		],
	};
}

export function matchMark85Mode(value: string): Mark85OperationalMode | null {
	const normalized = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
	const direct = modeById(normalized);
	if (direct) return direct;
	if (normalized.includes("infinity"))
		return modeById("infinity_emergency_lockout");
	if (normalized.includes("overdrive")) return modeById("overdrive_lockout");
	if (normalized.includes("combat") || normalized.includes("weapon")) {
		return modeById("heavy_combat_lockout");
	}
	if (normalized.includes("flight")) return modeById("flight_visualization");
	if (normalized.includes("repair")) return modeById("nano_repair");
	if (normalized.includes("guardian") || normalized.includes("shield")) {
		return modeById("guardian");
	}
	if (normalized.includes("sensor") || normalized.includes("scan")) {
		return modeById("sensor_fusion");
	}
	if (normalized.includes("diagnostic") || normalized.includes("test")) {
		return modeById("diagnostics");
	}
	if (normalized.includes("standby")) return modeById("standby");
	return null;
}

export function planMark85OperationalMode(
	modeIdOrRequest: string,
	requestedBy: string,
	relay: SuitRelayKind = "wifi_lan",
): Mark85ModePlan {
	const mode = matchMark85Mode(modeIdOrRequest);
	if (!mode) {
		throw new Mark85ProfileError(
			"Mark85 mode is not recognized",
			"MARK85_MODE_NOT_FOUND",
		);
	}

	const intent = buildSuitIntent({
		kind: mode.intentKind,
		relay,
		command: mode.command,
		requestedBy,
		reason: mode.safeTranslation,
		payload: {
			mark85ModeId: mode.id,
			model: "Mark LXXXV",
			safeTranslation: mode.safeTranslation,
			blockedCapabilities: mode.blockedCapabilities,
		},
	});
	const policy = evaluateSuitPolicy(intent);
	const edgePlan = planSuitEdgeCommand({
		targetNodeId: mode.edgeTargetNodeId,
		command: mode.edgeCommand,
		requestedBy,
		reason: mode.safeTranslation,
	});

	const reasons = [
		mode.safeTranslation,
		...mode.requiredControls,
		...mode.blockedCapabilities.map((capability) => `blocked: ${capability}`),
		...policy.reasons,
		...edgePlan.reasons,
	];
	let decision: Mark85ModeDecision = mode.decision;

	if (mode.decision === "allow") {
		decision =
			policy.decision === "allow" ? edgePlan.decision : policy.decision;
	}
	if (mode.decision === "confirm") {
		decision =
			policy.decision === "deny" || edgePlan.decision === "deny"
				? "deny"
				: "confirm";
	}
	if (
		mode.decision === "deny" ||
		policy.decision === "deny" ||
		edgePlan.decision === "deny"
	) {
		decision = "deny";
	}
	if (
		policy.decision === "emergency_stop" ||
		edgePlan.decision === "emergency_stop"
	) {
		decision = "emergency_stop";
	}

	return {
		ok: decision === "allow",
		mode,
		decision,
		reasons,
		intent,
		policy,
		edgePlan,
	};
}
