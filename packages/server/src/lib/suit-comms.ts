import {
	createCipheriv,
	createDecipheriv,
	createHash,
	createHmac,
	randomBytes,
	timingSafeEqual,
} from "node:crypto";
import {
	buildSuitStatus,
	executeSuitCommand,
	getSuitTelemetry,
	type SuitCommand,
	type SuitStatus,
	type SuitTelemetry,
} from "./suit-system";

export const suitRelayKinds = ["wifi_lan", "vpn", "mesh", "satellite"] as const;
export const suitIntentKinds = [
	"telemetry",
	"health_check",
	"low_risk_message",
	"command",
	"motion",
	"high_power_motion",
	"physical_actuation",
	"weapon_like",
	"emergency_stop",
	"emergency_stop_release",
] as const;
export const suitPolicyDecisions = [
	"allow",
	"confirm",
	"deny",
	"emergency_stop",
] as const;

export type SuitRelayKind = (typeof suitRelayKinds)[number];
export type SuitIntentKind = (typeof suitIntentKinds)[number];
export type SuitPolicyDecision = (typeof suitPolicyDecisions)[number];
export type SuitReplayGuard = {
	assertFresh(nonce: string, expiresAt: string): void;
};

export interface SuitIntent {
	id: string;
	kind: SuitIntentKind;
	relay: SuitRelayKind;
	requestedBy: string;
	reason: string;
	createdAt: string;
	command?: SuitCommand;
	payload?: Record<string, unknown>;
}

export interface BuildSuitIntentInput {
	kind: SuitIntentKind;
	relay?: SuitRelayKind;
	requestedBy: string;
	reason?: string;
	command?: SuitCommand;
	payload?: Record<string, unknown>;
	now?: Date;
}

export interface SuitLocalAIState {
	id: "suit-local-ai";
	mode: "guardian" | "reduced_motion" | "safe_stop";
	risk: "low" | "medium" | "high";
	confidence: number;
	autonomy: "local_guardian" | "supervised" | "telemetry_only";
	reasons: string[];
	recommendedIntents: SuitIntentKind[];
	telemetry: SuitTelemetry;
	status: SuitStatus;
}

export interface SuitPolicyEvaluation {
	decision: SuitPolicyDecision;
	intentId: string;
	intentKind: SuitIntentKind;
	relay: SuitRelayKind;
	command?: SuitCommand;
	reasons: string[];
	controls: string[];
	requiresManualConfirm: boolean;
	expiresAt: string;
}

export interface SuitRelayChannel {
	kind: SuitRelayKind;
	label: string;
	status: "ready" | "limited" | "locked";
	trustZone: "local" | "private" | "restricted";
	latencyBudgetMs: number;
	encryptionRequired: true;
	allowedIntents: SuitIntentKind[];
	blockedIntents: SuitIntentKind[];
	guardrails: string[];
}

export interface SuitRelayNetworkSnapshot {
	id: "suit-relay-network";
	updatedAt: string;
	mode: "local-first-supervised";
	channels: SuitRelayChannel[];
	hardRules: string[];
}

export interface SuitSecureEnvelope {
	version: 1;
	algorithm: "AES-256-GCM+HMAC-SHA256";
	keyId: string;
	issuedAt: string;
	expiresAt: string;
	nonce: string;
	relay: SuitRelayKind;
	iv: string;
	aad: string;
	ciphertext: string;
	tag: string;
	signature: string;
}

export interface SuitCommsCryptoOptions {
	secret?: string;
	keyId?: string;
	ttlMs?: number;
	now?: Date;
	replayGuard?: SuitReplayGuard | false;
}

export interface SuitEnvelopeReceiveResult {
	ok: boolean;
	intent: SuitIntent;
	localAI: SuitLocalAIState;
	policy: SuitPolicyEvaluation;
	execution: ReturnType<typeof executeSuitCommand> | null;
	audit: {
		id: string;
		at: string;
		relay: SuitRelayKind;
		decision: SuitPolicyDecision;
		intentId: string;
		executed: boolean;
	};
}

