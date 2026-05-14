import { Elysia, t } from "elysia";
import {
	type AccessTokenPayload,
	authErrorResponse,
	requireAccessToken,
} from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import * as db from "../lib/database-utils.ts";
import { logger } from "../lib/logger";

type LegacyAuthBody = {
	username: string;
	password: string;
};

type LegacyChatSessionBody = {
	userId?: string;
	mode?: string;
};

type LegacyMessageBody = {
	sessionId: string;
	role: "user" | "assistant" | "system";
	content: string;
};

type LegacyFeedbackBody = {
	query: string;
	answer: string;
	rating: "up" | "down";
	reason?: string;
};

type LegacyKnowledgeBody = {
	content: string;
	topic?: string;
};

const legacyAuthBodySchema = t.Object({
	username: t.String({ minLength: 1, maxLength: 128 }),
	password: t.String({ minLength: 1, maxLength: 128 }),
});

const legacyRegisterBodySchema = t.Object({
	username: t.String({ minLength: 3, maxLength: 128 }),
	password: t.String({ minLength: 8, maxLength: 128 }),
});

const legacyChatSessionBodySchema = t.Object({
	userId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
	mode: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
});

const legacyMessageBodySchema = t.Object({
	sessionId: t.String({ minLength: 1, maxLength: 128 }),
	role: t.Union([
		t.Literal("user"),
		t.Literal("assistant"),
		t.Literal("system"),
	]),
	content: t.String({ minLength: 1, maxLength: 8000 }),
});

const legacyFeedbackBodySchema = t.Object({
	query: t.String({ minLength: 1, maxLength: 400 }),
	answer: t.String({ minLength: 1, maxLength: 4000 }),
	rating: t.Union([t.Literal("up"), t.Literal("down")]),
	reason: t.Optional(t.String({ maxLength: 1000 })),
});

const legacyKnowledgeBodySchema = t.Object({
	content: t.String({ minLength: 1, maxLength: 20000 }),
	topic: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
});

function publicUser(user: db.User) {
	return {
		id: user.id,
		username: user.username,
		role: user.role,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	};
}

function isAdminOperator(payload: AccessTokenPayload): boolean {
	return payload.role === "admin" || payload.role === "owner";
}

function requireLegacyDbOperator(
	request: Request,
): AccessTokenPayload | Response {
	try {
		const payload = requireAccessToken(request);
		if (!payload.userId && !isAdminOperator(payload)) {
			return jsonError(401, "Invalid token", "AUTH_TOKEN_INVALID");
		}
		return payload;
	} catch (error) {
		return authErrorResponse(error, "Legacy DB auth failed");
	}
}

function requireLegacyDbAdmin(request: Request): AccessTokenPayload | Response {
	const payload = requireLegacyDbOperator(request);
	if (payload instanceof Response) return payload;
	if (!isAdminOperator(payload)) {
		return jsonError(403, "Admin role required", "DB_ADMIN_REQUIRED");
	}
	return payload;
}

function canAccessUserResource(
	payload: AccessTokenPayload,
	userId: string | undefined,
): boolean {
	if (isAdminOperator(payload)) return true;
	return Boolean(userId && payload.userId === userId);
}

function legacyDbError(error: unknown, message = "Database request failed") {
	logger.error(
		"Legacy database route failed",
		error instanceof Error ? error : new Error(String(error)),
	);
	return jsonError(500, message, "DB_REQUEST_FAILED");
}

