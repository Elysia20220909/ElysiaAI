import { buildSuitIntent, evaluateSuitPolicy } from "./suit-comms";
import {
	planSuitEdgeCommand,
	type SuitEdgeCommandPlan,
} from "./suit-edge-runtime";
import {
	planSuitHardwareOperation,
	type SuitHardwarePlan,
} from "./suit-hardware-adapter";

export const hololensCommandIds = [
	"initiate_hud",
	"activate_overlay",
	"deactivate_overlay",
	"scan_faces",
	"clear_scan",
	"reset_hud",
	"target_reticle",
	"toggle_overlay",
] as const;

export type HoloLensCommandId = (typeof hololensCommandIds)[number];
export type HoloLensCommandDecision = "allow" | "confirm" | "deny";

export interface HoloLensVoiceCommand {
	id: HoloLensCommandId;
	phrase: string;
	aliases: string[];
	category: "hud" | "vision" | "physical_bridge";
	action: string;
	decision: HoloLensCommandDecision;
	requiresCamera: boolean;
	requiresPhysicalBridge: boolean;
	localOnly: boolean;
	notes: string[];
}

export interface HoloLensReferenceProfile {
	id: "hololens-ironman-reference";
	source: {
		repository: string;
		license: "MIT";
		readAt: string;
	};
	architectureSignals: string[];
	voiceCommands: HoloLensVoiceCommand[];
	hardRules: string[];
}

export interface HoloLensCommandPlan {
	ok: boolean;
	phrase: string;
	matched: HoloLensVoiceCommand | null;
	decision: HoloLensCommandDecision;
	reasons: string[];
	intent: ReturnType<typeof buildSuitIntent> | null;
	policy: ReturnType<typeof evaluateSuitPolicy> | null;
	edgePlan: SuitEdgeCommandPlan | null;
	hardwarePlan: SuitHardwarePlan | null;
}

const REFERENCE_REPOSITORY = "https://github.com/xSmoking/Hololens_IronMan.git";
const NORMALIZE_PATTERN = /[^a-z0-9]+/g;

const voiceCommands: readonly HoloLensVoiceCommand[] = [
	{
		id: "initiate_hud",
		phrase: "Jarvis Initiate",
		aliases: ["Friday Initiate", "Elysia Initiate", "HUD Initiate"],
		category: "physical_bridge",
		action: "show HUD and prepare helmet bridge",
		decision: "confirm",
		requiresCamera: false,
		requiresPhysicalBridge: true,
		localOnly: true,
		notes: ["physical helmet bridge remains confirm-only"],
	},
	{
		id: "activate_overlay",
		phrase: "Jarvis Activate",
		aliases: ["Friday Activate", "Elysia Activate", "Activate Flight Overlay"],
		category: "hud",
		action: "show flight-style HUD overlay",
		decision: "allow",
		requiresCamera: false,
		requiresPhysicalBridge: false,
		localOnly: true,
		notes: ["overlay only; no propulsion or motion control"],
	},
	{
		id: "deactivate_overlay",
		phrase: "Jarvis Deactivate",
		aliases: ["Friday Deactivate", "Elysia Deactivate"],
		category: "hud",
		action: "hide flight-style HUD overlay",
		decision: "allow",
		requiresCamera: false,
		requiresPhysicalBridge: false,
		localOnly: true,
		notes: ["visual mode only"],
	},
	{
		id: "scan_faces",
		phrase: "Jarvis Scan",
		aliases: ["Friday Scan", "Elysia Scan", "Scan Faces"],
		category: "vision",
		action: "start local privacy-preserving vision scan",
		decision: "confirm",
		requiresCamera: true,
		requiresPhysicalBridge: false,
		localOnly: true,
		notes: ["camera use requires explicit confirmation", "no cloud face API"],
	},
	{
		id: "clear_scan",
		phrase: "Jarvis Clear",
		aliases: ["Friday Clear", "Elysia Clear", "Clear Scan"],
		category: "vision",
		action: "clear scan overlays and derived face panels",
		decision: "allow",
		requiresCamera: false,
		requiresPhysicalBridge: false,
		localOnly: true,
		notes: ["removes derived UI artifacts"],
	},
	{
		id: "reset_hud",
		phrase: "Jarvis Reset",
		aliases: ["Friday Reset", "Elysia Reset", "Reset HUD"],
		category: "physical_bridge",
		action: "reset HUD and request helmet bridge safe state",
		decision: "confirm",
		requiresCamera: false,
		requiresPhysicalBridge: true,
		localOnly: true,
		notes: ["physical bridge safe-state remains confirm-only"],
	},
	{
		id: "target_reticle",
		phrase: "Jarvis Target",
		aliases: ["Friday Target", "Elysia Target", "Target Reticle"],
		category: "hud",
		action: "show gaze-following target reticle",
		decision: "allow",
		requiresCamera: false,
		requiresPhysicalBridge: false,
		localOnly: true,
		notes: ["reticle is visualization only; no weapon targeting"],
	},
	{
		id: "toggle_overlay",
		phrase: "Jarvis Toggle",
		aliases: ["Friday Toggle", "Elysia Toggle", "Toggle HUD"],
		category: "hud",
		action: "toggle HUD overlay visibility",
		decision: "allow",
		requiresCamera: false,
		requiresPhysicalBridge: false,
		localOnly: true,
		notes: ["visual mode only"],
	},
];

