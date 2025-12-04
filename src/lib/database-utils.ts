/**
 * Prisma データベース操作ユーティリティ
 * ユーザー、チャットセッション、フィードバック管理
 */

import { PrismaClient } from "@prisma/client";
import type { ChatSession, User, Feedback } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

// ============ ユーザー操作 ============

/**
 * ユーザー作成
 */
export async function createUser(
	username: string,
	password: string,
	role = "user",
): Promise<User> {
	const passwordHash = await bcryptjs.hash(password, 10);
	return prisma.user.create({
		data: {
			username,
			passwordHash,
			role,
		},
	});
}

/**
 * ユーザー取得
 */
export async function getUser(userId: string): Promise<User | null> {
	return prisma.user.findUnique({
		where: { id: userId },
	});
}

/**
 * ユーザー名でユーザー取得
 */
export async function getUserByUsername(
	username: string,
): Promise<User | null> {
	return prisma.user.findUnique({
		where: { username },
	});
}

/**
 * ユーザー認証
 */
export async function authenticateUser(
	username: string,
	password: string,
): Promise<User | null> {
	const user = await getUserByUsername(username);
	if (!user) return null;

	const isValid = await bcryptjs.compare(password, user.passwordHash);
	return isValid ? user : null;
}

/**
 * 全ユーザー取得
 */
export async function getAllUsers(): Promise<User[]> {
	return prisma.user.findMany({
		include: {
			chatSessions: { take: 5 },
			feedbacks: { take: 3 },
		},
	});
}

// ============ チャットセッション操作 ============

/**
 * チャットセッション作成
 */
export async function createChatSession(
	userId?: string,
	mode = "normal",
): Promise<ChatSession> {
	return prisma.chatSession.create({
		data: {
			userId: userId || undefined,
			mode,
		},
	});
}

/**
 * チャットセッション取得
 */
export async function getChatSession(
	sessionId: string,
): Promise<ChatSession | null> {
	return prisma.chatSession.findUnique({
		where: { id: sessionId },
		include: {
			messages: {
				orderBy: { createdAt: "asc" },
			},
		},
	});
}

/**
 * ユーザーのチャットセッション一覧
 */
export async function getUserChatSessions(
	userId: string,
): Promise<ChatSession[]> {
	return prisma.chatSession.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		include: {
			messages: { select: { id: true, role: true, content: true } },
		},
	});
}

/**
 * メッセージ保存
 */
export async function saveMessage(
	sessionId: string,
	role: "user" | "assistant" | "system",
	content: string,
): Promise<void> {
	await prisma.message.create({
		data: {
			sessionId,
			role,
			content,
		},
	});
}

// ============ フィードバック操作 ============

/**
 * フィードバック保存
 */
export async function saveFeedback(
	query: string,
	answer: string,
	rating: "up" | "down",
	userId?: string,
	reason?: string,
): Promise<Feedback> {
	return prisma.feedback.create({
		data: {
			userId: userId || undefined,
			query,
			answer,
			rating,
			reason,
		},
	});
}

/**
 * フィードバック一覧
 */
export async function getFeedbacks(
	limit = 50,
	offset = 0,
	rating?: "up" | "down",
): Promise<Feedback[]> {
	return prisma.feedback.findMany({
		where: rating ? { rating } : {},
		orderBy: { createdAt: "desc" },
		take: limit,
		skip: offset,
	});
}

/**
 * フィードバック統計
 */
export async function getFeedbackStats(): Promise<{
	total: number;
	up: number;
	down: number;
	upRate: number;
}> {
	const total = await prisma.feedback.count();
	const up = await prisma.feedback.count({
		where: { rating: "up" },
	});
	const down = await prisma.feedback.count({
		where: { rating: "down" },
	});

	return {
		total,
		up,
		down,
		upRate: total > 0 ? (up / total) * 100 : 0,
	};
}

// ============ ナレッジベース操作 ============

/**
 * ナレッジベース項目追加
 */
export async function addKnowledgeBase(
	question: string,
	answer: string,
	userId?: string,
	source = "user",
): Promise<void> {
	await prisma.knowledgeBase.create({
		data: {
			userId: userId || undefined,
			question,
			answer,
			source,
			verified: false,
		},
	});
}

/**
 * 検証済みナレッジベース取得
 */
export async function getVerifiedKnowledgeBase(
	limit = 100,
): Promise<Array<{ question: string; answer: string }>> {
	const items = await prisma.knowledgeBase.findMany({
		where: { verified: true },
		select: { question: true, answer: true },
		take: limit,
	});
	return items;
}

// ============ 音声ログ操作 ============

/**
 * 音声ログ保存
 */
export async function saveVoiceLog(
	username: string | undefined,
	text: string,
	emotion = "normal",
	audioUrl?: string,
): Promise<void> {
	await prisma.voiceLog.create({
		data: {
			username: username || undefined,
			text,
			emotion,
			audioUrl,
		},
	});
}

/**
 * ユーザーの音声ログ取得
 */
export async function getUserVoiceLogs(
	username: string,
	limit = 10,
): Promise<Array<{ text: string; emotion: string; createdAt: Date }>> {
	return prisma.voiceLog.findMany({
		where: { username },
		select: { text: true, emotion: true, createdAt: true },
		orderBy: { createdAt: "desc" },
		take: limit,
	});
}

// ============ クリーンアップ ============

/**
 * テスト用データクリア
 */
export async function clearTestData(): Promise<void> {
	await prisma.message.deleteMany({});
	await prisma.chatSession.deleteMany({});
	await prisma.feedback.deleteMany({});
	await prisma.knowledgeBase.deleteMany({});
	await prisma.voiceLog.deleteMany({});
	await prisma.refreshToken.deleteMany({});
	await prisma.user.deleteMany({});
}

/**
 * Prisma接続終了
 */
export async function disconnect(): Promise<void> {
	await prisma.$disconnect();
}

export { prisma };
