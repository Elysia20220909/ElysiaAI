import { Elysia, t } from "elysia";
import { authErrorResponse } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import { getWorkspaceRoot } from "../lib/mvp-local-ai";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";
import {
	buildPrivacyLedgerReport,
	buildPrivacyPosture,
	listPrivacyEvents,
	recordPrivacyEvent,
} from "../lib/privacy-ledger";

function requirePrivacySession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Privacy ledger session required");
	}
}

export const privacyRoutes = new Elysia({ prefix: "/api/privacy" })
	.get(
		"/ledger",
		async ({ request, query }) => {
			const session = requirePrivacySession(request);
			if (session instanceof Response) return session;

			return await buildPrivacyLedgerReport({
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
		"/posture",
		async ({ request, query }) => {
			const session = requirePrivacySession(request);
			if (session instanceof Response) return session;

			return {
				posture: await buildPrivacyPosture({
					root: getWorkspaceRoot(),
					ownerKey: session.username,
					projectId: query.projectId || undefined,
				}),
			};
		},
		{
			query: t.Object({
				projectId: t.Optional(t.String({ maxLength: 120 })),
			}),
		},
	)
	.get(
		"/events",
		async ({ request, query }) => {
			const session = requirePrivacySession(request);
			if (session instanceof Response) return session;

			return {
				events: await listPrivacyEvents({
					root: getWorkspaceRoot(),
					ownerKey: session.username,
					projectId: query.projectId || undefined,
					provider: query.provider || undefined,
					limit: query.limit ? Number(query.limit) : undefined,
				}),
			};
		},
		{
			query: t.Object({
				projectId: t.Optional(t.String({ maxLength: 120 })),
				provider: t.Optional(t.String({ maxLength: 80 })),
				limit: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/events",
		async ({ request, body }) => {
			const session = requirePrivacySession(request);
			if (session instanceof Response) return session;

			try {
				const payload = body as {
					projectId?: string;
					scope?: string;
					provider?: string;
					direction?: string;
					purpose?: string;
					dataClass?: string;
					approvalStatus?: string;
					localOnly?: boolean;
					riskLevel?: string;
					metadata?: unknown;
				};
				return {
					event: await recordPrivacyEvent({
						root: getWorkspaceRoot(),
						ownerKey: session.username,
						projectId: payload.projectId || undefined,
						scope: payload.scope || "",
						provider: payload.provider || "",
						direction: payload.direction,
						purpose: payload.purpose || "",
						dataClass: payload.dataClass,
						approvalStatus: payload.approvalStatus,
						localOnly: payload.localOnly ?? true,
						riskLevel: payload.riskLevel,
						metadata: payload.metadata,
					}),
				};
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Privacy event create failed",
				);
			}
		},
		{
			body: t.Object({
				projectId: t.Optional(t.String({ maxLength: 120 })),
				scope: t.String({ minLength: 1, maxLength: 80 }),
				provider: t.String({ minLength: 1, maxLength: 80 }),
				direction: t.Optional(t.String({ maxLength: 40 })),
				purpose: t.String({ minLength: 1, maxLength: 240 }),
				dataClass: t.Optional(t.String({ maxLength: 120 })),
				approvalStatus: t.Optional(t.String({ maxLength: 40 })),
				localOnly: t.Optional(t.Boolean()),
				riskLevel: t.Optional(t.String({ maxLength: 40 })),
				metadata: t.Optional(t.Any()),
			}),
		},
	);
