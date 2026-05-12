import { describe, expect, test } from "bun:test";
import {
	buildSuitCommsStatus,
	buildSuitIntent,
	evaluateSuitLocalAI,
	evaluateSuitPolicy,
	InMemorySuitReplayGuard,
	openSuitEnvelope,
	receiveSuitEnvelope,
	sealSuitEnvelope,
} from "./suit-comms";
import { buildSuitStatus } from "./suit-system";

describe("suit comms", () => {
	test("seals and opens a signed encrypted suit intent", () => {
		const secret = "test-suit-secret";
		const replayGuard = new InMemorySuitReplayGuard();
		const intent = buildSuitIntent({
			kind: "command",
			relay: "wifi_lan",
			command: "scan",
			requestedBy: "operator",
			reason: "preflight scan",
		});
		const envelope = sealSuitEnvelope(intent, { secret, ttlMs: 60_000 });
		const opened = openSuitEnvelope(envelope, { secret, replayGuard });

		expect(opened.id).toBe(intent.id);
		expect(opened.command).toBe("scan");
		expect(envelope.algorithm).toBe("AES-256-GCM+HMAC-SHA256");
		expect(() => openSuitEnvelope(envelope, { secret, replayGuard })).toThrow(
			"Replay detected",
		);
	});

	test("rejects tampered encrypted envelopes", () => {
		const secret = "test-suit-secret";
		const intent = buildSuitIntent({
			kind: "telemetry",
			relay: "wifi_lan",
			requestedBy: "operator",
		});
		const envelope = sealSuitEnvelope(intent, { secret, ttlMs: 60_000 });
		const tamperedCiphertext = `${
			envelope.ciphertext[0] === "A" ? "B" : "A"
		}${envelope.ciphertext.slice(1)}`;

		expect(() =>
			openSuitEnvelope(
				{ ...envelope, ciphertext: tamperedCiphertext },
				{ secret, replayGuard: false },
			),
		).toThrow("Envelope signature mismatch");
	});

	test("keeps satellite relay telemetry-first", () => {
		const telemetryIntent = buildSuitIntent({
			kind: "telemetry",
			relay: "satellite",
			requestedBy: "operator",
		});
		const shieldIntent = buildSuitIntent({
			kind: "command",
			relay: "satellite",
			command: "shield",
			requestedBy: "operator",
		});

		expect(evaluateSuitPolicy(telemetryIntent).decision).toBe("allow");
		expect(evaluateSuitPolicy(shieldIntent).decision).toBe("deny");
	});

	test("requires manual confirmation for elevated simulation commands", () => {
		const intent = buildSuitIntent({
			kind: "command",
			relay: "wifi_lan",
			command: "repair",
			requestedBy: "operator",
		});
		const decision = evaluateSuitPolicy(intent);

		expect(decision.decision).toBe("confirm");
		expect(decision.requiresManualConfirm).toBe(true);
	});

	test("suit-local AI enters safe stop on unsafe telemetry", () => {
		const status = buildSuitStatus();
		const localAI = evaluateSuitLocalAI({
			...status,
			telemetry: {
				...status.telemetry,
				oxygen: 92,
				neuralStability: 0.97,
			},
		});

		expect(localAI.mode).toBe("safe_stop");
		expect(localAI.autonomy).toBe("telemetry_only");
	});

	test("receives low-risk commands but does not execute confirm-only commands", () => {
		const secret = "test-suit-secret";
		const replayGuard = new InMemorySuitReplayGuard();
		const scanIntent = buildSuitIntent({
			kind: "command",
			relay: "wifi_lan",
			command: "scan",
			requestedBy: "operator",
		});
		const repairIntent = buildSuitIntent({
			kind: "command",
			relay: "wifi_lan",
			command: "repair",
			requestedBy: "operator",
		});

		const scanResult = receiveSuitEnvelope(
			sealSuitEnvelope(scanIntent, { secret }),
			{
				secret,
				replayGuard,
			},
		);
		const repairResult = receiveSuitEnvelope(
			sealSuitEnvelope(repairIntent, { secret }),
			{ secret, replayGuard },
		);

		expect(scanResult.ok).toBe(true);
		expect(scanResult.execution?.command).toBe("scan");
		expect(repairResult.ok).toBe(false);
		expect(repairResult.policy.decision).toBe("confirm");
		expect(repairResult.execution).toBeNull();
	});

	test("reports the full local-first comms posture", () => {
		const status = buildSuitCommsStatus();

		expect(
			status.network.channels.some((channel) => channel.kind === "satellite"),
		).toBe(true);
		expect(status.crypto.replayProtection).toBe(true);
		expect(status.localAI.id).toBe("suit-local-ai");
	});
});
