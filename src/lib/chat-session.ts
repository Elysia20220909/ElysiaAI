/**
 * セッション内の全メッセージを削除
 */
export async function clearSessionMessages(
	sessionId: string,
): Promise<boolean> {
	try {
		await prisma.message.deleteMany({ where: { sessionId } });
		await prisma.chatSession.update({
			where: { id: sessionId },
			data: { updatedAt: new Date() },
		});
		logger.info(`セッションメッセージ全削除: ${sessionId}`);
		return true;
	} catch (error) {
		logger.error(
			"セッションメッセージ全削除エラー",
			error instanceof Error ? error : undefined,
		);
		return false;
	}
}

/**
 * チャットセッション管理サービス
 * 会話履歴の永続化とセッション管理
 */

import { prisma } from "./database";
import { logger } from "./logger";

export interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

export interface ChatSessionWithMessages {
	id: string;
	userId: string | null;
	mode: string;
	createdAt: Date;
	updatedAt: Date;
	messages: {
		id: string;
		role: string;
		content: string;
		createdAt: Date;
	}[];
}

/**
 * 新しいチャットセッションを作成
 */
export async function createChatSession(
	userId?: string,
	mode: "sweet" | "normal" | "professional" = "normal",
): Promise<string> {
	try {
		const session = await prisma.chatSession.create({
			data: {
				userId: userId || null,
				mode,
			},
		});

		logger.info(`チャットセッション作成: ${session.id}`, {
			userId,
			mode,
		});

		return session.id;
	} catch (error) {
		logger.error(
			"チャットセッション作成エラー",
			error instanceof Error ? error : undefined,
		);
		throw error;
	}
}

/**
 * セッションにメッセージを追加
 */
export async function addMessageToSession(
	sessionId: string,
	role: "user" | "assistant" | "system",
	content: string,
): Promise<void> {
	try {
		await prisma.message.create({
			data: {
				sessionId,
				role,
				content,
			},
		});

		// セッションの更新日時を更新
		await prisma.chatSession.update({
			where: { id: sessionId },
			data: { updatedAt: new Date() },
		});

		logger.debug(`メッセージ追加: セッション ${sessionId}`, {
			role,
			contentLength: content.length,
		});
	} catch (error) {
		logger.error(
			"メッセージ追加エラー",
			error instanceof Error ? error : undefined,
		);
		throw error;
	}
}

/**
 * セッションの全メッセージを取得
 */
export async function getSessionMessages(
	sessionId: string,
): Promise<ChatMessage[]> {
	try {
		const messages = await prisma.message.findMany({
			where: { sessionId },
			orderBy: { createdAt: "asc" },
		});

		return messages.map((msg) => ({
			role: msg.role as "user" | "assistant" | "system",
			content: msg.content,
		}));
	} catch (error) {
		logger.error(
			"メッセージ取得エラー",
			error instanceof Error ? error : undefined,
		);
		return [];
	}
}

/**
 * セッション情報を取得（メッセージ含む）
 */
export async function getSession(
	sessionId: string,
): Promise<ChatSessionWithMessages | null> {
	try {
		const session = await prisma.chatSession.findUnique({
			where: { id: sessionId },
			include: {
				messages: {
					orderBy: { createdAt: "asc" },
				},
			},
		});

		return session;
	} catch (error) {
		logger.error(
			"セッション取得エラー",
			error instanceof Error ? error : undefined,
		);
		return null;
	}
}

/**
 * ユーザーの全セッションを取得
 */
export async function getUserSessions(
	userId: string,
	limit = 20,
): Promise<ChatSessionWithMessages[]> {
	try {
		const sessions = await prisma.chatSession.findMany({
			where: { userId },
			include: {
				messages: {
					orderBy: { createdAt: "asc" },
				},
			},
			orderBy: { updatedAt: "desc" },
			take: limit,
		});

		return sessions;
	} catch (error) {
		logger.error(
			"ユーザーセッション取得エラー",
			error instanceof Error ? error : undefined,
		);
		return [];
	}
}

