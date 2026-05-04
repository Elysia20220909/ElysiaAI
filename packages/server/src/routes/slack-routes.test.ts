import { afterEach, describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { slackRoutes } from "./slack-routes";

const OLD_SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const OLD_SLACK_COMMAND_NAME = process.env.SLACK_COMMAND_NAME;
const OLD_GINROU_OWNER_USER_ID = process.env.GINROU_OWNER_USER_ID;

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

describe("slack routes", () => {
	afterEach(() => {
		restoreEnv("SLACK_SIGNING_SECRET", OLD_SLACK_SIGNING_SECRET);
		restoreEnv("SLACK_COMMAND_NAME", OLD_SLACK_COMMAND_NAME);
		restoreEnv("GINROU_OWNER_USER_ID", OLD_GINROU_OWNER_USER_ID);
	});

	test("accepts signed slash command requests", async () => {
		const secret = "route-test-signing-secret";
		const timestamp = String(Math.floor(Date.now() / 1000));
		const rawBody =
			"command=%2Fginrou&text=ping&user_id=UOWNER&channel_id=C123";

		process.env.SLACK_SIGNING_SECRET = secret;
		process.env.SLACK_COMMAND_NAME = "/ginrou";
		process.env.GINROU_OWNER_USER_ID = "UOWNER";

		const response = await slackRoutes.handle(
			new Request("http://localhost/api/slack/commands", {
				method: "POST",
				headers: {
					"content-type": "application/x-www-form-urlencoded",
					"x-slack-request-timestamp": timestamp,
					"x-slack-signature": sign(secret, timestamp, rawBody),
				},
				body: rawBody,
			}),
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as { text: string };
		expect(body.text).toContain("Online");
	});

	test("rejects unsigned slash command requests", async () => {
		process.env.SLACK_SIGNING_SECRET = "route-test-signing-secret";

		const response = await slackRoutes.handle(
			new Request("http://localhost/api/slack/commands", {
				method: "POST",
				body: "command=%2Fginrou&text=ping",
			}),
		);

		expect(response.status).toBe(401);
	});
});
