import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { CONFIG } from "./constants";
import type { CoreMessage } from "./elysia-core";

export const ELYSIA_CORE_PROTOCOL = {
	name: "Elysia Core Protocol",
	version: "ECP/1.0",
	maxClockSkewMs: 5 * 60 * 1000,
	maxPayloadBytes: 64 * 1024,
} as const;

export type ElysiaCoreFrameType =
	| "hello"
	| "chat.request"
	| "chat.accepted"
	| "chat.delta"
	| "chat.complete"
	| "telemetry"
	| "error";

export type ElysiaCoreFrame<TPayload = unknown> = {
	protocol: typeof ELYSIA_CORE_PROTOCOL.version;
	type: ElysiaCoreFrameType;
	requestId: string;
	sessionId: string;
	sequence: number;
	issuedAt: string;
	actor: string;
	payload: TPayload;
	signature: string;
};

export type ChatRequestPayload = {
	messages: CoreMessage[];
	stream: boolean;
	client: {
		name: string;
		surface: "web" | "api" | "desktop";
	};
};

export type NormalizedProtocolRequest = {
	frame: ElysiaCoreFrame<ChatRequestPayload>;
	messages: CoreMessage[];
	sessionId: string;
	requestId: string;
	stream: boolean;
	sequence: number;
};

const lastSequenceBySession = new Map<string, number>();

