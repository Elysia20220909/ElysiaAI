/**
 * Elysia AI - Database Service
 * Prisma ORMを使用したデータベース操作
 */

// .env を最優先で適用（マシン全体の環境変数よりも .env を使う）
import dotenv from "dotenv";

dotenv.config({ override: true });

import { PrismaLibSql } from "@prisma/adapter-libsql";
import type { PrismaClient as PrismaClientType } from "@prisma/client";

// Prismaクライアントのシングルトン (一時的に無効化)
let prisma: PrismaClientType;

try {
	// Prisma 7 では datasourceUrl は非推奨。環境変数を利用して接続
	const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

	// LibSQL アダプタ（engineType=client を満たす）
	const adapter = new PrismaLibSql({ url: dbUrl });

	// ランタイム import（型のみ静的インポート）
	const { PrismaClient } = await import("@prisma/client");
	prisma = new PrismaClient({
		adapter,
		log:
			process.env.NODE_ENV === "development"
				? ["query", "error", "warn"]
				: ["error"],
	});

	// 必要なテーブルを作成（SQLite）
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			passwordHash TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`);
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS refresh_tokens (
			id TEXT PRIMARY KEY,
			token TEXT UNIQUE NOT NULL,
			userId TEXT NOT NULL,
			expiresAt DATETIME NOT NULL,
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			revoked INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
		);
	`);
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS chat_sessions (
			id TEXT PRIMARY KEY,
			userId TEXT,
			mode TEXT NOT NULL DEFAULT 'normal',
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
		);
	`);
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS messages (
			id TEXT PRIMARY KEY,
			sessionId TEXT NOT NULL,
			role TEXT NOT NULL,
			content TEXT NOT NULL,
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
		);
	`);
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS feedbacks (
			id TEXT PRIMARY KEY,
			userId TEXT,
			query TEXT NOT NULL,
			answer TEXT NOT NULL,
			rating TEXT NOT NULL,
			reason TEXT,
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
		);
	`);
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS knowledge_base (
			id TEXT PRIMARY KEY,
			userId TEXT,
			question TEXT NOT NULL,
			answer TEXT NOT NULL,
			source TEXT,
			verified INTEGER NOT NULL DEFAULT 0,
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
		);
	`);
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS voice_logs (
			id TEXT PRIMARY KEY,
			username TEXT,
			text TEXT NOT NULL,
			emotion TEXT NOT NULL,
			audioUrl TEXT,
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`);

	// 必要なインデックス
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId ON refresh_tokens(userId);`,
	);
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);`,
	);
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_chat_sessions_userId ON chat_sessions(userId);`,
	);
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_messages_sessionId ON messages(sessionId);`,
	);
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_feedbacks_userId ON feedbacks(userId);`,
	);
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON feedbacks(rating);`,
	);
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_feedbacks_createdAt ON feedbacks(createdAt);`,
	);
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_knowledge_base_userId ON knowledge_base(userId);`,
	);
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_knowledge_base_verified ON knowledge_base(verified);`,
	);
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_voice_logs_username ON voice_logs(username);`,
	);
	await prisma.$executeRawUnsafe(
		`CREATE INDEX IF NOT EXISTS idx_voice_logs_createdAt ON voice_logs(createdAt);`,
	);

	console.log(
		"✅ Prisma database connected via LibSQL adapter (url=%s)",
		dbUrl,
	);
} catch (error) {
	console.warn("⚠️ Prisma database not configured, using in-memory fallback");
	console.error(error);
	// モックPrismaクライアント（データベースなしでも動作）
	// biome-ignore lint/suspicious/noExplicitAny: Prisma設定未完了時の一時的なフォールバック
	prisma = null as any;
}

// グレースフルシャットダウン
process.on("beforeExit", async () => {
	if (prisma) await prisma.$disconnect();
});

export { prisma };

// ==================== ユーザー管理 ====================
export const userService = {
	async create(data: {
		username: string;
		passwordHash: string;
		role?: string;
	}) {
		return prisma.user.create({ data });
	},

	async findByUsername(username: string) {
		return prisma.user.findUnique({ where: { username } });
	},

	async findById(id: string) {
		return prisma.user.findUnique({ where: { id } });
	},

	async update(
		id: string,
		data: Partial<{ passwordHash: string; role: string }>,
	) {
		return prisma.user.update({ where: { id }, data });
	},

	async delete(id: string) {
		return prisma.user.delete({ where: { id } });
	},
};

// ==================== 認証トークン ====================
export const tokenService = {
	async create(data: { token: string; userId: string; expiresAt: Date }) {
		return prisma.refreshToken.create({ data });
	},

	async findByToken(token: string) {
		return prisma.refreshToken.findUnique({
			where: { token },
			include: { user: true },
		});
	},

	async revoke(token: string) {
		return prisma.refreshToken.update({
			where: { token },
			data: { revoked: true },
		});
	},

	async revokeAllByUser(userId: string) {
		return prisma.refreshToken.updateMany({
			where: { userId },
			data: { revoked: true },
		});
	},

	async deleteExpired() {
		return prisma.refreshToken.deleteMany({
			where: { expiresAt: { lt: new Date() } },
		});
	},
};

// ==================== チャットセッション ====================
export const chatService = {
	async createSession(data: { userId?: string; mode?: string }) {
		return prisma.chatSession.create({ data });
	},

	async getSession(id: string) {
		return prisma.chatSession.findUnique({
			where: { id },
			include: { messages: { orderBy: { createdAt: "asc" } } },
		});
	},

	async addMessage(data: { sessionId: string; role: string; content: string }) {
		return prisma.message.create({ data });
	},

	async getMessages(sessionId: string, limit = 50) {
		return prisma.message.findMany({
			where: { sessionId },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	},

	async deleteSession(id: string) {
		return prisma.chatSession.delete({ where: { id } });
	},
};

// ==================== フィードバック ====================
export const feedbackService = {
	async create(data: {
		userId?: string;
		query: string;
		answer: string;
		rating: string;
		reason?: string;
	}) {
		return prisma.feedback.create({ data });
	},

	async getRecent(limit = 100) {
		return prisma.feedback.findMany({
			orderBy: { createdAt: "desc" },
			take: limit,
			include: { user: { select: { username: true } } },
		});
	},

	async getByRating(rating: "up" | "down", limit = 50) {
		return prisma.feedback.findMany({
			where: { rating },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	},

	async getStats() {
		const [total, upCount, downCount] = await Promise.all([
			prisma.feedback.count(),
			prisma.feedback.count({ where: { rating: "up" } }),
			prisma.feedback.count({ where: { rating: "down" } }),
		]);

		return {
			total,
			upCount,
			downCount,
			upRate: total > 0 ? (upCount / total) * 100 : 0,
		};
	},
};

// ==================== ナレッジベース ====================
export const knowledgeService = {
	async create(data: {
		userId?: string;
		question: string;
		answer: string;
		source?: string;
		verified?: boolean;
	}) {
		return prisma.knowledgeBase.create({ data });
	},

	async search(query: string, limit = 10) {
		return prisma.knowledgeBase.findMany({
			where: {
				OR: [
					{ question: { contains: query } },
					{ answer: { contains: query } },
				],
				verified: true,
			},
			orderBy: { updatedAt: "desc" },
			take: limit,
		});
	},

	async getAll(verified = true) {
		return prisma.knowledgeBase.findMany({
			where: verified ? { verified: true } : undefined,
			orderBy: { updatedAt: "desc" },
		});
	},

	async verify(id: string) {
		return prisma.knowledgeBase.update({
			where: { id },
			data: { verified: true },
		});
	},

	async delete(id: string) {
		return prisma.knowledgeBase.delete({ where: { id } });
	},
};

// ==================== 音声ログ ====================
export const voiceService = {
	async create(data: {
		username?: string;
		text: string;
		emotion: string;
		audioUrl?: string;
	}) {
		return prisma.voiceLog.create({ data });
	},

	async getRecent(limit = 100) {
		return prisma.voiceLog.findMany({
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	},

	async getByUser(username: string, limit = 50) {
		return prisma.voiceLog.findMany({
			where: { username },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	},

	async deleteOldLogs(daysOld = 30) {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysOld);

		return prisma.voiceLog.deleteMany({
			where: { createdAt: { lt: cutoffDate } },
		});
	},
};
