import { Elysia, t } from "elysia";
import type jwt from "jsonwebtoken";
import {
	type AccessTokenPayload,
	authErrorResponse,
	getOptionalAccessToken,
	requireAccessToken,
} from "../lib/auth-cookies";
import * as chatSessionService from "../lib/chat-session";
import { jsonError } from "../lib/constants";

type ChatMode = "normal" | "sweet" | "professional";
type SessionTokenPayload = jwt.JwtPayload & AccessTokenPayload;

function normalizeChatMode(mode: string | undefined): ChatMode {
	return mode === "sweet" || mode === "professional" ? mode : "normal";
}

function requireSessionToken(request: Request): SessionTokenPayload | Response {
	try {
		const payload = requireAccessToken(request) as SessionTokenPayload;
		if (
			!payload.userId &&
			payload.role !== "admin" &&
			payload.role !== "owner"
		) {
			return jsonError(401, "Invalid token", "AUTH_TOKEN_INVALID");
		}
		return payload;
	} catch (error) {
		return authErrorResponse(error, "Invalid token");
	}
}

function canAccessSession(
	session: chatSessionService.ChatSessionWithMessages,
	payload: SessionTokenPayload,
): boolean {
	if (payload.role === "admin" || payload.role === "owner") return true;
	return Boolean(session.userId && payload.userId === session.userId);
}

async function getAuthorizedSession(sessionId: string, request: Request) {
	const payload = requireSessionToken(request);
	if (payload instanceof Response) return { response: payload };

	const session = await chatSessionService.getSession(sessionId);
	if (!session) return { response: jsonError(404, "Session not found") };
	if (!canAccessSession(session, payload)) {
		return { response: jsonError(403, "Forbidden") };
	}

	return { payload, session };
}

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
			let userId: string | undefined;
			try {
				userId = getOptionalAccessToken(request)?.userId;
			} catch (error) {
				return authErrorResponse(error, "Invalid token");
			}

			const mode = normalizeChatMode((body as { mode?: string }).mode);
			const sessionId = await chatSessionService.createChatSession(
				userId,
				mode,
			);
			return { sessionId };
		},
		{
			body: t.Object({ mode: t.Optional(t.String()) }),
		},
	)
	.get("/:id", async ({ params, request }) => {
		const result = await getAuthorizedSession(params.id, request);
		if (result.response) return result.response;
		return result.session;
	})
	.get("/", async ({ request, query }) => {
		const payload = requireSessionToken(request);
		if (payload instanceof Response) return payload;

		const userId = payload.userId;
		if (!userId) return jsonError(401, "Invalid token");
		const limit = Math.min(Number(query?.limit ?? 20) || 20, 100);
		return await chatSessionService.getUserSessions(userId, limit);
	})
	.delete("/:id", async ({ params, request }) => {
		const result = await getAuthorizedSession(params.id, request);
		if (result.response) return result.response;

		const success = await chatSessionService.deleteSession(params.id);
		if (!success) return jsonError(404, "Session not found");
		return { success: true };
	})
	.get(
		"/:id/export",
		async ({
			params,
			query,
			request,
		}: {
			params: { id: string };
			query: { format?: string };
			request: Request;
		}) => {
			const format = query.format || "json";
			const sessionId = params.id;
			const result = await getAuthorizedSession(sessionId, request);
			if (result.response) return result.response;

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
	.get("/:id/stats", async ({ params, request }) => {
		const result = await getAuthorizedSession(params.id, request);
		if (result.response) return result.response;

		const stats = await chatSessionService.getSessionStats(params.id);
		if (!stats) return jsonError(404, "Session not found");
		return stats;
	});