export class SuitCommsError extends Error {
	constructor(
		message: string,
		readonly code: string,
	) {
		super(message);
		this.name = "SuitCommsError";
	}
}

export class InMemorySuitReplayGuard implements SuitReplayGuard {
	private seen = new Map<string, number>();

	assertFresh(nonce: string, expiresAt: string): void {
		const now = Date.now();
		for (const [key, expiry] of this.seen) {
			if (expiry <= now) this.seen.delete(key);
		}

		if (this.seen.has(nonce)) {
			throw new SuitCommsError("Replay detected", "SUIT_REPLAY_DETECTED");
		}

		const expiry = Date.parse(expiresAt);
		if (!Number.isFinite(expiry) || expiry <= now) {
			throw new SuitCommsError("Envelope expired", "SUIT_ENVELOPE_EXPIRED");
		}

		this.seen.set(nonce, expiry);
	}
}

const defaultReplayGuard = new InMemorySuitReplayGuard();
const suitCommands: readonly SuitCommand[] = [
	"status",
	"scan",
	"repair",
	"shield",
	"cloak",
	"standby",
	"calibrate",
];
const allowedCommandSet = new Set<SuitCommand>(["status", "scan", "standby"]);
const confirmCommandSet = new Set<SuitCommand>([
	"repair",
	"shield",
	"cloak",
	"calibrate",
]);
const safeRelayIntents = new Set<SuitIntentKind>([
	"telemetry",
	"health_check",
	"low_risk_message",
	"emergency_stop",
]);
const physicalIntentKinds = new Set<SuitIntentKind>([
	"motion",
	"high_power_motion",
	"physical_actuation",
	"weapon_like",
	"emergency_stop_release",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSuitRelayKind(value: unknown): value is SuitRelayKind {
	return (
		typeof value === "string" && suitRelayKinds.includes(value as SuitRelayKind)
	);
}

function isSuitIntentKind(value: unknown): value is SuitIntentKind {
	return (
		typeof value === "string" &&
		suitIntentKinds.includes(value as SuitIntentKind)
	);
}

export function isSuitCommand(value: unknown): value is SuitCommand {
	return (
		typeof value === "string" && suitCommands.includes(value as SuitCommand)
	);
}

function toBase64Url(buffer: Buffer): string {
	return buffer
		.toString("base64")
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
	const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
	const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
	return Buffer.from(`${normalized}${padding}`, "base64");
}

function stableJson(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(stableJson).join(",")}]`;
	}
	if (isRecord(value)) {
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function cryptoKey(secret?: string): Buffer {
	const source =
		secret ||
		process.env.ELYSIA_SUIT_COMMS_KEY ||
		"elysia-local-dev-suit-comms-key";
	return createHash("sha256").update(source).digest();
}

function defaultKeyId(secret?: string): string {
	const source =
		secret || process.env.ELYSIA_SUIT_COMMS_KEY || "local-dev-suit-comms";
	return `sk-${createHash("sha256").update(source).digest("hex").slice(0, 12)}`;
}

function signableEnvelope(envelope: Omit<SuitSecureEnvelope, "signature">) {
	return [
		envelope.version,
		envelope.algorithm,
		envelope.keyId,
		envelope.issuedAt,
		envelope.expiresAt,
		envelope.nonce,
		envelope.relay,
		envelope.iv,
		envelope.aad,
		envelope.ciphertext,
		envelope.tag,
	].join("\n");
}

function signEnvelope(
	envelope: Omit<SuitSecureEnvelope, "signature">,
	secret?: string,
): string {
	return toBase64Url(
		createHmac("sha256", cryptoKey(secret))
			.update(signableEnvelope(envelope))
			.digest(),
	);
}

function assertEnvelopeSignature(
	envelope: SuitSecureEnvelope,
	secret?: string,
): void {
	const { signature: _signature, ...unsigned } = envelope;
	const expected = fromBase64Url(signEnvelope(unsigned, secret));
	const actual = fromBase64Url(envelope.signature);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
		throw new SuitCommsError(
			"Envelope signature mismatch",
			"SUIT_SIGNATURE_INVALID",
		);
	}
}

function assertEnvelopeShape(
	value: unknown,
): asserts value is SuitSecureEnvelope {
	if (!isRecord(value)) {
		throw new SuitCommsError("Envelope is invalid", "SUIT_ENVELOPE_INVALID");
	}
	if (
		value.version !== 1 ||
		value.algorithm !== "AES-256-GCM+HMAC-SHA256" ||
		!isSuitRelayKind(value.relay) ||
		typeof value.keyId !== "string" ||
		typeof value.issuedAt !== "string" ||
		typeof value.expiresAt !== "string" ||
		typeof value.nonce !== "string" ||
		typeof value.iv !== "string" ||
		typeof value.aad !== "string" ||
		typeof value.ciphertext !== "string" ||
		typeof value.tag !== "string" ||
		typeof value.signature !== "string"
	) {
		throw new SuitCommsError("Envelope is invalid", "SUIT_ENVELOPE_INVALID");
	}
}

function normalizeReason(reason?: string): string {
	const normalized = String(reason || "operator request")
		.replaceAll(String.fromCharCode(0), "")
		.trim();
	return normalized.slice(0, 240) || "operator request";
}

function randomId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${toBase64Url(randomBytes(6))}`;
}