function normalizePhrase(value: string): string {
	return value.toLowerCase().replace(NORMALIZE_PATTERN, " ").trim();
}

function commandPhrases(command: HoloLensVoiceCommand): string[] {
	return [command.phrase, ...command.aliases].map(normalizePhrase);
}

export function buildHoloLensReferenceProfile(
	readAt: Date = new Date(),
): HoloLensReferenceProfile {
	return {
		id: "hololens-ironman-reference",
		source: {
			repository: REFERENCE_REPOSITORY,
			license: "MIT",
			readAt: readAt.toISOString(),
		},
		architectureSignals: [
			"keyword voice commands route to HUD events",
			"gaze and tap can trigger scan intent",
			"targeting reticle follows head pose as visualization",
			"physical helmet bridge is a separate confirm-required boundary",
			"face scan must be local-only and privacy-gated",
		],
		voiceCommands: [...voiceCommands],
		hardRules: [
			"do not copy cloud face API keys",
			"do not turn targeting reticles into weapon control",
			"camera scans require explicit confirmation",
			"physical bridge commands require policy and hardware gates",
			"HUD flight overlay is not flight control",
		],
	};
}

export function matchHoloLensVoiceCommand(
	phrase: string,
): HoloLensVoiceCommand | null {
	const normalized = normalizePhrase(phrase);
	if (!normalized) return null;
	return (
		voiceCommands.find((command) =>
			commandPhrases(command).includes(normalized),
		) ?? null
	);
}

function edgePlanFor(command: HoloLensVoiceCommand, requestedBy: string) {
	if (command.category === "vision") {
		return planSuitEdgeCommand({
			targetNodeId: "sensor-mcu-helmet",
			command:
				command.id === "scan_faces" ? "calibrate_sensor" : "read_telemetry",
			requestedBy,
			reason: command.action,
		});
	}

	if (command.requiresPhysicalBridge) {
		return planSuitEdgeCommand({
			targetNodeId: "safety-relay",
			command: "arm_safety_relay",
			requestedBy,
			reason: command.action,
		});
	}

	return planSuitEdgeCommand({
		targetNodeId: "hud-renderer",
		command:
			command.id === "target_reticle" ? "set_led_pattern" : "read_telemetry",
		requestedBy,
		reason: command.action,
	});
}

function hardwarePlanFor(
	command: HoloLensVoiceCommand,
	requestedBy: string,
): SuitHardwarePlan | null {
	if (!command.requiresPhysicalBridge) return null;
	return planSuitHardwareOperation({
		operation: "gpio_write",
		targetNodeId: "safety-relay",
		requestedBy,
		reason: command.action,
		gpio: {
			chip: "gpiochip0",
			line: 27,
			value: command.id === "reset_hud" ? 0 : 1,
		},
	});
}

export function planHoloLensVoiceCommand(
	phrase: string,
	requestedBy: string,
): HoloLensCommandPlan {
	const matched = matchHoloLensVoiceCommand(phrase);
	if (!matched) {
		return {
			ok: false,
			phrase,
			matched: null,
			decision: "deny",
			reasons: ["voice phrase is not registered"],
			intent: null,
			policy: null,
			edgePlan: null,
			hardwarePlan: null,
		};
	}

	const intent = buildSuitIntent({
		kind: matched.decision === "confirm" ? "low_risk_message" : "command",
		relay: "wifi_lan",
		command: matched.decision === "allow" ? "status" : undefined,
		requestedBy,
		reason: matched.action,
		payload: {
			hololensCommandId: matched.id,
			category: matched.category,
			localOnly: matched.localOnly,
		},
	});
	const policy = evaluateSuitPolicy(intent);
	const edgePlan = edgePlanFor(matched, requestedBy);
	const hardwarePlan = hardwarePlanFor(matched, requestedBy);
	const reasons = [
		...matched.notes,
		...policy.reasons,
		...edgePlan.reasons,
		...(hardwarePlan?.reasons ?? []),
	];
	let decision = matched.decision;

	if (policy.decision === "deny" || edgePlan.decision === "deny") {
		decision = "deny";
	}
	if (hardwarePlan?.decision === "deny") {
		decision = "confirm";
		reasons.push(
			"hardware bridge is unavailable until allowlist and arm token are configured",
		);
	}

	return {
		ok: decision === "allow",
		phrase,
		matched,
		decision,
		reasons,
		intent,
		policy,
		edgePlan,
		hardwarePlan,
	};
}
