/**
 * Prisma データベース操作ユーティリティ
 * Bun:sqlite を使用したシンプルな実装
 */

import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import bcryptjs from "bcryptjs";

// SQLite データベース接続
const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./prisma/dev.db";
const db = new Database(dbPath);

// ============ ユーザー操作 ============

export interface User {
	id: string;
	username: string;
	passwordHash: string;
	role: string;
	createdAt: Date;
	updatedAt: Date;
}

export async function createUser(username: string, password: string, role = "user"): Promise<User> {
	const id = randomUUID();
	const passwordHash = await bcryptjs.hash(password, 10);
	const now = new Date();

	const stmt = db.prepare(
		"INSERT INTO users (id, username, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
	);
	stmt.run(id, username, passwordHash, role, now.toISOString(), now.toISOString());

	return {
		id,
		username,
		passwordHash,
		role,
		createdAt: now,
		updatedAt: now,
	};
}

export async function getUser(userId: string): Promise<User | null> {
	const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
	const row = stmt.get(userId) as Record<string, unknown> | undefined;
	return row
		? {
				id: row.id as string,
				username: row.username as string,
				passwordHash: row.passwordHash as string,
				role: row.role as string,
				createdAt: new Date(row.createdAt as string),
				updatedAt: new Date(row.updatedAt as string),
			}
		: null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
	const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
	const row = stmt.get(username) as Record<string, unknown> | undefined;
	return row
		? {
				id: row.id as string,
				username: row.username as string,
				passwordHash: row.passwordHash as string,
				role: row.role as string,
				createdAt: new Date(row.createdAt as string),
				updatedAt: new Date(row.updatedAt as string),
			}
		: null;
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
	const user = await getUserByUsername(username);
	if (!user) return null;

	const isValid = await bcryptjs.compare(password, user.passwordHash);
	return isValid ? user : null;
}

export async function getAllUsers(): Promise<User[]> {
	const stmt = db.prepare("SELECT * FROM users LIMIT 100");
	const rows = stmt.all() as Record<string, unknown>[];
	return rows.map((row) => ({
		id: row.id as string,
		username: row.username as string,
		passwordHash: row.passwordHash as string,
		role: row.role as string,
		createdAt: new Date(row.createdAt as string),
		updatedAt: new Date(row.updatedAt as string),
	}));
}

// ============ チャットセッション操作 ============

export interface ChatSession {
	id: string;
	userId?: string;
	mode: string;
	createdAt: Date;
	updatedAt: Date;
}

export async function createChatSession(userId?: string, mode = "normal"): Promise<ChatSession> {
	const id = randomUUID();
	const now = new Date();

	const stmt = db.prepare(
		"INSERT INTO chat_sessions (id, userId, mode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
	);
	stmt.run(id, userId || null, mode, now.toISOString(), now.toISOString());

	return { id, userId, mode, createdAt: now, updatedAt: now };
}

export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
	const stmt = db.prepare("SELECT * FROM chat_sessions WHERE id = ?");
	const row = stmt.get(sessionId) as Record<string, unknown> | undefined;
	return row
		? {
				id: row.id as string,
				userId: (row.userId as string) || undefined,
				mode: row.mode as string,
				createdAt: new Date(row.createdAt as string),
				updatedAt: new Date(row.updatedAt as string),
			}
		: null;
}

export async function getUserChatSessions(userId: string): Promise<ChatSession[]> {
	const stmt = db.prepare(
		"SELECT * FROM chat_sessions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50",
	);
	const rows = stmt.all(userId) as Record<string, unknown>[];
	return rows.map((row) => ({
		id: row.id as string,
		userId: (row.userId as string) || undefined,
		mode: row.mode as string,
		createdAt: new Date(row.createdAt as string),
		updatedAt: new Date(row.updatedAt as string),
	}));
}

export async function saveMessage(
	sessionId: string,
	role: "user" | "assistant" | "system",
	content: string,
): Promise<void> {
	const id = randomUUID();
	const stmt = db.prepare(
		"INSERT INTO messages (id, sessionId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)",
	);
	stmt.run(id, sessionId, role, content, new Date().toISOString());
}

// ============ フィードバック操作 ============

export interface Feedback {
	id: string;
	userId?: string;
	query: string;
	answer: string;
	rating: "up" | "down";
	reason?: string;
	createdAt: Date;
}

export async function saveFeedback(
	query: string,
	answer: string,
	rating: "up" | "down",
	userId?: string,
	reason?: string,
): Promise<Feedback> {
	const id = randomUUID();
	const now = new Date();

	const stmt = db.prepare(
		"INSERT INTO feedbacks (id, userId, query, answer, rating, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
	);
	stmt.run(id, userId || null, query, answer, rating, reason || null, now.toISOString());

	return { id, userId, query, answer, rating, reason, createdAt: now };
}

