import { expect, test } from "bun:test";
import {
	buildCoreFrame,
	buildProtocolEvent,
	type ChatRequestPayload,
	ELYSIA_CORE_PROTOCOL,
	normalizeProtocolRequest,
	signCoreFrame,
	verifyCoreFrame,
} from "./elysia-core-protocol";

const messages = [{ role: "user" as const, content: "protocol hello" }];

test("Elysia Core Protocol signs and verifies chat frames", () => {
	const frame = buildCoreFrame<ChatRequestPayload>({
		type: "chat.request",
		requestId: "req-protocol-ok",
		sessionId: "session-protocol-ok",
		sequence: 1,
		issuedAt: new Date().toISOString(),
		actor: "admin",
		payload: {
			messages,
			stream: true,
			client: {
				name: "test-client",
				surface: "api",
			},
		},
	});

	expect(frame.protocol).toBe(ELYSIA_CORE_PROTOCOL.version);
	expect(() => verifyCoreFrame(frame, "admin")).not.toThrow();
});

test("Elysia Core Protocol rejects tampered frames", () => {
	const frame = buildCoreFrame<ChatRequestPayload>({
		type: "chat.request",
		requestId: "req-protocol-tamper",
		sessionId: "session-protocol-tamper",
		sequence: 1,
		issuedAt: new Date().toISOString(),
		actor: "admin",
		payload: {
			messages,
			stream: true,
			client: {
				name: "test-client",
				surface: "api",
			},
		},
	});

	const tampered = {
		...frame,
		payload: {
			...frame.payload,
			stream: false,
		},
	};

	expect(() => verifyCoreFrame(tampered, "admin")).toThrow(
		"Protocol signature mismatch",
	);
});

test("Elysia Core Protocol normalizes legacy chat into a signed frame", () => {
	const request = normalizeProtocolRequest(
		{ messages, sessionId: "legacy-session", stream: true },
		"admin",
		messages,
	);

	expect(request.frame.type).toBe("chat.request");
	expect(request.frame.payload.client.name).toBe("legacy-json");
	expect(request.sessionId).toBe("legacy-session");
	expect(request.requestId.length).toBeGreaterThan(10);
});

test("Elysia Core Protocol creates signed server events", () => {
	const event = buildProtocolEvent(
		"chat.delta",
		{
			requestId: "req-event",
			sessionId: "session-event",
			actor: "Elysia_AI_Core",
		},
		2,
		{ content: "hello" },
	);

	const { signature: _signature, ...unsigned } = event;
	expect(event.signature).toBe(signCoreFrame(unsigned));
	expect(event.type).toBe("chat.delta");
});