export function buildSuitIntent(input: BuildSuitIntentInput): SuitIntent {
	if (!isSuitIntentKind(input.kind)) {
		throw new SuitCommsError("Intent kind is invalid", "SUIT_INTENT_INVALID");
	}
	const relay = input.relay ?? "wifi_lan";
	if (!isSuitRelayKind(relay)) {
		throw new SuitCommsError("Relay kind is invalid", "SUIT_RELAY_INVALID");
	}
	if (input.command !== undefined && !isSuitCommand(input.command)) {
		throw new SuitCommsError("Suit command is invalid", "SUIT_COMMAND_INVALID");
	}
	if (input.kind === "command" && !input.command) {
		throw new SuitCommsError(
			"Command intent requires a command",
			"SUIT_COMMAND_REQUIRED",
		);
	}

	return {
		id: randomId("sint"),
		kind: input.kind,
		relay,
		requestedBy: input.requestedBy.trim() || "operator",
		reason: normalizeReason(input.reason),
		createdAt: (input.now ?? new Date()).toISOString(),
		...(input.command ? { command: input.command } : {}),
		...(input.payload ? { payload: input.payload } : {}),
	};
}

export function evaluateSuitLocalAI(
	status: SuitStatus = buildSuitStatus(),
): SuitLocalAIState {
	const telemetry = status.telemetry;
	const reasons: string[] = [];
	let score = 0;

	if (telemetry.oxygen < 94) {
		score += 4;
		reasons.push("oxygen below safe threshold");
	} else if (telemetry.oxygen < 96) {
		score += 2;
		reasons.push("oxygen requires supervision");
	}
	if (telemetry.neuralStability < 0.985) {
		score += 4;
		reasons.push("neural stability below guardian threshold");
	} else if (telemetry.neuralStability < 0.995) {
		score += 2;
		reasons.push("neural stability requires supervision");
	}
	if (telemetry.internalTemp > 38) {
		score += 4;
		reasons.push("internal temperature is elevated");
	} else if (telemetry.internalTemp > 37.4) {
		score += 2;
		reasons.push("internal temperature requires watch");
	}
	if (telemetry.energyLevel < 10) {
		score += 4;
		reasons.push("energy reserve is critically low");
	} else if (telemetry.energyLevel < 25) {
		score += 2;
		reasons.push("energy reserve is low");
	}
	if (status.pilotStress > 70 || status.nearbyRisk === "high") {
		score += 3;
		reasons.push("pilot or nearby risk requires motion reduction");
	} else if (status.pilotStress > 45 || status.nearbyRisk === "medium") {
		score += 1;
		reasons.push("pilot or nearby risk requires monitoring");
	}

	if (reasons.length === 0) reasons.push("guardian telemetry is nominal");

	const risk = score >= 5 ? "high" : score >= 2 ? "medium" : "low";
	const mode =
		risk === "high"
			? "safe_stop"
			: risk === "medium"
				? "reduced_motion"
				: "guardian";
	const autonomy =
		mode === "safe_stop"
			? "telemetry_only"
			: mode === "reduced_motion"
				? "supervised"
				: "local_guardian";

	return {
		id: "suit-local-ai",
		mode,
		risk,
		confidence: Number(Math.max(0.72, 0.98 - score * 0.04).toFixed(2)),
		autonomy,
		reasons,
		recommendedIntents:
			mode === "safe_stop"
				? ["telemetry", "health_check", "emergency_stop"]
				: ["telemetry", "health_check", "low_risk_message", "command"],
		telemetry,
		status,
	};
}

