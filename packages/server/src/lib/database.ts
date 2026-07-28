/**
 * Elysia AI - Database Service
 * PostgreSQL optimized Prisma Client initialization
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { config } from "../../../../src/config.ts";
import type { RefreshTokenRecord } from "./auth-tokens";
import { logger } from "./logger";
import { secureVault } from "./secure-vault";

// Apply .env
dotenv.config();

// Prisma client singleton
const dbUrl = config.dbUrl;

let prisma: PrismaClient;

try {
	if (!dbUrl) {
		throw new Error("DATABASE_URL is not defined in environment");
	}

	if (!process.env.DATABASE_URL) {
		process.env.DATABASE_URL = dbUrl;
	}

	prisma = new PrismaClient({
		log:
			config.nodeEnv === "development" ? ["query", "error", "warn"] : ["error"],
	});

	logger.info("✅ Sovereign Database: Prisma Client Initialized (PostgreSQL)");
} catch (error) {
	logger.warn(
		"⚠️ Database initialization failed, using in-memory mock fallback",
	);
	logger.error(
		"Database initialization failed",
		error instanceof Error ? error : undefined,
	);
	// Mock fallback for isolated testing
	prisma = null as any;
}

// Graceful shutdown
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

	async findByToken(token: string): Promise<RefreshTokenRecord | null> {
		const record = await prisma.refreshToken.findUnique({
			where: { token },
			include: { user: true },
		});
		if (!record?.userId) return null;
		return { ...record, userId: record.userId };
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
		const encryptedData = {
			...data,
			content: secureVault.encrypt(data.content),
		};
		return prisma.message.create({ data: encryptedData });
	},

	async getMessages(sessionId: string, limit = 50) {
		const messages = await prisma.message.findMany({
			where: { sessionId },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
		return messages.map((m: any) => ({
			...m,
			content: secureVault.decrypt(m.content),
		}));
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
		const encryptedData = {
			...data,
			answer: secureVault.encrypt(data.answer),
		};
		return prisma.knowledgeBase.create({ data: encryptedData });
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
		const knowledge = await prisma.knowledgeBase.findMany({
			where: verified ? { verified: true } : undefined,
			orderBy: { updatedAt: "desc" },
			take: 200,
		});
		return knowledge.map((k: any) => ({
			...k,
			answer: secureVault.decrypt(k.answer),
		}));
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
		const encryptedData = {
			...data,
			text: secureVault.encrypt(data.text),
		};
		return prisma.voiceLog.create({ data: encryptedData });
	},

	async getRecent(limit = 100) {
		const logs = await prisma.voiceLog.findMany({
			orderBy: { createdAt: "desc" },
			take: limit,
		});
		return logs.map((log: any) => ({
			...log,
			text: secureVault.decrypt(log.text),
		}));
	},

	async getByUser(username: string, limit = 50) {
		const logs = await prisma.voiceLog.findMany({
			where: { username },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
		return logs.map((log: any) => ({
			...log,
			text: secureVault.decrypt(log.text),
		}));
	},

	async deleteOldLogs(daysOld = 30) {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysOld);

		return prisma.voiceLog.deleteMany({
			where: { createdAt: { lt: cutoffDate } },
		});
	},
};

// ==================== アクションログ ====================
export const actionLogService = {
	async create(data: { action: string; status: string; hash: string }) {
		const encryptedData = {
			...data,
			action: secureVault.encrypt(data.action),
		};
		return prisma.actionLog.create({ data: encryptedData });
	},

	async getAll(limit = 100) {
		const logs = await prisma.actionLog.findMany({
			orderBy: { createdAt: "desc" },
			take: limit,
		});
		return logs.map((log: any) => ({
			...log,
			action: secureVault.decrypt(log.action),
		}));
	},
};
