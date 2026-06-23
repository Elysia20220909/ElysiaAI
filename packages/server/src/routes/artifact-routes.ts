import { Elysia, t } from "elysia";
import {
	archiveArtifact,
	createArtifact,
	getArtifact,
	listArtifactRevisions,
	listArtifacts,
	updateArtifact,
} from "../lib/artifact-workbench";
import { authErrorResponse } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import { getWorkspaceRoot } from "../lib/mvp-local-ai";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";
import { recordPrivacyEvent } from "../lib/privacy-ledger";

function requireArtifactSession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Artifact workbench session required");
	}
}

export const artifactRoutes = new Elysia({ prefix: "/api/artifacts" })
	.get(
		"",
		async ({ request, query }) => {
			const session = requireArtifactSession(request);
			if (session instanceof Response) return session;

			try {
				return {
					artifacts: await listArtifacts({
						root: getWorkspaceRoot(),
						ownerKey: session.username,
						projectId: query.projectId || undefined,
						includeArchived: query.includeArchived === "true",
					}),
				};
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Artifact list failed",
				);
			}
		},
		{
			query: t.Object({
				projectId: t.Optional(t.String({ maxLength: 120 })),
				includeArchived: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"",
		async ({ request, body }) => {
			const session = requireArtifactSession(request);
			if (session instanceof Response) return session;

			try {
				const payload = body as {
					projectId?: string;
					title?: string;
					kind?: string;
					status?: string;
					content?: string;
					metadata?: unknown;
					sourceTrace?: unknown;
				};
				const root = getWorkspaceRoot();
				const artifact = await createArtifact({
					root,
					ownerKey: session.username,
					projectId: payload.projectId || undefined,
					title: payload.title || "",
					kind: payload.kind || "markdown",
					status: payload.status || "draft",
					content: payload.content || "",
					metadata: payload.metadata,
					sourceTrace: payload.sourceTrace,
				});
				void recordPrivacyEvent({
					root,
					ownerKey: session.username,
					projectId: payload.projectId || undefined,
					scope: "artifact",
					provider: "sqlite-local",
					direction: "local",
					purpose: "Artifact saved",
					dataClass: artifact.kind,
					payload: artifact.content,
					metadata: { artifactId: artifact.id, title: artifact.title },
				}).catch(() => undefined);
				return {
					artifact,
				};
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Artifact create failed",
				);
			}
		},
		{
			body: t.Object({
				projectId: t.Optional(t.String({ maxLength: 120 })),
				title: t.String({ minLength: 1, maxLength: 160 }),
				kind: t.Optional(t.String({ maxLength: 40 })),
				status: t.Optional(t.String({ maxLength: 40 })),
				content: t.String({ minLength: 1, maxLength: 200000 }),
				metadata: t.Optional(t.Any()),
				sourceTrace: t.Optional(t.Any()),
			}),
		},
	)
	.get(
		"/:id",
		async ({ request, params }) => {
			const session = requireArtifactSession(request);
			if (session instanceof Response) return session;

			const artifact = await getArtifact({
				root: getWorkspaceRoot(),
				ownerKey: session.username,
				artifactId: params.id,
			});
			if (!artifact) return jsonError(404, "Artifact not found");
			return { artifact };
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
		},
	)
	.get(
		"/:id/revisions",
		async ({ request, params }) => {
			const session = requireArtifactSession(request);
			if (session instanceof Response) return session;

			return {
				revisions: await listArtifactRevisions({
					root: getWorkspaceRoot(),
					ownerKey: session.username,
					artifactId: params.id,
				}),
			};
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
		},
	)
	.patch(
		"/:id",
		async ({ request, params, body }) => {
			const session = requireArtifactSession(request);
			if (session instanceof Response) return session;

			try {
				const payload = body as {
					title?: string;
					kind?: string;
					status?: string;
					content?: string;
					summary?: string;
					metadata?: unknown;
					sourceTrace?: unknown;
				};
				const root = getWorkspaceRoot();
				const result = await updateArtifact({
					root,
					ownerKey: session.username,
					artifactId: params.id,
					title: payload.title,
					kind: payload.kind,
					status: payload.status,
					content: payload.content,
					summary: payload.summary,
					metadata: payload.metadata,
					sourceTrace: payload.sourceTrace,
				});
				if (!result.updated) return jsonError(404, "Artifact not found");
				void recordPrivacyEvent({
					root,
					ownerKey: session.username,
					projectId: result.artifact?.projectId,
					scope: "artifact",
					provider: "sqlite-local",
					direction: "local",
					purpose: result.revision
						? "Artifact content revised"
						: "Artifact metadata updated",
					dataClass: result.artifact?.kind || "artifact",
					payload: result.revision?.content,
					metadata: {
						artifactId: params.id,
						title: result.artifact?.title,
						status: result.artifact?.status,
						revisionCreated: Boolean(result.revision),
					},
				}).catch(() => undefined);
				return result;
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Artifact update failed",
				);
			}
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
			body: t.Object({
				title: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
				kind: t.Optional(t.String({ maxLength: 40 })),
				status: t.Optional(t.String({ maxLength: 40 })),
				content: t.Optional(t.String({ minLength: 1, maxLength: 200000 })),
				summary: t.Optional(t.String({ maxLength: 240 })),
				metadata: t.Optional(t.Any()),
				sourceTrace: t.Optional(t.Any()),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ request, params }) => {
			const session = requireArtifactSession(request);
			if (session instanceof Response) return session;

			const root = getWorkspaceRoot();
			const result = await archiveArtifact({
				root,
				ownerKey: session.username,
				artifactId: params.id,
			});
			if (!result.updated) return jsonError(404, "Artifact not found");
			void recordPrivacyEvent({
				root,
				ownerKey: session.username,
				projectId: result.artifact?.projectId,
				scope: "artifact",
				provider: "sqlite-local",
				direction: "local",
				purpose: "Artifact archived",
				dataClass: result.artifact?.kind || "artifact",
				metadata: { artifactId: params.id, title: result.artifact?.title },
			}).catch(() => undefined);
			return result;
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
		},
	);
