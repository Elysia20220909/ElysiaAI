import { afterEach, describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import {
	handleGinrouSlashCommand,
	isAllowedSlackCommand,
	parseSlackSlashCommand,
	resetShadowGateStateForTest,
	sendSlackWebhookNotification,
	verifySlackRequest,
} from "./slack-bridge";

const OLD_GINROU_OWNER_USER_ID = process.env.GINROU_OWNER_USER_ID;
const OLD_GINROU_ALLOWED_CHANNEL_IDS = process.env.GINROU_ALLOWED_CHANNEL_IDS;
const OLD_GINROU_GATE_DEFAULT_LOCKED = process.env.GINROU_GATE_DEFAULT_LOCKED;

function restoreEnv(name: string, value: string | undefined) {
	if (value === undefined) process.env[name] = "";
	else process.env[name] = value;
}

function sign(secret: string, timestamp: string, rawBody: string) {
	const digest = createHmac("sha256", secret)
		.update(`v0:${timestamp}:${rawBody}`, "utf8")
		.digest("hex");
	return `v0=${digest}`;
}

describe("slack bridge", () => {
	afterEach(() => {
		restoreEnv("GINROU_OWNER_USER_ID", OLD_GINROU_OWNER_USER_ID);
		restoreEnv("GINROU_ALLOWED_CHANNEL_IDS", OLD_GINROU_ALLOWED_CHANNEL_IDS);
		restoreEnv("GINROU_GATE_DEFAULT_LOCKED", OLD_GINROU_GATE_DEFAULT_LOCKED);
		resetShadowGateStateForTest();
	});

	test("verifies Slack request signatures", () => {
		const secret = "test-signing-secret";
		const rawBody = "command=%2Fginrou&text=ping&user_id=U123";
		const timestamp = "1700000000";

		const result = verifySlackRequest({
			rawBody,
			timestamp,
			signature: sign(secret, timestamp, rawBody),
			signingSecret: secret,
			now: 1700000000 * 1000,
		});

		expect(result.ok).toBe(true);
	});

	test("rejects stale Slack timestamps", () => {
		const secret = "test-signing-secret";
		const rawBody = "command=%2Fginrou&text=ping&user_id=U123";
		const timestamp = "1700000000";

		const result = verifySlackRequest({
			rawBody,
			timestamp,
			signature: sign(secret, timestamp, rawBody),
			signingSecret: secret,
			now: 1700000601 * 1000,
		});

		expect(result).toEqual({ ok: false, reason: "stale_timestamp" });
	});

	test("parses slash command form payloads", () => {
		const payload = parseSlackSlashCommand(
			"command=%2Fginrou&text=repo+connect+Elysia20220909%2FElysiaAI&channel_id=C123",
		);

		expect(payload.command).toBe("/ginrou");
		expect(payload.text).toBe("repo connect Elysia20220909/ElysiaAI");
		expect(payload.channel_id).toBe("C123");
		expect(isAllowedSlackCommand(payload)).toBe(true);
	});

	test("handles fast commands without external services", async () => {
		process.env.GINROU_OWNER_USER_ID = "UOWNER";

		const response = await handleGinrouSlashCommand({
			command: "/ginrou",
			text: "ping",
			user_id: "UOWNER",
		});

		expect(response.response_type).toBe("ephemeral");
		expect(response.text).toContain("Online");
	});

	test("fails closed when the owner is not configured", async () => {
		process.env.GINROU_OWNER_USER_ID = "";

		const response = await handleGinrouSlashCommand({
			command: "/ginrou",
			text: "open",
			user_id: "UOWNER",
		});

		expect(response.text).toContain("Access Denied");
		expect(response.text).toContain("GINROU_OWNER_USER_ID");
	});

	test("allows setup bootstrap before owner is configured", async () => {
		process.env.GINROU_OWNER_USER_ID = "";

		const response = await handleGinrouSlashCommand({
			command: "/ginrou",
			text: "setup",
			user_id: "UOWNER",
			channel_id: "CADMIN",
		});

		expect(response.text).toContain("GINROU-Lv999 Shadow Gate setup");
		expect(response.text).toContain("GINROU_OWNER_USER_ID=UOWNER");
		expect(response.text).toContain("GINROU_ALLOWED_CHANNEL_IDS=CADMIN");
	});

	test("denies non-owner operators", async () => {
		process.env.GINROU_OWNER_USER_ID = "UOWNER";

		const response = await handleGinrouSlashCommand({
			command: "/ginrou",
			text: "open",
			user_id: "UOTHER",
		});

		expect(response.text).toContain("Access Denied");
		expect(response.text).toContain("not owner");
	});

	test("locks and unlocks the owner gate", async () => {
		process.env.GINROU_OWNER_USER_ID = "UOWNER";

		const locked = await handleGinrouSlashCommand({
			command: "/ginrou",
			text: "lock",
			user_id: "UOWNER",
		});
		const statusWhileLocked = await handleGinrouSlashCommand({
			command: "/ginrou",
			text: "status",
			user_id: "UOWNER",
		});
		const unlocked = await handleGinrouSlashCommand({
			command: "/ginrou",
			text: "unlock",
			user_id: "UOWNER",
		});

		expect(locked.text).toContain("Locked");
		expect(statusWhileLocked.text).toContain("Shadow Gate Locked");
		expect(unlocked.text).toContain("Unlocked");
	});

	test("does not send webhooks without a configured URL", async () => {
		const response = await sendSlackWebhookNotification({ text: "test" }, "");

		expect(response.ok).toBe(false);
		expect(response.error).toContain("SLACK_WEBHOOK_URL");
	});
});