export const databaseRoutes = new Elysia({ prefix: "/db" })
	// ==================== ユーザー管理 ====================

	// ユーザー登録
	.post(
		"/api/auth/register",
		async ({ body }) => {
			try {
				const { username, password } = body as LegacyAuthBody;

				const user = await db.createUser(username, password);
				return { success: true, user: publicUser(user) };
			} catch (error: unknown) {
				logger.warn("Legacy user registration failed", {
					error: error instanceof Error ? error.message : "unknown",
				});
				return jsonError(
					400,
					"User already exists or registration failed",
					"DB_AUTH_REGISTER_FAILED",
				);
			}
		},
		{ body: legacyRegisterBodySchema },
	)

	// ユーザーログイン
	.post(
		"/api/auth/login",
		async ({ body }) => {
			try {
				const { username, password } = body as LegacyAuthBody;

				const user = await db.authenticateUser(username, password);
				if (!user) {
					return jsonError(
						401,
						"認証に失敗しました",
						"DB_AUTH_INVALID_CREDENTIALS",
					);
				}

				return { success: true, user: publicUser(user) };
			} catch (error: unknown) {
				return legacyDbError(error, "Authentication request failed");
			}
		},
		{ body: legacyAuthBodySchema },
	)

	// ==================== チャット管理 ====================

	// チャットセッション作成
	.post(
		"/api/chat/session",
		async ({ body, request }) => {
			const operator = requireLegacyDbOperator(request);
			if (operator instanceof Response) return operator;

			try {
				const { userId: requestedUserId, mode } = body as LegacyChatSessionBody;

				const userId = isAdminOperator(operator)
					? requestedUserId || operator.userId
					: operator.userId;
				if (!userId) {
					return jsonError(401, "Invalid token", "AUTH_TOKEN_INVALID");
				}

				const session = await db.createChatSession(userId, mode || "normal");
				return { success: true, session };
			} catch (error: unknown) {
				return legacyDbError(error);
			}
		},
		{ body: legacyChatSessionBodySchema },
	)

	// メッセージ保存
	.post(
		"/api/chat/message",
		async ({ body, request }) => {
			const operator = requireLegacyDbOperator(request);
			if (operator instanceof Response) return operator;

			try {
				const { sessionId, role, content } = body as LegacyMessageBody;
				const session = await db.getChatSession(sessionId);
				if (!session) {
					return jsonError(
						404,
						"セッションが見つかりません",
						"DB_SESSION_NOT_FOUND",
					);
				}
				if (!canAccessUserResource(operator, session.userId)) {
					return jsonError(403, "Forbidden", "DB_SESSION_FORBIDDEN");
				}

				await db.saveMessage(sessionId, role, content);
				return { success: true };
			} catch (error: unknown) {
				return legacyDbError(error);
			}
		},
		{ body: legacyMessageBodySchema },
	)

	// チャット履歴取得
	.get("/api/chat/session/:sessionId", async ({ params, request }) => {
		const operator = requireLegacyDbOperator(request);
		if (operator instanceof Response) return operator;

		try {
			const { sessionId } = params as { sessionId: string };

			const session = await db.getChatSession(sessionId);
			if (!session) {
				return jsonError(
					404,
					"セッションが見つかりません",
					"DB_SESSION_NOT_FOUND",
				);
			}
			if (!canAccessUserResource(operator, session.userId)) {
				return jsonError(403, "Forbidden", "DB_SESSION_FORBIDDEN");
			}

			return { success: true, session };
		} catch (error: unknown) {
			return legacyDbError(error);
		}
	})

	// ==================== フィードバック管理 ====================

	// フィードバック保存
	.post(
		"/api/feedback",
		async ({ body, request }) => {
			const operator = requireLegacyDbOperator(request);
			if (operator instanceof Response) return operator;

			try {
				const { query, answer, rating, reason } = body as LegacyFeedbackBody;

				const feedback = await db.saveFeedback(
					query,
					answer,
					rating,
					operator.userId,
					reason,
				);
				return { success: true, feedback };
			} catch (error: unknown) {
				return legacyDbError(error);
			}
		},
		{ body: legacyFeedbackBodySchema },
	)

	// フィードバック統計
	.get("/api/feedback/stats", async ({ request }) => {
		const operator = requireLegacyDbAdmin(request);
		if (operator instanceof Response) return operator;

		try {
			const stats = await db.getFeedbackStats();
			return { success: true, stats };
		} catch (error: unknown) {
			return legacyDbError(error);
		}
	})

	// ==================== ナレッジベース管理 ====================

	// ナレッジベース追加
	.post(
		"/api/knowledge",
		async ({ body, request }) => {
			const operator = requireLegacyDbAdmin(request);
			if (operator instanceof Response) return operator;

			try {
				const { content, topic } = body as LegacyKnowledgeBody;

				const knowledge = await db.addKnowledgeBase(
					content,
					topic,
					operator.userId,
				);
				return { success: true, knowledge };
			} catch (error: unknown) {
				return legacyDbError(error);
			}
		},
		{ body: legacyKnowledgeBodySchema },
	)

	// 検証済みナレッジ取得
	.get("/api/knowledge/verified", async ({ request }) => {
		const operator = requireLegacyDbAdmin(request);
		if (operator instanceof Response) return operator;

		try {
			const knowledge = await db.getVerifiedKnowledgeBase();
			return { success: true, knowledge };
		} catch (error: unknown) {
			return legacyDbError(error);
		}
	});