export function buildSuitRelayNetworkSnapshot(
	now: Date = new Date(),
): SuitRelayNetworkSnapshot {
	return {
		id: "suit-relay-network",
		updatedAt: now.toISOString(),
		mode: "local-first-supervised",
		hardRules: [
			"encrypted envelopes only",
			"no direct actuator control from relays",
			"satellite relay is telemetry-first",
			"policy gate before execution",
			"local safety controller has final authority",
		],
		channels: [
			{
				kind: "wifi_lan",
				label: "Local Wi-Fi / LAN",
				status: "ready",
				trustZone: "local",
				latencyBudgetMs: 60,
				encryptionRequired: true,
				allowedIntents: [
					"telemetry",
					"health_check",
					"low_risk_message",
					"command",
					"emergency_stop",
				],
				blockedIntents: [
					"motion",
					"high_power_motion",
					"physical_actuation",
					"weapon_like",
					"emergency_stop_release",
				],
				guardrails: [
					"same LAN or explicit VPN only",
					"manual confirmation for risky commands",
				],
			},
			{
				kind: "vpn",
				label: "Private VPN",
				status: "ready",
				trustZone: "private",
				latencyBudgetMs: 180,
				encryptionRequired: true,
				allowedIntents: [
					"telemetry",
					"health_check",
					"low_risk_message",
					"command",
					"emergency_stop",
				],
				blockedIntents: [
					"motion",
					"high_power_motion",
					"physical_actuation",
					"weapon_like",
					"emergency_stop_release",
				],
				guardrails: [
					"private route only",
					"confirm-required commands are not auto-executed",
				],
			},
			{
				kind: "mesh",
				label: "Local Mesh Relay",
				status: "limited",
				trustZone: "private",
				latencyBudgetMs: 260,
				encryptionRequired: true,
				allowedIntents: [
					"telemetry",
					"health_check",
					"low_risk_message",
					"command",
					"emergency_stop",
				],
				blockedIntents: [
					"motion",
					"high_power_motion",
					"physical_actuation",
					"weapon_like",
					"emergency_stop_release",
				],
				guardrails: ["node identity required", "relay cannot override policy"],
			},
			{
				kind: "satellite",
				label: "Long-range Satellite-style Relay",
				status: "limited",
				trustZone: "restricted",
				latencyBudgetMs: 1600,
				encryptionRequired: true,
				allowedIntents: [
					"telemetry",
					"health_check",
					"low_risk_message",
					"emergency_stop",
				],
				blockedIntents: [
					"command",
					"motion",
					"high_power_motion",
					"physical_actuation",
					"weapon_like",
					"emergency_stop_release",
				],
				guardrails: [
					"no direct actuation",
					"no stop release",
					"telemetry-first fallback",
				],
			},
		],
	};
}

