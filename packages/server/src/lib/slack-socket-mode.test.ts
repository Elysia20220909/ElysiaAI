import { afterEach, describe, expect, test } from "bun:test";
import { resetShadowGateStateForTest } from "./slack-bridge";
import {
	buildSlackSocketAck,
	handleSlackSocketEnvelope,
	isSlackSocketModeEnabled,
} from "./slack-socket-mode";

const OLD_SLACK_SOCKET_MODE_ENABLED = process.env.SLACK_SOCKET_MODE_ENABLED;
const OLD_GINROU_OWNER_USER_ID = process.env.GINROU_OWNER_USER_ID;

function restoreEnv(name: string, value: string | undefined) {
	if (value === undefined) process.env[name] = "";
	else process.env[name] = value;
}

describe("slack socket mode", () => {
	afterEach(() => {
		restoreEnv("SLACK_SOCKET_MODE_ENABLED", OLD_SLACK_SOCKET_MODE_ENABLED);
		restoreEnv("GINROU_OWNER_USER_ID", OLD_GINROU_OWNER_USER_ID);
		resetShadowGateStateForTest();
	});

	test("is disabled by default", () => {
		process.env.SLACK_SOCKET_MODE_ENABLED = "";

		expect(isSlackSocketModeEnabled()).toBe(false);
	});

	test("builds ack payloads for slash command envelopes", () => {
		const ack = buildSlackSocketAck(
			{
				envelope_id: "E123",
				accepts_response_payload: true,
			},
			{ response_type: "ephemeral", text: "ok" },
		);

		expect(ack).toEqual({
			envelope_id: "E123",
			payload: { response_type: "ephemeral", text: "ok" },
		});
	});

	test("handles slash command envelopes with owner gate", async () => {
		process.env.GINROU_OWNER_USER_ID = "UOWNER";
		const sent: unknown[] = [];

		await handleSlackSocketEnvelope(
			{
				type: "slash_commands",
				envelope_id: "E123",
				accepts_response_payload: true,
				payload: {
					command: "/ginrou",
					text: "ping",
					user_id: "UOWNER",
					channel_id: "C123",
				},
			},
			(ack) => sent.push(ack),
		);

		expect(sent).toHaveLength(1);
		expect(sent[0]).toEqual({
			envelope_id: "E123",
			payload: {
				response_type: "ephemeral",
				text: "GINROU-Lv999 Online",
			},
		});
	});
});
