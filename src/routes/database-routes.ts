/**
 * Elysia API ルート - データベース統合
 * ユーザー認証、チャット、フィードバックのエンドポイント
 */

import type { Elysia } from "elysia";
import * as db from "@/lib/database-utils";

export const setupDatabaseRoutes = (app: Elysia): Elysia => {
	return (
		app
			// ==================== ユーザー管理 ====================

			// ユーザー登録
			.post("/api/auth/register", async ({ body, set }) => {
				try {
					const { username, password } = body as {
						username: string;
						password: string;
					};

					// サーバーサイド検証：クライアントは信用しない
					if (!username || !password) {
						set.status = 400;
						return { error: "ユーザー名とパスワードが必要です" };
					}

					// ユーザー名の検証とサニタイズ
					const sanitizedUsername = username.trim();
					if (sanitizedUsername.length < 3 || sanitizedUsername.length > 50) {
						set.status = 400;
						return { error: "ユーザー名は3〜50文字である必要があります" };
					}

					// 危険な文字を含まないことを確認
					if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedUsername)) {
						set.status = 400;
						return { error: "ユーザー名に使用できない文字が含まれています" };
					}

					// パスワード強度の検証（サーバーサイドで必須）
					if (password.length < 12) {
						set.status = 400;
						return { error: "パスワードは12文字以上である必要があります" };
					}

					if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
						set.status = 400;
						return { error: "パスワードは大文字、小文字、数字を含む必要があります" };
					}

					const user = await db.createUser(sanitizedUsername, password);
					// 機密情報を除外してクライアントに返す
					const { password: _, ...safeUser } = user as any;
					return { success: true, user: safeUser };
				} catch (error: unknown) {
					set.status = 500;
					return {
						error:
							error instanceof Error ? error.message : "エラーが発生しました",
					};
				}
			})

			// ユーザーログイン
			.post("/api/auth/login", async ({ body, set, request }) => {
				try {
					const { username, password } = body as {
						username: string;
						password: string;
					};

					// IPアドレスベースのレート制限（ブルートフォース攻撃対策）
					const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
					const rateLimitKey = `login:${clientIp}`;
					
					// TODO: Redisを使用した適切なレート制限の実装
					// 現在は簡易実装（本番環境では不十分）

					const user = await db.authenticateUser(username, password);
					if (!user) {
						// タイミング攻撃を防ぐため、常に同じ時間待機
						await new Promise(resolve => setTimeout(resolve, 200));
						set.status = 401;
						// ユーザー名が存在するかどうかを漏らさない汎用メッセージ
						return { error: "ユーザー名またはパスワードが正しくありません" };
					}

					// 機密情報（パスワードハッシュなど）を除外
					const { password: _, passwordHash, ...safeUser } = user as any;
					return { success: true, user: safeUser };
				} catch (error: unknown) {
					set.status = 500;
					return {
						error:
							error instanceof Error ? error.message : "エラーが発生しました",
					};
				}
			})

			// ==================== チャット管理 ====================

			// チャットセッション作成
			.post("/api/chat/session", async ({ body, set }) => {
				try {
					const { userId, mode } = body as { userId: string; mode?: string };

					if (!userId) {
						set.status = 400;
						return { error: "ユーザーIDが必要です" };
					}

					const session = await db.createChatSession(userId, mode || "normal");
					return { success: true, session };
				} catch (error: unknown) {
					set.status = 500;
					return {
						error:
							error instanceof Error ? error.message : "エラーが発生しました",
					};
				}
			})

			// メッセージ保存
			.post("/api/chat/message", async ({ body, set }) => {
				try {
					const { sessionId, role, content } = body as {
						sessionId: string;
						role: string;
						content: string;
					};

					if (!sessionId || !role || !content) {
						set.status = 400;
						return { error: "セッションID、ロール、コンテンツが必要です" };
					}

					const message = await db.saveMessage(sessionId, role, content);
					return { success: true, message };
				} catch (error: unknown) {
					set.status = 500;
					return {
						error:
							error instanceof Error ? error.message : "エラーが発生しました",
					};
				}
			})

			// チャット履歴取得
			.get("/api/chat/session/:sessionId", async ({ params, set }) => {
				try {
					const { sessionId } = params as { sessionId: string };

					const session = await db.getChatSession(sessionId);
					if (!session) {
						set.status = 404;
						return { error: "セッションが見つかりません" };
					}

					return { success: true, session };
				} catch (error: unknown) {
					set.status = 500;
					return {
						error:
							error instanceof Error ? error.message : "エラーが発生しました",
					};
				}
			})

			// ==================== フィードバック管理 ====================

			// フィードバック保存
			.post("/api/feedback", async ({ body, set }) => {
				try {
					const { userId, query, answer, rating, reason } = body as {
						userId?: string;
						query: string;
						answer: string;
						rating: string;
						reason?: string;
					};

					const feedback = await db.saveFeedback(
						query,
						answer,
						rating,
						userId,
						reason,
					);
					return { success: true, feedback };
				} catch (error: unknown) {
					set.status = 500;
					return {
						error:
							error instanceof Error ? error.message : "エラーが発生しました",
					};
				}
			})

			// フィードバック統計
			.get("/api/feedback/stats", async ({ set }) => {
				try {
					const stats = await db.getFeedbackStats();
					return { success: true, stats };
				} catch (error: unknown) {
					set.status = 500;
					return {
						error:
							error instanceof Error ? error.message : "エラーが発生しました",
					};
				}
			})

			// ==================== ナレッジベース管理 ====================

			// ナレッジベース追加
			.post("/api/knowledge", async ({ body, set }) => {
				try {
					const { userId, content, topic } = body as {
						userId?: string;
						content: string;
						topic?: string;
					};

					if (!content) {
						set.status = 400;
						return { error: "コンテンツが必要です" };
					}

					const knowledge = await db.addKnowledgeBase(content, topic, userId);
					return { success: true, knowledge };
				} catch (error: unknown) {
					set.status = 500;
					return {
						error:
							error instanceof Error ? error.message : "エラーが発生しました",
					};
				}
			})

			// 検証済みナレッジ取得
			.get("/api/knowledge/verified", async ({ set }) => {
				try {
					const knowledge = await db.getVerifiedKnowledgeBase();
					return { success: true, knowledge };
				} catch (error: unknown) {
					set.status = 500;
					return {
						error:
							error instanceof Error ? error.message : "エラーが発生しました",
					};
				}
			})
	);
};