export async function getFeedbacks(
	limit = 50,
	offset = 0,
	rating?: "up" | "down",
): Promise<Feedback[]> {
	let stmt: ReturnType<typeof db.prepare>;
	let result: Record<string, unknown>[];

	if (rating) {
		stmt = db.prepare(
			"SELECT * FROM feedbacks WHERE rating = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?",
		);
		result = stmt.all(rating, limit, offset) as Record<string, unknown>[];
	} else {
		stmt = db.prepare("SELECT * FROM feedbacks ORDER BY createdAt DESC LIMIT ? OFFSET ?");
		result = stmt.all(limit, offset) as Record<string, unknown>[];
	}

	return result.map((row) => ({
		id: row.id as string,
		userId: (row.userId as string) || undefined,
		query: row.query as string,
		answer: row.answer as string,
		rating: row.rating as "up" | "down",
		reason: (row.reason as string) || undefined,
		createdAt: new Date(row.createdAt as string),
	}));
}

export async function getFeedbackStats(): Promise<{
	total: number;
	up: number;
	down: number;
	upRate: number;
}> {
	const totalStmt = db.prepare("SELECT COUNT(*) as count FROM feedbacks");
	const upStmt = db.prepare("SELECT COUNT(*) as count FROM feedbacks WHERE rating = 'up'");
	const downStmt = db.prepare("SELECT COUNT(*) as count FROM feedbacks WHERE rating = 'down'");

	const total = (totalStmt.get() as { count: number }).count;
	const up = (upStmt.get() as { count: number }).count;
	const down = (downStmt.get() as { count: number }).count;

	return {
		total,
		up,
		down,
		upRate: total > 0 ? (up / total) * 100 : 0,
	};
}

// ============ ナレッジベース操作 ============

export async function addKnowledgeBase(
	content: string,
	topic?: string,
	userId?: string,
): Promise<void> {
	const id = randomUUID();
	const now = new Date();

	const stmt = db.prepare(
		"INSERT INTO knowledge_base (id, userId, content, topic, verified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
	);
	stmt.run(id, userId || null, content, topic || null, 1, now.toISOString(), now.toISOString());
}

export async function getVerifiedKnowledgeBase(
	limit = 100,
): Promise<Array<{ content: string; topic?: string }>> {
	const stmt = db.prepare("SELECT content, topic FROM knowledge_base WHERE verified = 1 LIMIT ?");
	return stmt.all(limit) as Array<{ content: string; topic?: string }>;
}

// ============ 音声ログ操作 ============

export async function saveVoiceLog(
	username: string | undefined,
	voiceText: string,
	language = "ja",
	synthesisType?: string,
): Promise<void> {
	const id = randomUUID();

	const stmt = db.prepare(
		"INSERT INTO voice_logs (id, username, voiceText, language, synthesisType, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
	);
	stmt.run(
		id,
		username || null,
		voiceText,
		language,
		synthesisType || null,
		new Date().toISOString(),
	);
}

export async function getUserVoiceLogs(
	username: string,
	limit = 10,
): Promise<Array<{ voiceText: string; language: string; createdAt: Date }>> {
	const stmt = db.prepare(
		"SELECT voiceText, language, createdAt FROM voice_logs WHERE username = ? ORDER BY createdAt DESC LIMIT ?",
	);
	const rows = stmt.all(username, limit) as Record<string, unknown>[];
	return rows.map((row) => ({
		voiceText: row.voiceText as string,
		language: row.language as string,
		createdAt: new Date(row.createdAt as string),
	}));
}

// ============ クリーンアップ ============

export async function clearTestData(): Promise<void> {
	db.exec("DELETE FROM messages");
	db.exec("DELETE FROM chat_sessions");
	db.exec("DELETE FROM feedbacks");
	db.exec("DELETE FROM knowledge_base");
	db.exec("DELETE FROM voice_logs");
	db.exec("DELETE FROM refresh_tokens");
	db.exec("DELETE FROM users");
}

// Prisma互換の簡易ラッパー（テスト用）
export const prisma = {
	async $queryRaw<T = unknown>(query: TemplateStringsArray | string, ...params: unknown[]): Promise<T> {
		const sql = Array.isArray(query) ? query.join("") : query;
		const trimmed = sql.trim();
		const stmt = db.prepare(trimmed);

		if (trimmed.toUpperCase().startsWith("SELECT")) {
			return stmt.all(...params) as T;
		}

		stmt.run(...params);
		return [] as T;
	},
};

export function disconnect(): void {
	db.close();
}

export { db };
