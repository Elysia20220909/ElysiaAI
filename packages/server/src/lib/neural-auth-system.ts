import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { CONFIG } from "./constants";
import { secureVault } from "./secure-vault";

export type NeuralThreatLevel = "quiet" | "watch" | "elevated" | "locked";

export interface NeuralAuthEvent {
	id: string;
	type: "token.verify" | "token.reject" | "dev.login" | "intrusion.signal";
	at: string;
	identity: string;
	neuralSignature: string;
	threatLevel: NeuralThreatLevel;
	detail: string;
	sealedPayload: string;
}

const events: NeuralAuthEvent[] = [];
const MAX_EVENTS = 80;

function hash(value: string) {
	return createHash("sha256").update(value).digest("hex");
}

export function createNeuralSignature(identity: string, seed = randomBytes(8)) {
	return `NS-${hash(`${identity}:${seed.toString("hex")}`)
		.slice(0, 16)
		.toUpperCase()}`;
}

export function recordNeuralAuthEvent(
	event: Omit<NeuralAuthEvent, "id" | "at" | "sealedPayload"> & {
		payload?: unknown;
	},
): NeuralAuthEvent {
	const at = new Date().toISOString();
	const sealedPayload = secureVault.encrypt(
		JSON.stringify({
			identity: event.identity,
			detail: event.detail,
			payload: event.payload ?? null,
			at,
		}),
	);
	const record: NeuralAuthEvent = {
		id: `nae-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
		at,
		type: event.type,
		identity: event.identity,
		neuralSignature: event.neuralSignature,
		threatLevel: event.threatLevel,
		detail: event.detail,
		sealedPayload,
	};

	events.unshift(record);
	if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
	return record;
}

export function verifyNeuralAccessToken(authorization: string | null) {
	const auth = authorization || "";
	if (!auth.startsWith("Bearer ")) {
		const neuralSignature = createNeuralSignature("anonymous");
		recordNeuralAuthEvent({
			type: "token.reject",
			identity: "anonymous",
			neuralSignature,
			threatLevel: "watch",
			detail: "Missing bearer token",
		});
		throw new Error("Missing Bearer token");
	}

	try {
		const payload = jwt.verify(
			auth.substring(7),
			CONFIG.JWT_SECRET,
		) as jwt.JwtPayload & {
			userId?: string;
			username?: string;
			role?: string;
		};
		const identity = String(payload.username || payload.userId || "operator");
		const neuralSignature = createNeuralSignature(
			identity,
			Buffer.from(String(payload.iat || Date.now())),
		);
		recordNeuralAuthEvent({
			type: "token.verify",
			identity,
			neuralSignature,
			threatLevel: "quiet",
			detail: "Token lattice verified",
			payload: {
				role: payload.role || "user",
				expiresAt: payload.exp
					? new Date(payload.exp * 1000).toISOString()
					: null,
			},
		});

		return {
			userId: String(payload.userId || ""),
			username: identity,
			role: String(payload.role || "user"),
			expiresAt: payload.exp
				? new Date(payload.exp * 1000).toISOString()
				: null,
			neuralSignature,
		};
	} catch {
		const neuralSignature = createNeuralSignature("invalid");
		recordNeuralAuthEvent({
			type: "token.reject",
			identity: "invalid",
			neuralSignature,
			threatLevel: "elevated",
			detail: "Invalid or expired token",
		});
		throw new Error("Invalid or expired token");
	}
}

export function buildNeuralAuthStatus(authorization: string | null) {
	const session = verifyNeuralAccessToken(authorization);
	return {
		status: "linked",
		encryption: "AES-256-GCM sealed local token lattice",
		intrusionDetection: {
			status: events.some((event) => event.threatLevel === "locked")
				? "locked"
				: events.some((event) => event.threatLevel === "elevated")
					? "elevated"
					: "watching",
			recentSignals: events
				.slice(0, 8)
				.map(({ sealedPayload: _sealed, ...event }) => event),
		},
		session,
		hardRules: [
			"local token verification",
			"encrypted audit payloads",
			"no credential echo",
			"production auto-login disabled",
		],
	};
}

export function getNeuralAuthEvents() {
	return events.map(({ sealedPayload: _sealed, ...event }) => event);
}
