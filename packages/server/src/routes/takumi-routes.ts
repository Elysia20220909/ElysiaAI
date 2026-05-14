import { Elysia } from "elysia";
import { handleTakumiWebhookRequest } from "../lib/takumi-webhook";

export const takumiRoutes = new Elysia({ prefix: "/api/webhooks/takumi" }).post(
	"/workflow",
	async ({ request, set }) => {
		const rawBody = await request.text();
		const result = await handleTakumiWebhookRequest({
			rawBody,
			webhookId: request.headers.get("webhook-id"),
			webhookTimestamp: request.headers.get("webhook-timestamp"),
			webhookSignature: request.headers.get("webhook-signature"),
		});

		if (!result.ok) {
			if (result.error === "missing_signing_secret") {
				set.status = 503;
			} else if (result.error === "invalid_json") {
				set.status = 400;
			} else {
				set.status = 401;
			}
			return {
				ok: false,
				error: result.error,
			};
		}

		return {
			ok: true,
			duplicate: result.duplicate,
			type: result.type,
			workflow_id: result.workflowId,
			workflow_run_id: result.workflowRunId,
		};
	},
	{
		parse: "none",
	},
);