/**
 * セッションを削除
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
	try {
		await prisma.chatSession.delete({
			where: { id: sessionId },
		});

		logger.info(`セッション削除: ${sessionId}`);
		return true;
	} catch (error) {
		logger.error(
			"セッション削除エラー",
			error instanceof Error ? error : undefined,
		);
		return false;
	}
}

/**
 * 古いセッションをクリーンアップ
 */
export async function cleanupOldSessions(daysOld = 30): Promise<number> {
	try {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysOld);

		const result = await prisma.chatSession.deleteMany({
			where: {
				updatedAt: {
					lt: cutoffDate,
				},
			},
		});

		logger.info(`古いセッションをクリーンアップ: ${result.count}件`, {
			daysOld,
			cutoffDate: cutoffDate.toISOString(),
		});

		return result.count;
	} catch (error) {
		logger.error(
			"セッションクリーンアップエラー",
			error instanceof Error ? error : undefined,
		);
		return 0;
	}
}

/**
 * セッションをJSON形式でエクスポート
 */
export async function exportSessionAsJSON(
	sessionId: string,
): Promise<string | null> {
	try {
		const session = await getSession(sessionId);
		if (!session) return null;

		const exportData = {
			sessionId: session.id,
			mode: session.mode,
			createdAt: session.createdAt.toISOString(),
			updatedAt: session.updatedAt.toISOString(),
			messages: session.messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
				timestamp: msg.createdAt.toISOString(),
			})),
		};

		return JSON.stringify(exportData, null, 2);
	} catch (error) {
		logger.error(
			"セッションエクスポートエラー",
			error instanceof Error ? error : undefined,
		);
		return null;
	}
}

/**
 * セッションをMarkdown形式でエクスポート
 */
export async function exportSessionAsMarkdown(
	sessionId: string,
): Promise<string | null> {
	try {
		const session = await getSession(sessionId);
		if (!session) return null;

		let markdown = "# チャットセッション\n\n";
		markdown += `**セッションID:** ${session.id}\n`;
		markdown += `**モード:** ${session.mode}\n`;
		markdown += `**作成日時:** ${session.createdAt.toLocaleString("ja-JP")}\n`;
		markdown += `**更新日時:** ${session.updatedAt.toLocaleString("ja-JP")}\n\n`;
		markdown += "---\n\n";

		for (const msg of session.messages) {
			const roleLabel =
				msg.role === "user"
					? "👤 ユーザー"
					: msg.role === "assistant"
						? "🤖 エリシア"
						: "⚙️ システム";

			markdown += `### ${roleLabel}\n`;
			markdown += `**時刻:** ${msg.createdAt.toLocaleString("ja-JP")}\n\n`;
			markdown += `${msg.content}\n\n`;
			markdown += "---\n\n";
		}

		return markdown;
	} catch (error) {
		logger.error(
			"Markdownエクスポートエラー",
			error instanceof Error ? error : undefined,
		);
		return null;
	}
}

/**
 * セッション統計を取得
 */
export async function getSessionStats(sessionId: string): Promise<{
	messageCount: number;
	userMessageCount: number;
	assistantMessageCount: number;
	averageMessageLength: number;
	duration: number; // 分単位
} | null> {
	try {
		const session = await getSession(sessionId);
		if (!session) return null;

		const userMessages = session.messages.filter((m) => m.role === "user");
		const assistantMessages = session.messages.filter(
			(m) => m.role === "assistant",
		);

		const totalLength = session.messages.reduce(
			(sum, msg) => sum + msg.content.length,
			0,
		);

		const duration =
			(session.updatedAt.getTime() - session.createdAt.getTime()) / 1000 / 60;

		return {
			messageCount: session.messages.length,
			userMessageCount: userMessages.length,
			assistantMessageCount: assistantMessages.length,
			averageMessageLength:
				session.messages.length > 0
					? Math.round(totalLength / session.messages.length)
					: 0,
			duration: Math.round(duration * 10) / 10,
		};
	} catch (error) {
		logger.error(
			"セッション統計エラー",
			error instanceof Error ? error : undefined,
		);
		return null;
	}
}
