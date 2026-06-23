import { Elysia, t } from "elysia";
import { authErrorResponse } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";
import {
	buildPullModelCommand,
	collectSetupWizardReadiness,
} from "../lib/setup-wizard";

function requireSetupSession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Setup wizard session required");
	}
}

export const setupRoutes = new Elysia({ prefix: "/api/setup" })
	.get("/readiness", async ({ request }) => {
		const session = requireSetupSession(request);
		if (session instanceof Response) return session;

		try {
			return await collectSetupWizardReadiness();
		} catch (error) {
			return jsonError(
				500,
				error instanceof Error ? error.message : "Setup readiness failed",
			);
		}
	})
	.post(
		"/actions/pull-model",
		async ({ request, body }) => {
			const session = requireSetupSession(request);
			if (session instanceof Response) return session;

			const payload = body as { model?: string };
			return buildPullModelCommand(payload.model);
		},
		{
			body: t.Object({
				model: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
			}),
		},
	);