function canonicalPayload(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((item) => canonicalPayload(item)).join(",")}]`;
	}

	if (value && typeof value === "object") {
		return `{${Object.keys(value as Record<string, unknown>)
			.sort()
			.map(
				(key) =>
					`${JSON.stringify(key)}:${canonicalPayload(
						(value as Record<string, unknown>)[key],
					)}`,
			)
			.join(",")}}`;
	}

	return JSON.stringify(value);
}

function signingBase(frame: Omit<ElysiaCoreFrame, "signature">) {
	return [
		frame.protocol,
		frame.type,
		frame.requestId,
		frame.sessionId,
		String(frame.sequence),
		frame.issuedAt,
		frame.actor,
		canonicalPayload(frame.payload),
	].join("\n");
}

export function signCoreFrame(frame: Omit<ElysiaCoreFrame, "signature">) {
	return createHmac("sha256", CONFIG.JWT_SECRET)
		.update(signingBase(frame))
		.digest("base64url");
}

export function buildCoreFrame<TPayload>(
	input: Omit<ElysiaCoreFrame<TPayload>, "protocol" | "signature"> & {
		protocol?: typeof ELYSIA_CORE_PROTOCOL.version;
	},
): ElysiaCoreFrame<TPayload> {
	const unsigned = {
		protocol: input.protocol || ELYSIA_CORE_PROTOCOL.version,
		type: input.type,
		requestId: input.requestId,
		sessionId: input.sessionId,
		sequence: input.sequence,
		issuedAt: input.issuedAt,
		actor: input.actor,
		payload: input.payload,
	};

	return {
		...unsigned,
		signature: signCoreFrame(unsigned),
	};
}

function signaturesMatch(expected: string, actual: string) {
	const expectedBuffer = Buffer.from(expected);
	const actualBuffer = Buffer.from(actual || "");
	return (
		expectedBuffer.length === actualBuffer.length &&
		timingSafeEqual(expectedBuffer, actualBuffer)
	);
}

export function verifyCoreFrame(frame: ElysiaCoreFrame, expectedActor: string) {
	if (frame.protocol !== ELYSIA_CORE_PROTOCOL.version) {
		throw new Error("Unsupported Elysia Core protocol version");
	}
	if (!frame.requestId || !frame.sessionId) {
		throw new Error("Protocol frame is missing request or session id");
	}
	if (!Number.isInteger(frame.sequence) || frame.sequence < 1) {
		throw new Error("Protocol sequence must be a positive integer");
	}
	if (frame.actor !== expectedActor) {
		throw new Error("Protocol actor does not match authenticated identity");
	}

	const issuedAt = Date.parse(frame.issuedAt);
	if (!Number.isFinite(issuedAt)) {
		throw new Error("Protocol timestamp is invalid");
	}
	if (Math.abs(Date.now() - issuedAt) > ELYSIA_CORE_PROTOCOL.maxClockSkewMs) {
		throw new Error("Protocol timestamp is outside the accepted window");
	}

	const payloadBytes = new TextEncoder().encode(
		JSON.stringify(frame.payload ?? null),
	).byteLength;
	if (payloadBytes > ELYSIA_CORE_PROTOCOL.maxPayloadBytes) {
		throw new Error("Protocol payload is too large");
	}

	const { signature: _signature, ...unsigned } = frame;
	const expected = signCoreFrame(unsigned);
	if (!signaturesMatch(expected, frame.signature)) {
		throw new Error("Protocol signature mismatch");
	}

	const lastSequence = lastSequenceBySession.get(frame.sessionId) || 0;
	if (frame.sequence <= lastSequence) {
		throw new Error("Protocol replay detected");
	}
	lastSequenceBySession.set(frame.sessionId, frame.sequence);
}

export function normalizeProtocolRequest(
	body: {
		protocolFrame?: ElysiaCoreFrame<ChatRequestPayload>;
		messages?: unknown;
		sessionId?: string;
		stream?: boolean;
	},
	actor: string,
	messages: CoreMessage[],
): NormalizedProtocolRequest {
	const incomingFrame = body.protocolFrame;
	if (incomingFrame) {
		verifyCoreFrame(incomingFrame, actor);
		if (incomingFrame.type !== "chat.request") {
			throw new Error("Protocol frame type must be chat.request");
		}
		return {
			frame: incomingFrame,
			messages,
			sessionId: incomingFrame.sessionId,
			requestId: incomingFrame.requestId,
			stream: incomingFrame.payload.stream,
			sequence: incomingFrame.sequence,
		};
	}

	const sessionId = body.sessionId || `core-${actor}`;
	const requestId = randomUUID();
	const frame = buildCoreFrame<ChatRequestPayload>({
		type: "chat.request",
		requestId,
		sessionId,
		sequence: 1,
		issuedAt: new Date().toISOString(),
		actor,
		payload: {
			messages,
			stream: body.stream ?? true,
			client: {
				name: "legacy-json",
				surface: "api",
			},
		},
	});

	return {
		frame,
		messages,
		sessionId,
		requestId,
		stream: body.stream ?? true,
		sequence: 1,
	};
}

export function buildProtocolEvent<TPayload>(
	type: Exclude<ElysiaCoreFrameType, "chat.request" | "hello">,
	base: Pick<ElysiaCoreFrame, "requestId" | "sessionId" | "actor">,
	sequence: number,
	payload: TPayload,
) {
	return buildCoreFrame<TPayload>({
		type,
		requestId: base.requestId,
		sessionId: base.sessionId,
		sequence,
		issuedAt: new Date().toISOString(),
		actor: base.actor,
		payload,
	});
}

export function buildProtocolHello(actor: string) {
	const sessionId = `hello-${actor}`;
	return buildCoreFrame({
		type: "hello",
		requestId: randomUUID(),
		sessionId,
		sequence: 1,
		issuedAt: new Date().toISOString(),
		actor,
		payload: {
			name: ELYSIA_CORE_PROTOCOL.name,
			version: ELYSIA_CORE_PROTOCOL.version,
			requiredHeaders: [
				"Authorization: Bearer <token>",
				"Content-Type: application/json",
			],
			frameTypes: [
				"hello",
				"chat.request",
				"chat.accepted",
				"chat.delta",
				"chat.complete",
				"telemetry",
				"error",
			],
			security: {
				signature: "HMAC-SHA256 over canonical frame fields",
				replayGuard: "per-session monotonic sequence",
				clockWindowMs: ELYSIA_CORE_PROTOCOL.maxClockSkewMs,
				maxPayloadBytes: ELYSIA_CORE_PROTOCOL.maxPayloadBytes,
			},
		},
	});
}
