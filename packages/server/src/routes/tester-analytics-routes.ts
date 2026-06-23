import { Elysia, t } from "elysia";
import { authErrorResponse } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import { getWorkspaceRoot } from "../lib/mvp-local-ai";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";
import { recordPrivacyEvent } from "../lib/privacy-ledger";
import {
	buildTesterAnalyticsReport,
	listTesterEvents,
	recordTesterEvent,
} from "../lib/tester-analytics";

function requireTesterAnalyticsSession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Tester analytics session required");
	}
}

export const testerAnalyticsRoutes = new Elysia({
	prefix: "/api/tester-analytics",
})
	.get(
		"/report",
		async ({ request, query }) => {
			const session = requireTesterAnalyticsSession(request);
			if (session instanceof Response) return session;

			return await buildTesterAnalyticsReport({
				root: getWorkspaceRoot(),
				ownerKey: session.username,
				projectId: query.projectId || undefined,
				limit: query.limit ? Number(query.limit) : undefined,
			});
		},
		{
			query: t.Object({
				projectId: t.Optional(t.String({ maxLength: 120 })),
				limit: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/events",
		async ({ request, query }) => {
			const session = requireTesterAnalyticsSession(request);
			if (session instanceof Response) return session;

			return {
				events: await listTesterEvents({
					root: getWorkspaceRoot(),
					ownerKey: session.username,
					projectId: query.projectId || undefined,
					area: query.area || undefined,
					limit: query.limit ? Number(query.limit) : undefined,
				}),
			};
		},
		{
			query: t.Object({
				projectId: t.Optional(t.String({ maxLength: 120 })),
				area: t.Optional(t.String({ maxLength: 80 })),
				limit: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/events",
		async ({ request, body }) => {
			const session = requireTesterAnalyticsSession(request);
			if (session instanceof Response) return session;

			try {
				const payload = body as {
					projectId?: string;
					testerId?: string;
					sessionId?: string;
					eventType?: string;
					area?: string;
					action?: string;
					outcome?: string;
					severity?: string;
					durationMs?: number;
					metadata?: unknown;
					payload?: unknown;
				};
				const root = getWorkspaceRoot();
				const event = await recordTesterEvent({
					root,
					ownerKey: session.username,
					projectId: payload.projectId || undefined,
					testerId: payload.testerId || undefined,
					sessionId: payload.sessionId || undefined,
					eventType: payload.eventType,
					area: payload.area,
					action: payload.action,
					outcome: payload.outcome,
					severity: payload.severity,
					durationMs: payload.durationMs,
					metadata: payload.metadata,
					payload: payload.payload,
				});
				void recordPrivacyEvent({
					root,
					ownerKey: session.username,
					projectId: payload.projectId || undefined,
					scope: "tester-analytics",
					provider: "sqlite-local",
					direction: "local",
					purpose: "Tester analytics event recorded",
					dataClass: "usage-metadata",
					payload: payload.payload,
					localOnly: true,
					riskLevel: "low",
					approvalStatus: "not-required",
					metadata: {
						eventId: event.id,
						eventType: event.eventType,
						area: event.area,
						action: event.action,
						outcome: event.outcome,
						severity: event.severity,
					},
				}).catch(() => undefined);
				return { event };
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error
						? error.message
						: "Tester analytics event create failed",
				);
			}
		},
		{
			body: t.Object({
				projectId: t.Optional(t.String({ maxLength: 120 })),
				testerId: t.Optional(t.String({ maxLength: 240 })),
				sessionId: t.Optional(t.String({ maxLength: 120 })),
				eventType: t.Optional(t.String({ maxLength: 40 })),
				area: t.Optional(t.String({ maxLength: 80 })),
				action: t.Optional(t.String({ maxLength: 120 })),
				outcome: t.Optional(t.String({ maxLength: 40 })),
				severity: t.Optional(t.String({ maxLength: 40 })),
				durationMs: t.Optional(t.Number()),
				metadata: t.Optional(t.Any()),
				payload: t.Optional(t.Any()),
			}),
		},
	);
