#!/usr/bin/env bun

/**
 * Prisma SQLite初期化スクリプト
 * データベース作成、テーブル作成、マイグレーション実行
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

function log(level: string, message: string): void {
	const timestamp = new Date().toISOString().substring(11, 19);
	console.log(`[${timestamp}] ${level} ${message}`);
}

async function main(): Promise<void> {
	try {
		log("INFO", "🚀 Prisma SQLite初期化開始");

		// 環境変数確認
		const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
		log("INFO", `📁 データベース: ${dbUrl}`);

		// Prismaディレクトリ確認
		const prismaDir = path.join(process.cwd(), "prisma");
		if (!existsSync(prismaDir)) {
			mkdirSync(prismaDir, { recursive: true });
			log("INFO", "📁 Prismaディレクトリ作成");
		}

		// マイグレーションディレクトリ確認
		const migrationsDir = path.join(prismaDir, "migrations");
		if (!existsSync(migrationsDir)) {
			mkdirSync(migrationsDir, { recursive: true });
			log("INFO", "📁 マイグレーションディレクトリ作成");
		}

		// Prisma Client生成
		log("INFO", "🔄 Prisma Client生成");
		execSync("bunx prisma generate", { stdio: "inherit" });

		// データベース初期化 (開発環境)
		log("INFO", "📝 マイグレーション実行");
		try {
			execSync("bunx prisma migrate deploy", { stdio: "inherit" });
		} catch {
			// 初回の場合はresetが必要な場合がある
			log("WARN", "マイグレーションデプロイ失敗。リセットを試みます");
			// execSync("bunx prisma migrate reset --force", { stdio: "inherit" });
		}

		// DB接続確認
		log("INFO", "✅ データベース接続確認");
		await prisma.$queryRaw`SELECT 1`;

		// テーブル確認
		const tables = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `;

		log("INFO", `✅ テーブル作成確認: ${tables.length}個`);
		for (const table of tables) {
			log("INFO", `   - ${table.name}`);
		}

		// 初期データ投入 (オプション)
		log("INFO", "📊 初期データ確認");
		const userCount = await prisma.user.count();
		const sessionCount = await prisma.chatSession.count();
		const messageCount = await prisma.message.count();

		log("INFO", `   - Users: ${userCount}件`);
		log("INFO", `   - Chat Sessions: ${sessionCount}件`);
		log("INFO", `   - Messages: ${messageCount}件`);

		log("SUCCESS", "✅ Prisma初期化完了");
		process.exit(0);
	} catch (error) {
		log("ERROR", `初期化エラー: ${error}`);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
