import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import { CONFIG, jsonError } from "../lib/constants";
import * as chatSessionService from "../lib/chat-session";

export const sessionRoutes = new Elysia({ prefix: "/sessions" })
    .post(
        "/",
        async ({ body, request }: any) => {
            const auth = request.headers.get("authorization") || "";
            let userId: string | undefined;
            try {
                if (auth.startsWith("Bearer ")) {
                    const payload = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as jwt.JwtPayload;
                    userId = (payload as { userId?: string }).userId;
                }
            } catch {}

            const mode = (body as { mode?: string }).mode || "normal";
            const sessionId = await chatSessionService.createChatSession(userId, mode as any);
            return { sessionId };
        },
        {
            body: t.Object({ mode: t.Optional(t.String()) })
        }
    )
    .get("/:id", async ({ params }) => {
        const session = await chatSessionService.getSession(params.id);
        if (!session) return jsonError(404, "Session not found");
        return session;
    })
    .get("/", async ({ request, query }: any) => {
        const auth = request.headers.get("authorization") || "";
        if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
        try {
            const payload = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as any;
            const userId = payload.userId;
            if (!userId) return jsonError(401, "Invalid token");
            const limit = Number(query?.limit ?? 20) || 20;
            return await chatSessionService.getUserSessions(userId, limit);
        } catch { return jsonError(401, "Invalid token"); }
    })
    .delete("/:id", async ({ params, request }: any) => {
        const auth = request.headers.get("authorization") || "";
        if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing Bearer token");
        try {
            jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
            const success = await chatSessionService.deleteSession(params.id);
            if (!success) return jsonError(404, "Session not found");
            return { success: true };
        } catch { return jsonError(401, "Invalid token"); }
    })
    .get("/:id/export", async ({ params, query }: any) => {
        const format = (query?.format as string) || "json";
        const sessionId = params.id;
        if (format === "json") {
            const data = await chatSessionService.exportSessionAsJSON(sessionId);
            if (!data) return jsonError(404, "Session not found");
            return new Response(data as any, {
                headers: {
                    "content-type": "application/json",
                    "content-disposition": `attachment; filename="session-${sessionId}.json"`,
                },
            });
        }
        if (format === "markdown") {
            const data = await chatSessionService.exportSessionAsMarkdown(sessionId);
            if (!data) return jsonError(404, "Session not found");
            return new Response(data, {
                headers: {
                    "content-type": "text/markdown",
                    "content-disposition": `attachment; filename="session-${sessionId}.md"`,
                },
            });
        }
        return jsonError(400, "Invalid format");
    })
    .get("/:id/stats", async ({ params }) => {
        const stats = await chatSessionService.getSessionStats(params.id);
        if (!stats) return jsonError(404, "Session not found");
        return stats;
    });
