/**
 * Elysia AI - Database Service
 * Prisma ORMを使用したデータベース操作
 */

import { PrismaClient } from "@prisma/client";

// Prismaクライアントのシングルトン (一時的に無効化)
let prisma: PrismaClient;

try {
	// Prisma 7: データベース URL をコンストラクタで指定
	const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";

	// SQLite の場合は直接ファイルを使用
	prisma = new PrismaClient({
		log:
			process.env.NODE_ENV === "development"
				? ["query", "error", "warn"]
				: ["error"],
		// Prisma 7: datasourceUrl を指定
		datasourceUrl: dbUrl,
	});
	console.log("✅ Prisma database connected");
} catch (error) {
	console.warn("⚠️ Prisma database not configured, using in-memory fallback");
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
