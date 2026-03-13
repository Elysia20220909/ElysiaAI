/**
 * Prisma マイグレーション実行スクリプト
 * 開発環境と本番環境の両方に対応
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

// ロギング関数
function log(level: string, message: string): void {
	const timestamp = new Date().toISOString().substring(11, 19);
	console.log(`[${timestamp}] ${level} ${message}`);
}

async function runCommand(
	command: string,
	args: string[],
	cwd?: string,
): Promise<number> {
	return new Promise((resolve, reject) => {
		const proc = spawn(command, args, {
			cwd: cwd || process.cwd(),
			stdio: "inherit",
			shell: true,
		});

		proc.on("close", (code) => {
			resolve(code || 0);
		});

		proc.on("error", (error) => {
			reject(error);
		});
	});
}

async function main(): Promise<void> {
	try {
		const env = process.env.NODE_ENV || "development";
		const isProduction = env === "production";

		log("INFO", `🚀 Prisma マイグレーション開始 (${env})`);

		// マイグレーションディレクトリを確認
		const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
		if (!existsSync(migrationsDir)) {
			log("INFO", "📁 マイグレーションディレクトリ作成");
			mkdirSync(migrationsDir, { recursive: true });
		}

		// 開発環境: prisma migrate dev
		if (!isProduction) {
			log("INFO", "📝 開発環境マイグレーション実行");
			const code = await runCommand("bunx", [
				"prisma",
				"migrate",
				"dev",
				"--name",
				"init",
			]);
			if (code !== 0) {
				log("ERROR", "マイグレーション実行に失敗");
				process.exit(1);
			}
		} else {
			// 本番環境: prisma migrate deploy
			log("INFO", "🔒 本番環境デプロイ実行");
			const code = await runCommand("bunx", ["prisma", "migrate", "deploy"]);
			if (code !== 0) {
				log("ERROR", "マイグレーションデプロイに失敗");
				process.exit(1);
			}
		}

		// データベーススキーマ生成
		log("INFO", "🔄 Prisma Client 生成");
		await runCommand("bunx", ["prisma", "generate"]);

		log("SUCCESS", "✅ マイグレーション完了");
		process.exit(0);
	} catch (error) {
		log("ERROR", `エラー: ${error}`);
		process.exit(1);
	}
}

main();
