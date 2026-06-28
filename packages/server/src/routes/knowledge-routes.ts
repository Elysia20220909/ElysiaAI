import { Elysia, t } from "elysia";
import { authErrorResponse } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import {
	deleteKnowledgeSource,
	importKnowledgeDocument,
	listKnowledgeSources,
	reindexKnowledgeSource,
	setKnowledgeSourceStatus,
} from "../lib/knowledge-import";
import { getWorkspaceRoot } from "../lib/mvp-local-ai";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";
import { recordPrivacyEvent } from "../lib/privacy-ledger";

function requireKnowledgeSession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Knowledge session required");
	}
}

async function parseImportRequest(request: Request) {
	const contentType = request.headers.get("content-type") || "";
	if (contentType.includes("multipart/form-data")) {
		const form = await request.formData();
		const file = form.get("file") as File | null;
		if (!file) throw new Error("No knowledge file provided");
		return {
			name: file.name,
			mimeType: file.type || "text/plain",
			content: Buffer.from(await file.arrayBuffer()),
		};
	}

	const body = (await request.json().catch(() => ({}))) as {
		name?: string;
		mimeType?: string;
		content?: string;
	};
	return {
		name: body.name || "knowledge.txt",
		mimeType: body.mimeType || "text/plain",
		content: body.content || "",
	};
}

export const knowledgeRoutes = new Elysia({ prefix: "/api/knowledge" })
	.get("/sources", async ({ request }) => {
		const session = requireKnowledgeSession(request);
		if (session instanceof Response) return session;

		return {
			sources: await listKnowledgeSources({
				root: getWorkspaceRoot(),
				userId: session.username,
				includeDisabled: true,
			}),
		};
	})
	.post("/import", async ({ request }) => {
		const session = requireKnowledgeSession(request);
		if (session instanceof Response) return session;

		try {
			const payload = await parseImportRequest(request);
			const root = getWorkspaceRoot();
			const result = await importKnowledgeDocument({
				root,
				userId: session.username,
				name: payload.name,
				mimeType: payload.mimeType,
				content: payload.content,
			});
			void recordPrivacyEvent({
				root,
				ownerKey: session.username,
				scope: "knowledge",
				provider: "sqlite-fts-local",
				direction: "inbound",
				purpose: "Knowledge document imported",
				dataClass: payload.mimeType,
				payload: payload.content,
				metadata: {
					sourceId: result.source.id,
					name: result.source.name,
					chunks: result.chunks.length,
				},
			}).catch(() => undefined);
			return {
				source: result.source,
				chunks: result.chunks.length,
			};
		} catch (error) {
			return jsonError(
				400,
				error instanceof Error ? error.message : "Knowledge import failed",
			);
		}
	})
	.patch(
		"/sources/:id",
		async ({ request, params, body }) => {
			const session = requireKnowledgeSession(request);
			if (session instanceof Response) return session;

			const payload = body as { status?: "ready" | "disabled" };
			if (payload.status !== "ready" && payload.status !== "disabled") {
				return jsonError(400, "Invalid knowledge source status");
			}

			const root = getWorkspaceRoot();
			const result = await setKnowledgeSourceStatus({
				root,
				sourceId: params.id,
				userId: session.username,
				status: payload.status,
			});
			if (!result.updated) return jsonError(404, "Knowledge source not found");
			void recordPrivacyEvent({
				root,
				ownerKey: session.username,
				scope: "knowledge",
				provider: "sqlite-fts-local",
				direction: "local",
				purpose: `Knowledge source ${payload.status}`,
				dataClass: result.source?.mimeType || "documents",
				metadata: { sourceId: params.id, status: payload.status },
			}).catch(() => undefined);
			return result;
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
			body: t.Object({
				status: t.Union([t.Literal("ready"), t.Literal("disabled")]),
			}),
		},
	)
	.post(
		"/sources/:id/reindex",
		async ({ request, params }) => {
			const session = requireKnowledgeSession(request);
			if (session instanceof Response) return session;

			try {
				const root = getWorkspaceRoot();
				const result = await reindexKnowledgeSource({
					root,
					sourceId: params.id,
					userId: session.username,
				});
				if (!result.reindexed) {
					return jsonError(404, "Knowledge source not found");
				}
				void recordPrivacyEvent({
					root,
					ownerKey: session.username,
					scope: "knowledge",
					provider: "sqlite-fts-local",
					direction: "local",
					purpose: "Knowledge source reindexed",
					dataClass: result.source?.mimeType || "documents",
					metadata: {
						sourceId: params.id,
						chunks: result.chunks?.length || 0,
					},
				}).catch(() => undefined);
				return {
					source: result.source,
					chunks: result.chunks?.length || 0,
				};
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Knowledge reindex failed",
				);
			}
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
		},
	)
	.delete(
		"/sources/:id",
		async ({ request, params }) => {
			const session = requireKnowledgeSession(request);
			if (session instanceof Response) return session;

			const root = getWorkspaceRoot();
			const result = await deleteKnowledgeSource({
				root,
				sourceId: params.id,
				userId: session.username,
			});
			if (!result.deleted) return jsonError(404, "Knowledge source not found");
			void recordPrivacyEvent({
				root,
				ownerKey: session.username,
				scope: "knowledge",
				provider: "sqlite-fts-local",
				direction: "local",
				purpose: "Knowledge source deleted",
				dataClass: result.source?.mimeType || "documents",
				metadata: { sourceId: params.id, name: result.source?.name },
			}).catch(() => undefined);
			return result;
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
		},
	);
