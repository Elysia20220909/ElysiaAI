/**
 * Elysia API ルート - データベース統合
 * ユーザー認証、チャット、フィードバックのエンドポイント
 */

import type { Elysia } from 'elysia';
import * as db from '@/lib/database-utils';

export const setupDatabaseRoutes = (app: Elysia): Elysia => {
  return (
    app
    // ==================== ユーザー管理 ====================

    // ユーザー登録
      .post('/api/auth/register', async ({ body, set }) => {
        try {
          const { username, password } = body as {
						username: string;
						password: string;
					};

          if (!username || !password) {
            set.status = 400;
            return { error: 'ユーザー名とパスワードが必要です' };
          }

          const user = await db.createUser(username, password);
          return { success: true, user };
        } catch (error: unknown) {
          set.status = 500;
          return {
            error:
							error instanceof Error ? error.message : 'エラーが発生しました',
          };
        }
      })

    // ユーザーログイン
      .post('/api/auth/login', async ({ body, set }) => {
        try {
          const { username, password } = body as {
						username: string;
						password: string;
					};

          const user = await db.authenticateUser(username, password);
          if (!user) {
            set.status = 401;
            return { error: '認証に失敗しました' };
          }

          return { success: true, user };
        } catch (error: unknown) {
          set.status = 500;
          return {
            error:
							error instanceof Error ? error.message : 'エラーが発生しました',
          };
        }
      })

    // ==================== チャット管理 ====================

    // チャットセッション作成
      .post('/api/chat/session', async ({ body, set }) => {
        try {
          const { userId, mode } = body as { userId: string; mode?: string };

          if (!userId) {
            set.status = 400;
            return { error: 'ユーザーIDが必要です' };
          }

          const session = await db.createChatSession(userId, mode || 'normal');
          return { success: true, session };
        } catch (error: unknown) {
          set.status = 500;
          return {
            error:
							error instanceof Error ? error.message : 'エラーが発生しました',
          };
        }
      })

    // メッセージ保存
      .post('/api/chat/message', async ({ body, set }) => {
        try {
          const { sessionId, role, content } = body as {
						sessionId: string;
						role: string;
						content: string;
					};

          if (!sessionId || !role || !content) {
            set.status = 400;
            return { error: 'セッションID、ロール、コンテンツが必要です' };
          }

          const message = await db.saveMessage(sessionId, role, content);
          return { success: true, message };
        } catch (error: unknown) {
          set.status = 500;
          return {
            error:
							error instanceof Error ? error.message : 'エラーが発生しました',
          };
        }
      })

    // チャット履歴取得
      .get('/api/chat/session/:sessionId', async ({ params, set }) => {
        try {
          const { sessionId } = params as { sessionId: string };

          const session = await db.getChatSession(sessionId);
          if (!session) {
            set.status = 404;
            return { error: 'セッションが見つかりません' };
          }

          return { success: true, session };
        } catch (error: unknown) {
          set.status = 500;
          return {
            error:
							error instanceof Error ? error.message : 'エラーが発生しました',
          };
        }
      })

    // ==================== フィードバック管理 ====================

    // フィードバック保存
      .post('/api/feedback', async ({ body, set }) => {
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
							error instanceof Error ? error.message : 'エラーが発生しました',
          };
        }
      })

    // フィードバック統計
      .get('/api/feedback/stats', async ({ set }) => {
        try {
          const stats = await db.getFeedbackStats();
          return { success: true, stats };
        } catch (error: unknown) {
          set.status = 500;
          return {
            error:
							error instanceof Error ? error.message : 'エラーが発生しました',
          };
        }
      })

    // ==================== ナレッジベース管理 ====================

    // ナレッジベース追加
      .post('/api/knowledge', async ({ body, set }) => {
        try {
          const { userId, content, topic } = body as {
						userId?: string;
						content: string;
						topic?: string;
					};

          if (!content) {
            set.status = 400;
            return { error: 'コンテンツが必要です' };
          }

          const knowledge = await db.addKnowledgeBase(content, topic, userId);
          return { success: true, knowledge };
        } catch (error: unknown) {
          set.status = 500;
          return {
            error:
							error instanceof Error ? error.message : 'エラーが発生しました',
          };
        }
      })

    // 検証済みナレッジ取得
      .get('/api/knowledge/verified', async ({ set }) => {
        try {
          const knowledge = await db.getVerifiedKnowledgeBase();
          return { success: true, knowledge };
        } catch (error: unknown) {
          set.status = 500;
          return {
            error:
							error instanceof Error ? error.message : 'エラーが発生しました',
          };
        }
      })
  );
};
