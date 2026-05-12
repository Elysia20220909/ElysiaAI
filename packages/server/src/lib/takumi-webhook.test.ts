import { afterEach, describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import {
	handleTakumiWebhookRequest,
	resetTakumiWebhookStateForTest,
	verifyTakumiWebhookRequest,
} from "./takumi-webhook";

const OLD_TAKUMI_WEBHOOK_SIGNING_SECRET =
	process.env.TAKUMI_WEBHOOK_SIGNING_SECRET;

function restoreEnv(name: string, value: string | undefined) {
	if (value === undefined) process.env[name] = "";
	else process.env[name] = value;
}

function sign(
	secret: string | Buffer,
	webhookId: string,
	timestamp: string,
	rawBody: string,
) {
	const digest = createHmac("sha256", secret)
		.update(`${webhookId}.${timestamp}.${rawBody}`, "utf8")
		.digest("base64");
	return `v1,${digest}`;
}

describe("takumi webhook", () => {
	afterEach(() => {
		restoreEnv(
			"TAKUMI_WEBHOOK_SIGNING_SECRET",
			OLD_TAKUMI_WEBHOOK_SIGNING_SECRET,
		);
		resetTakumiWebhookStateForTest();
	});

	test("verifies Standard Webhooks signatures", () => {
		const secret = "test-signing-secret";
		const webhookId = "msg_test";
		const timestamp = "1700000000";
		const rawBody = JSON.stringify({
			type: "api.workflow_run.exited",
			timestamp: "2026-05-12T00:00:00Z",
			data: {
				workflow_id: "whitebox-assessment",
				workflow_run_id: "TWR_TEST",
			},
		});

		const result = verifyTakumiWebhookRequest({
			rawBody,
			webhookId,
			webhookTimestamp: timestamp,
			webhookSignature: sign(secret, webhookId, timestamp, rawBody),
			signingSecret: secret,
			now: 1700000000 * 1000,
		});

		expect(result.ok).toBe(true);
	});

	test("verifies whsec-prefixed base64 secrets", () => {
		const secretBytes = Buffer.from("test-signing-secret", "utf8");
		const signingSecret = `whsec_${secretBytes.toString("base64")}`;
		const webhookId = "msg_test";
		const timestamp = "1700000000";
		const rawBody = JSON.stringify({ type: "api.workflow_run.exited" });

		const result = verifyTakumiWebhookRequest({
			rawBody,
			webhookId,
			webhookTimestamp: timestamp,
			webhookSignature: sign(secretBytes, webhookId, timestamp, rawBody),
			signingSecret,
			now: 1700000000 * 1000,
		});

		expect(result.ok).toBe(true);
	});

	test("rejects stale timestamps", () => {
		const secret = "test-signing-secret";
		const webhookId = "msg_test";
		const timestamp = "1700000000";
		const rawBody = JSON.stringify({ type: "api.workflow_run.exited" });

		const result = verifyTakumiWebhookRequest({
			rawBody,
			webhookId,
			webhookTimestamp: timestamp,
			webhookSignature: sign(secret, webhookId, timestamp, rawBody),
			signingSecret: secret,
			now: 1700000601 * 1000,
		});

		expect(result).toEqual({ ok: false, reason: "stale_timestamp" });
	});

	test("marks repeated webhook IDs as duplicates", async () => {
		const secret = "test-signing-secret";
		const webhookId = "msg_test";
		const timestamp = "1700000000";
		const rawBody = JSON.stringify({
			type: "api.workflow_run.exited",
			timestamp: "2026-05-12T00:00:00Z",
			data: {
				workflow_id: "whitebox-assessment",
				workflow_run_id: "TWR_TEST",
			},
		});
		const webhookSignature = sign(secret, webhookId, timestamp, rawBody);

		const first = await handleTakumiWebhookRequest({
			rawBody,
			webhookId,
			webhookTimestamp: timestamp,
			webhookSignature,
			signingSecret: secret,
			now: 1700000000 * 1000,
		});
		const second = await handleTakumiWebhookRequest({
			rawBody,
			webhookId,
			webhookTimestamp: timestamp,
			webhookSignature,
			signingSecret: secret,
			now: 1700000001 * 1000,
		});

		expect(first.ok).toBe(true);
		expect(first.duplicate).toBe(false);
		expect(first.workflowRunId).toBe("TWR_TEST");
		expect(second.ok).toBe(true);
		expect(second.duplicate).toBe(true);
	});
});
