import { Elysia, t } from "elysia";
import {
	assertToolApproved,
	buildAgentApprovalGateReport,
	createAgentPlan,
	decideToolApproval,
	evaluateAgentAction,
	listToolApprovals,
	requestToolApproval,
} from "../lib/agent-approval-gate";
import { authErrorResponse } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import { getWorkspaceRoot } from "../lib/mvp-local-ai";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";
import { recordPrivacyEvent } from "../lib/privacy-ledger";

function requireAgentApprovalSession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Agent approval session required");
	}
}

export const agentApprovalRoutes = new Elysia({ prefix: "/api/agents" })
	.get("/approvals/gate", async ({ request }) => {
		const session = requireAgentApprovalSession(request);
		if (session instanceof Response) return session;

		return await buildAgentApprovalGateReport({
			root: getWorkspaceRoot(),
			ownerKey: session.username,
		});
	})
	.get(
		"/approvals",
		async ({ request, query }) => {
			const session = requireAgentApprovalSession(request);
			if (session instanceof Response) return session;

			return {
				approvals: await listToolApprovals({
					root: getWorkspaceRoot(),
					ownerKey: session.username,
					status: query.status || undefined,
					limit: query.limit ? Number(query.limit) : undefined,
				}),
			};
		},
		{
			query: t.Object({
				status: t.Optional(t.String({ maxLength: 40 })),
				limit: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/approvals/evaluate",
		({ request, body }) => {
			const session = requireAgentApprovalSession(request);
			if (session instanceof Response) return session;

			const payload = body as {
				toolName?: string;
				actionClass?: string;
				request?: unknown;
			};
			return {
				evaluation: evaluateAgentAction({
					toolName: payload.toolName || "",
					actionClass: payload.actionClass,
					request: payload.request,
				}),
			};
		},
		{
			body: t.Object({
				toolName: t.String({ minLength: 1, maxLength: 120 }),
				actionClass: t.Optional(t.String({ maxLength: 40 })),
				request: t.Optional(t.Any()),
			}),
		},
	)
	.post(
		"/approvals/plans",
		async ({ request, body }) => {
			const session = requireAgentApprovalSession(request);
			if (session instanceof Response) return session;

			try {
				const payload = body as {
					projectId?: string;
					title?: string;
					goal?: string;
					riskLevel?: string;
					source?: string;
					metadata?: unknown;
					steps?: Array<{
						title: string;
						detail?: string;
						requiredGate?: string;
						toolName?: string;
					}>;
				};
				const root = getWorkspaceRoot();
				const result = await createAgentPlan({
					root,
					ownerKey: session.username,
					projectId: payload.projectId,
					title: payload.title || "",
					goal: payload.goal || "",
					riskLevel: payload.riskLevel,
					source: payload.source,
					metadata: payload.metadata,
					steps: payload.steps || [],
				});
				void recordPrivacyEvent({
					root,
					ownerKey: session.username,
					projectId: payload.projectId,
					scope: "agent-approval",
					provider: "local-gate",
					direction: "local",
					purpose: "Agent plan registered",
					dataClass: "agent-plan",
					metadata: {
						planId: result.plan.id,
						riskLevel: result.plan.riskLevel,
						stepCount: result.steps.length,
					},
				}).catch(() => undefined);
				return result;
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Agent plan create failed",
				);
			}
		},
		{
			body: t.Object({
				projectId: t.Optional(t.String({ maxLength: 120 })),
				title: t.String({ minLength: 1, maxLength: 160 }),
				goal: t.String({ minLength: 1, maxLength: 2000 }),
				riskLevel: t.Optional(t.String({ maxLength: 40 })),
				source: t.Optional(t.String({ maxLength: 80 })),
				metadata: t.Optional(t.Any()),
				steps: t.Optional(
					t.Array(
						t.Object({
							title: t.String({ minLength: 1, maxLength: 160 }),
							detail: t.Optional(t.String({ maxLength: 1000 })),
							requiredGate: t.Optional(t.String({ maxLength: 40 })),
							toolName: t.Optional(t.String({ maxLength: 120 })),
						}),
					),
				),
			}),
		},
	)
	.post(
		"/approvals/request",
		async ({ request, body }) => {
			const session = requireAgentApprovalSession(request);
			if (session instanceof Response) return session;

			try {
				const payload = body as {
					planId?: string;
					stepId?: string;
					toolName?: string;
					actionClass?: string;
					request?: unknown;
					expiresInMinutes?: number;
				};
				const root = getWorkspaceRoot();
				const result = await requestToolApproval({
					root,
					ownerKey: session.username,
					planId: payload.planId,
					stepId: payload.stepId,
					toolName: payload.toolName || "",
					actionClass: payload.actionClass,
					request: payload.request,
					expiresInMinutes: payload.expiresInMinutes,
				});
				void recordPrivacyEvent({
					root,
					ownerKey: session.username,
					scope: "agent-approval",
					provider: "local-gate",
					direction: "local",
					purpose: "Tool approval requested",
					dataClass: result.approval.actionClass,
					approvalStatus:
						result.approval.status === "pending"
							? "pending"
							: result.approval.status === "approved"
								? "approved"
								: "denied",
					riskLevel:
						result.approval.riskLevel === "critical"
							? "high"
							: result.approval.riskLevel,
					payload: result.approval.requestJson,
					metadata: {
						approvalId: result.approval.id,
						toolName: result.approval.toolName,
						status: result.approval.status,
						reasons: result.evaluation.reasons,
					},
				}).catch(() => undefined);
				return result;
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Tool approval request failed",
				);
			}
		},
		{
			body: t.Object({
				planId: t.Optional(t.String({ maxLength: 120 })),
				stepId: t.Optional(t.String({ maxLength: 120 })),
				toolName: t.String({ minLength: 1, maxLength: 120 }),
				actionClass: t.Optional(t.String({ maxLength: 40 })),
				request: t.Optional(t.Any()),
				expiresInMinutes: t.Optional(t.Number()),
			}),
		},
	)
	.patch(
		"/approvals/:id/decision",
		async ({ request, params, body }) => {
			const session = requireAgentApprovalSession(request);
			if (session instanceof Response) return session;

			try {
				const payload = body as {
					decision?: "approved" | "denied" | "revoked";
					reason?: string;
				};
				const root = getWorkspaceRoot();
				const result = await decideToolApproval({
					root,
					ownerKey: session.username,
					approvalId: params.id,
					decision: payload.decision || "denied",
					reason: payload.reason,
				});
				if (!result.updated) return jsonError(404, "Approval not found");
				void recordPrivacyEvent({
					root,
					ownerKey: session.username,
					scope: "agent-approval",
					provider: "local-gate",
					direction: "local",
					purpose: `Tool approval ${result.approval?.status || "updated"}`,
					dataClass: result.approval?.actionClass || "approval",
					approvalStatus:
						result.approval?.status === "approved"
							? "approved"
							: result.approval?.status === "denied"
								? "denied"
								: "pending",
					riskLevel:
						result.approval?.riskLevel === "critical"
							? "high"
							: result.approval?.riskLevel || "medium",
					metadata: {
						approvalId: params.id,
						reason: payload.reason,
						status: result.approval?.status,
					},
				}).catch(() => undefined);
				return result;
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Tool approval decision failed",
				);
			}
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
			body: t.Object({
				decision: t.Union([
					t.Literal("approved"),
					t.Literal("denied"),
					t.Literal("revoked"),
				]),
				reason: t.Optional(t.String({ maxLength: 500 })),
			}),
		},
	)
	.post(
		"/approvals/check",
		async ({ request, body }) => {
			const session = requireAgentApprovalSession(request);
			if (session instanceof Response) return session;

			const payload = body as {
				approvalId?: string;
				actionClass?: string;
			};
			return await assertToolApproved({
				root: getWorkspaceRoot(),
				ownerKey: session.username,
				approvalId: payload.approvalId,
				actionClass: payload.actionClass,
			});
		},
		{
			body: t.Object({
				approvalId: t.Optional(t.String({ maxLength: 120 })),
				actionClass: t.Optional(t.String({ maxLength: 40 })),
			}),
		},
	);