export function evaluateSuitPolicy(
	intent: SuitIntent,
	localAI: SuitLocalAIState = evaluateSuitLocalAI(),
	now: Date = new Date(),
): SuitPolicyEvaluation {
	const reasons: string[] = [];
	const controls = [
		"authenticated neural session",
		"encrypted envelope",
		"replay protection",
		"active suit policy",
		"local safety controller",
	];
	let decision: SuitPolicyDecision = "allow";

	if (intent.kind === "emergency_stop") {
		decision = "emergency_stop";
		reasons.push("emergency stop is safety-preserving and always local-final");
	} else if (physicalIntentKinds.has(intent.kind)) {
		decision = "deny";
		reasons.push(
			"physical, high-power, weapon-like, or stop-release intent is not permitted",
		);
	} else if (
		intent.relay === "satellite" &&
		!safeRelayIntents.has(intent.kind)
	) {
		decision = "deny";
		reasons.push(
			"satellite relay is limited to telemetry, health, low-risk messages, and emergency stop",
		);
	} else if (
		localAI.mode === "safe_stop" &&
		intent.kind !== "telemetry" &&
		intent.kind !== "health_check"
	) {
		decision = "deny";
		reasons.push("suit-local AI is in safe-stop mode");
	} else if (intent.kind === "command") {
		if (!intent.command) {
			decision = "deny";
			reasons.push("command intent is missing command payload");
		} else if (allowedCommandSet.has(intent.command)) {
			decision = "allow";
			reasons.push("command is low-risk and simulation-only");
		} else if (confirmCommandSet.has(intent.command)) {
			decision = "confirm";
			reasons.push("command requires manual confirmation before execution");
		} else {
			decision = "deny";
			reasons.push("command is not recognized by the suit policy");
		}
	} else {
		reasons.push("intent is informational or low-risk");
	}

	if (decision === "allow" && localAI.mode === "reduced_motion") {
		decision = "confirm";
		reasons.push("local AI requires supervised operation");
	}

	return {
		decision,
		intentId: intent.id,
		intentKind: intent.kind,
		relay: intent.relay,
		...(intent.command ? { command: intent.command } : {}),
		reasons,
		controls,
		requiresManualConfirm: decision === "confirm",
		expiresAt: new Date(now.getTime() + 30_000).toISOString(),
	};
}

export function sealSuitEnvelope(
	payload: SuitIntent,
	options: SuitCommsCryptoOptions = {},
): SuitSecureEnvelope {
	const now = options.now ?? new Date();
	const issuedAt = now.toISOString();
	const expiresAt = new Date(
		now.getTime() + (options.ttlMs ?? 30_000),
	).toISOString();
	const nonce = toBase64Url(randomBytes(16));
	const iv = randomBytes(12);
	const keyId = options.keyId ?? defaultKeyId(options.secret);
	const aad = toBase64Url(
		Buffer.from(
			stableJson({
				version: 1,
				keyId,
				issuedAt,
				expiresAt,
				nonce,
				relay: payload.relay,
			}),
			"utf8",
		),
	);

	const cipher = createCipheriv("aes-256-gcm", cryptoKey(options.secret), iv);
	cipher.setAAD(Buffer.from(aad, "utf8"));
	const ciphertext = Buffer.concat([
		cipher.update(stableJson(payload), "utf8"),
		cipher.final(),
	]);
	const unsigned: Omit<SuitSecureEnvelope, "signature"> = {
		version: 1,
		algorithm: "AES-256-GCM+HMAC-SHA256",
		keyId,
		issuedAt,
		expiresAt,
		nonce,
		relay: payload.relay,
		iv: toBase64Url(iv),
		aad,
		ciphertext: toBase64Url(ciphertext),
		tag: toBase64Url(cipher.getAuthTag()),
	};

	return {
		...unsigned,
		signature: signEnvelope(unsigned, options.secret),
	};
}

