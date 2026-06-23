import { Elysia, t } from "elysia";
import { authErrorResponse } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import { collectDailyDeskBrief } from "../lib/daily-desk-brief";
import { getWorkspaceRoot } from "../lib/mvp-local-ai";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";

function requireDailyDeskSession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Daily Desk session required");
	}
}

export const dailyDeskRoutes = new Elysia({ prefix: "/api/daily-desk" }).get(
	"/brief",
	async ({ request, query }) => {
		const session = requireDailyDeskSession(request);
		if (session instanceof Response) return session;

		try {
			return {
				brief: await collectDailyDeskBrief({
					root: getWorkspaceRoot(),
					ownerKey: session.username,
					projectId: query.projectId || undefined,
					voice: {
						enabled: query.voiceEnabled === "true",
						readMode: query.voiceReadMode || "summary",
						lastEmotion: query.lastEmotion || undefined,
					},
				}),
			};
		} catch (error) {
			return jsonError(
				400,
				error instanceof Error ? error.message : "Daily Desk Brief failed",
			);
		}
	},
	{
		query: t.Object({
			projectId: t.Optional(t.String({ maxLength: 120 })),
			voiceEnabled: t.Optional(t.String()),
			voiceReadMode: t.Optional(t.String({ maxLength: 40 })),
			lastEmotion: t.Optional(t.String({ maxLength: 40 })),
		}),
	},
);
