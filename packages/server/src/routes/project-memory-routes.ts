import { Elysia, t } from "elysia";
import { authErrorResponse } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import { getWorkspaceRoot } from "../lib/mvp-local-ai";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";
import { recordPrivacyEvent } from "../lib/privacy-ledger";
import {
	addProjectMemory,
	createProject,
	ensureDefaultProject,
	listProjectMemories,
	listProjects,
	setProjectMemoryState,
} from "../lib/project-memory";

function requireProjectMemorySession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Project memory session required");
	}
}

export const projectMemoryRoutes = new Elysia({ prefix: "/api/projects" })
	.get("", async ({ request }) => {
		const session = requireProjectMemorySession(request);
		if (session instanceof Response) return session;

		const root = getWorkspaceRoot();
		const defaultProject = await ensureDefaultProject(root, session.username);
		return {
			defaultProject,
			projects: await listProjects({ root, ownerKey: session.username }),
		};
	})
	.post(
		"",
		async ({ request, body }) => {
			const session = requireProjectMemorySession(request);
			if (session instanceof Response) return session;

			try {
				const payload = body as { name?: string; description?: string };
				const root = getWorkspaceRoot();
				const project = await createProject({
					root,
					ownerKey: session.username,
					name: payload.name || "",
					description: payload.description,
				});
				void recordPrivacyEvent({
					root,
					ownerKey: session.username,
					projectId: project.id,
					scope: "project",
					provider: "sqlite-local",
					direction: "local",
					purpose: "Project created",
					dataClass: "project-metadata",
					metadata: { projectId: project.id, name: project.name },
				}).catch(() => undefined);
				return {
					project,
				};
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Project create failed",
				);
			}
		},
		{
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 120 }),
				description: t.Optional(t.String({ maxLength: 1000 })),
			}),
		},
	)
	.get(
		"/:id/memory",
		async ({ request, params, query }) => {
			const session = requireProjectMemorySession(request);
			if (session instanceof Response) return session;

			return {
				memories: await listProjectMemories({
					root: getWorkspaceRoot(),
					ownerKey: session.username,
					projectId: params.id,
					includeInactive: query.includeInactive !== "false",
				}),
			};
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
			query: t.Object({
				includeInactive: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/:id/memory",
		async ({ request, params, body }) => {
			const session = requireProjectMemorySession(request);
			if (session instanceof Response) return session;

			try {
				const payload = body as {
					title?: string;
					content?: string;
					source?: string;
					pinned?: boolean;
					emotion?: string;
					metadata?: unknown;
				};
				const root = getWorkspaceRoot();
				const metadata = {
					...((payload.metadata && typeof payload.metadata === "object"
						? payload.metadata
						: {}) as Record<string, unknown>),
					...(payload.emotion ? { emotion: payload.emotion } : {}),
				};
				const memory = await addProjectMemory({
					root,
					ownerKey: session.username,
					projectId: params.id,
					title: payload.title,
					content: payload.content || "",
					source: payload.source || "manual",
					pinned: Boolean(payload.pinned),
					metadata,
				});
				void recordPrivacyEvent({
					root,
					ownerKey: session.username,
					projectId: params.id,
					scope: "project-memory",
					provider: "sqlite-local",
					direction: "local",
					purpose: "Project memory saved",
					dataClass: "memory",
					payload: memory.content,
					metadata: {
						memoryId: memory.id,
						title: memory.title,
						pinned: memory.pinned,
						emotion: payload.emotion,
					},
				}).catch(() => undefined);
				return {
					memory,
				};
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Project memory add failed",
				);
			}
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
			body: t.Object({
				title: t.Optional(t.String({ maxLength: 160 })),
				content: t.String({ minLength: 1, maxLength: 2400 }),
				source: t.Optional(t.String({ maxLength: 80 })),
				pinned: t.Optional(t.Boolean()),
				emotion: t.Optional(t.String({ maxLength: 40 })),
				metadata: t.Optional(t.Any()),
			}),
		},
	)
	.patch(
		"/:id/memory/:memoryId",
		async ({ request, params, body }) => {
			const session = requireProjectMemorySession(request);
			if (session instanceof Response) return session;

			const payload = body as {
				status?: "active" | "disabled" | "forgotten";
				pinned?: boolean;
			};
			const root = getWorkspaceRoot();
			const result = await setProjectMemoryState({
				root,
				ownerKey: session.username,
				projectId: params.id,
				memoryId: params.memoryId,
				status: payload.status,
				pinned: payload.pinned,
			});
			if (!result.updated) return jsonError(404, "Project memory not found");
			void recordPrivacyEvent({
				root,
				ownerKey: session.username,
				projectId: params.id,
				scope: "project-memory",
				provider: "sqlite-local",
				direction: "local",
				purpose: "Project memory state changed",
				dataClass: "memory",
				metadata: {
					memoryId: params.memoryId,
					status: result.memory?.status,
					pinned: result.memory?.pinned,
				},
			}).catch(() => undefined);
			return result;
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
				memoryId: t.String({ minLength: 1, maxLength: 120 }),
			}),
			body: t.Object({
				status: t.Optional(
					t.Union([
						t.Literal("active"),
						t.Literal("disabled"),
						t.Literal("forgotten"),
					]),
				),
				pinned: t.Optional(t.Boolean()),
			}),
		},
	)
	.delete(
		"/:id/memory/:memoryId",
		async ({ request, params }) => {
			const session = requireProjectMemorySession(request);
			if (session instanceof Response) return session;

			const root = getWorkspaceRoot();
			const result = await setProjectMemoryState({
				root,
				ownerKey: session.username,
				projectId: params.id,
				memoryId: params.memoryId,
				status: "forgotten",
				pinned: false,
			});
			if (!result.updated) return jsonError(404, "Project memory not found");
			void recordPrivacyEvent({
				root,
				ownerKey: session.username,
				projectId: params.id,
				scope: "project-memory",
				provider: "sqlite-local",
				direction: "local",
				purpose: "Project memory forgotten",
				dataClass: "memory",
				metadata: { memoryId: params.memoryId },
			}).catch(() => undefined);
			return result;
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
				memoryId: t.String({ minLength: 1, maxLength: 120 }),
			}),
		},
	);
