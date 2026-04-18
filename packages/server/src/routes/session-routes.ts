import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import * as chatSessionService from "../lib/chat-session";
import { CONFIG, jsonError } from "../lib/constants";

export const sessionRoutes = new Elysia({ prefix: "/sessions" })
	.post(
		"/",
		async ({
			body,
			request,
		}: {
			body: { mode?: string };
			request: Request;
		}) => {
			const auth = request.headers.get("authorization") || "";
			let userId: string | undefined;
			try {
				if (auth.startsWith("Bearer ")) {
					const payload = jwt.verify(
						auth.substring(7),
						CONFIG.JWT_SECRET,
					) as jwt.JwtPayload;
					userId = (payload as { userId?: string }).userId;
				}
			} catch {}

			const mode = (body as { mode?: string }).mode || "normal";
			const sessionId = await chatSessionService.createChatSession(
				userId,
				mode as string,
			);
			return { sessionId };
		},
		{
			body: t.Object({ mode: t.Optional(t.String()) }),
		},
	)
	.get("/:id", async ({ params }) => {
		const session = await chatSessionService.getSession(params.id);
		if (!session) return jsonError(404, "Session not found");
		return session;
	})
	.get("/", async ({ request, query }) => {
		const auth = request.headers.get("authorization") || "";
		if (!auth.startsWith("Bearer "))
			return jsonError(401, "Missing Bearer token");
		try {
			const payload = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as {
				userId?: string;
			};
			const userId = payload.userId;
			if (!userId) return jsonError(401, "Invalid token");
			const limit = Number(query?.limit ?? 20) || 20;
			return await chatSessionService.getUserSessions(userId, limit);
		} catch {
			return jsonError(401, "Invalid token");
		}
	})
	.delete("/:id", async ({ params, request }) => {
		const auth = request.headers.get("authorization") || "";
		if (!auth.startsWith("Bearer "))
			return jsonError(401, "Missing Bearer token");
		try {
			jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			const success = await chatSessionService.deleteSession(params.id);
			if (!success) return jsonError(404, "Session not found");
			return { success: true };
		} catch {
			return jsonError(401, "Invalid token");
		}
	})
	.get(
		"/:id/export",
		async ({
			params,
			query,
		}: {
			params: { id: string };
			query: { format?: string };
		}) => {
			const format = query.format || "json";
			const sessionId = params.id;
			if (format === "json") {
				const data = await chatSessionService.exportSessionAsJSON(sessionId);
				if (!data) return jsonError(404, "Session not found");
				return new Response(data as BodyInit, {
					headers: {
						"content-type": "application/json",
						"content-disposition": `attachment; filename="session-${sessionId}.json"`,
					},
				});
			}
			if (format === "markdown") {
				const data =
					await chatSessionService.exportSessionAsMarkdown(sessionId);
				if (!data) return jsonError(404, "Session not found");
				return new Response(data, {
					headers: {
						"content-type": "text/markdown",
						"content-disposition": `attachment; filename="session-${sessionId}.md"`,
					},
				});
			}
			return jsonError(400, "Invalid format");
		},
	)
	.get("/:id/stats", async ({ params }) => {
		const stats = await chatSessionService.getSessionStats(params.id);
		if (!stats) return jsonError(404, "Session not found");
		return stats;
	});
