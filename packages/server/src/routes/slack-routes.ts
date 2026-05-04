import { Elysia } from "elysia";
import { logger } from "../lib/logger";
import {
	handleGinrouSlashCommand,
	isAllowedSlackCommand,
	parseSlackSlashCommand,
	verifySlackRequest,
} from "../lib/slack-bridge";

export const slackRoutes = new Elysia({ prefix: "/api/slack" }).post(
	"/commands",
	async ({ request, set }) => {
		const rawBody = await request.text();
		const verification = verifySlackRequest({
			rawBody,
			timestamp: request.headers.get("x-slack-request-timestamp"),
			signature: request.headers.get("x-slack-signature"),
		});

		if (!verification.ok) {
			logger.warn("Slack request rejected", { reason: verification.reason });
			set.status = 401;
			return {
				response_type: "ephemeral",
				text: "Slack request verification failed.",
			};
		}

		const payload = parseSlackSlashCommand(rawBody);
		if (!isAllowedSlackCommand(payload)) {
			set.status = 400;
			return {
				response_type: "ephemeral",
				text: `Unsupported command: ${payload.command || "unknown"}`,
			};
		}

		return await handleGinrouSlashCommand(payload);
	},
	{
		parse: "none",
	},
);
