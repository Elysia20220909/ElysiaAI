/**
 * Prisma 初期化スクリプト
 * データベース、テーブル、マイグレーション管理
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

// Prisma Client インスタンス
export const prisma = new PrismaClient({
	log: [
		{
			emit: "event",
			level: "query",
		},
		{
			emit: "stdout",
			level: "error",
		},
		{
			emit: "stdout",
			level: "warn",
		},
	],
});

// ログイベントリスナー
prisma.$on("query", (e: any) => {
	if (process.env.DEBUG_SQL === "true") {
		logger.debug(`Query: ${e.query}`);
		logger.debug(`Params: ${JSON.stringify(e.params)}`);
		logger.debug(`Duration: ${e.duration}ms`);
	}
});

/**
 * Prismaの初期化と接続確認
 */
export async function initializePrisma(): Promise<void> {
	try {
		// データベース接続テスト
		await prisma.$queryRaw`SELECT 1`;
		logger.info("✅ Prisma: データベース接続確認");

		// スキーマチェック
		await checkSchema();

		// テーブル統計
		await logTableStats();
	} catch (error) {
		logger.error(
			"❌ Prisma 初期化エラー:",
			error instanceof Error ? error : new Error(String(error)),
		);
		throw error;
	}
}

/**
 * スキーマの確認
 */
async function checkSchema(): Promise<void> {
	try {
		// テーブル一覧を取得
		const tables = await prisma.$queryRaw<
			Array<{ name: string }>
		>`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`;

		const expectedTables = [
			"users",
			"refresh_tokens",
			"chat_sessions",
			"messages",
			"feedbacks",
			"knowledge_base",
			"voice_logs",
			"_prisma_migrations",
		];

		const missingTables = expectedTables.filter(
			(t) => !tables.some((table: { name: string }) => table.name === t),
		);

		if (missingTables.length > 0) {
			logger.warn(`⚠️ 不足テーブル: ${missingTables.join(", ")}`);
		} else {
			logger.info(`✅ スキーマ: 全テーブル確認 (${tables.length})`);
		}
	} catch (error) {
		logger.warn("⚠️ スキーマ確認スキップ:", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * テーブル統計情報をログ出力
 */
async function logTableStats(): Promise<void> {
	try {
		const stats = {
			users: await prisma.user.count(),
			chats: await prisma.chatSession.count(),
			messages: await prisma.message.count(),
			feedbacks: await prisma.feedback.count(),
		};

		logger.info("📊 データベース統計:");
		for (const [key, count] of Object.entries(stats)) {
			logger.info(`  - ${key}: ${count}件`);
		}
	} catch (_error) {
		logger.debug("統計情報取得スキップ");
	}
}

/**
 * Prismaのシャットダウン処理
 */
export async function disconnectPrisma(): Promise<void> {
	try {
		await prisma.$disconnect();
		logger.info("✅ Prisma: 接続終了");
	} catch (error) {
		logger.error(
			"❌ Prisma 切断エラー:",
			error instanceof Error ? error : new Error(String(error)),
		);
		throw error;
	}
}

/**
 * Prismaの health check
 */
export async function checkPrismaHealth(): Promise<boolean> {
	try {
		await prisma.$queryRaw`SELECT 1`;
		return true;
	} catch {
		return false;
	}
}