export function openSuitEnvelope(
	value: unknown,
	options: SuitCommsCryptoOptions = {},
): SuitIntent {
	assertEnvelopeShape(value);
	const envelope = value;
	assertEnvelopeSignature(envelope, options.secret);

	const replayGuard =
		options.replayGuard === false
			? null
			: (options.replayGuard ?? defaultReplayGuard);
	replayGuard?.assertFresh(envelope.nonce, envelope.expiresAt);

	if (Date.parse(envelope.expiresAt) <= (options.now ?? new Date()).getTime()) {
		throw new SuitCommsError("Envelope expired", "SUIT_ENVELOPE_EXPIRED");
	}

	const decipher = createDecipheriv(
		"aes-256-gcm",
		cryptoKey(options.secret),
		fromBase64Url(envelope.iv),
	);
	decipher.setAAD(Buffer.from(envelope.aad, "utf8"));
	decipher.setAuthTag(fromBase64Url(envelope.tag));
	const plaintext = Buffer.concat([
		decipher.update(fromBase64Url(envelope.ciphertext)),
		decipher.final(),
	]).toString("utf8");
	const parsed = JSON.parse(plaintext) as unknown;
	const intent = assertSuitIntent(parsed);
	if (intent.relay !== envelope.relay) {
		throw new SuitCommsError("Relay mismatch", "SUIT_RELAY_MISMATCH");
	}
	return intent;
}

function assertSuitIntent(value: unknown): SuitIntent {
	if (!isRecord(value)) {
		throw new SuitCommsError("Intent is invalid", "SUIT_INTENT_INVALID");
	}
	const relay = value.relay;
	const kind = value.kind;
	const command = value.command;
	if (
		typeof value.id !== "string" ||
		!isSuitIntentKind(kind) ||
		!isSuitRelayKind(relay) ||
		typeof value.requestedBy !== "string" ||
		typeof value.reason !== "string" ||
		typeof value.createdAt !== "string"
	) {
		throw new SuitCommsError("Intent is invalid", "SUIT_INTENT_INVALID");
	}
	if (command !== undefined && !isSuitCommand(command)) {
		throw new SuitCommsError(
			"Intent command is invalid",
			"SUIT_COMMAND_INVALID",
		);
	}
	return {
		id: value.id,
		kind,
		relay,
		requestedBy: value.requestedBy,
		reason: value.reason,
		createdAt: value.createdAt,
		...(command ? { command } : {}),
		...(isRecord(value.payload) ? { payload: value.payload } : {}),
	};
}

export function receiveSuitEnvelope(
	envelope: unknown,
	options: SuitCommsCryptoOptions = {},
): SuitEnvelopeReceiveResult {
	const intent = openSuitEnvelope(envelope, options);
	const localAI = evaluateSuitLocalAI();
	const policy = evaluateSuitPolicy(intent, localAI, options.now ?? new Date());
	let execution: ReturnType<typeof executeSuitCommand> | null = null;

	if (
		policy.decision === "allow" &&
		intent.kind === "command" &&
		intent.command
	) {
		execution = executeSuitCommand(intent.command);
	}
	if (policy.decision === "emergency_stop") {
		execution = executeSuitCommand("standby");
	}

	return {
		ok: policy.decision === "allow" || policy.decision === "emergency_stop",
		intent,
		localAI,
		policy,
		execution,
		audit: {
			id: randomId("saudit"),
			at: new Date().toISOString(),
			relay: intent.relay,
			decision: policy.decision,
			intentId: intent.id,
			executed: execution !== null,
		},
	};
}

export function buildSuitCommsStatus() {
	const status = buildSuitStatus();
	return {
		status,
		localAI: evaluateSuitLocalAI(status),
		network: buildSuitRelayNetworkSnapshot(),
		crypto: {
			algorithm: "AES-256-GCM+HMAC-SHA256",
			keyConfigured: Boolean(process.env.ELYSIA_SUIT_COMMS_KEY),
			replayProtection: true,
			envelopeTtlMs: 30_000,
		},
		telemetry: getSuitTelemetry(),
	};
}
