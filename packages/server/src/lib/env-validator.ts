/**
 * Environment Variables Validator
 * サーバー起動時に必須環境変数をチェック
 */

import { createHash } from "node:crypto";
import { logger } from "./logger";

interface EnvConfig {
	name: string;
	required: boolean;
	productionOnly?: boolean;
	default?: string;
	description: string;
	validator?: (value: string) => boolean;
	disallowedValueHashes?: string[];
}

function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

const ENV_SCHEMA: EnvConfig[] = [
	// Security - 必須
	{
		name: "JWT_SECRET",
		required: true,
		productionOnly: true,
		description: "JWT署名用シークレットキー (32文字以上推奨)",
		validator: (v) => v.length >= 32,
		disallowedValueHashes: [
			"f6d8299e8544bcca13ddd58927515f451dfdeee4680d742ceeb450cba4b29c21",
			"43b5da88b9c9c9f840565cb8bb2ce2c865ee1538b0f37c46b90e9eee3821397f",
		],
	},
	{
		name: "JWT_REFRESH_SECRET",
		required: true,
		productionOnly: true,
		description: "リフレッシュトークン用シークレットキー (32文字以上推奨)",
		validator: (v) => v.length >= 32,
		disallowedValueHashes: [
			"1311e0d5b8251cdd5e3bf49036ccb40c5e4a43fa70a2ebc8975de969c18d1a24",
			"2eb78d80eedf46d7f1b74fb22e60605efcc8ad3beacc7de8b93fba2c18b4ebc1",
		],
	},
	{
		name: "AUTH_PASSWORD",
		required: true,
		productionOnly: true,
		description: "デフォルトユーザー(elysia)のパスワード",
		validator: (v) => v.length >= 8,
		disallowedValueHashes: [
			"158a5014828bff808fc3211420b053ab541bd5a746a318727075e829ee96ddbe",
			"68a07779e1269de644675d5bd67ba147c4238884f2319e01692d27cdc5c1ed78",
		],
	},

	// Server Configuration
	{
		name: "PORT",
		required: false,
		default: "3000",
		description: "サーバーポート番号",
		validator: (v) =>
			!Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) < 65536,
	},
	{
		name: "ALLOWED_ORIGINS",
		required: false,
		default: "http://localhost:3000",
		description: "CORS許可オリジン (カンマ区切り)",
	},

	// Database
	{
		name: "DATABASE_URL",
		required: true,
		productionOnly: true,
		default: "file:./prisma/dev.db",
		description: "Prisma データベース接続URL",
	},
	{
		name: "ENCRYPTION_SECRET",
		required: true,
		productionOnly: true,
		description: "保存データ暗号化用シークレット",
		validator: (v) => v.length >= 32,
		disallowedValueHashes: [
			"d71e125d7e1bff24cd6eec8a73daa1bc551849643ff9cadfbbb19ac920d0a54c",
		],
	},
	{
		name: "ENCRYPTION_SALT",
		required: true,
		productionOnly: true,
		description: "保存データ暗号化用ソルト",
		validator: (v) => v.length >= 16,
		disallowedValueHashes: [
			"809389a47869c5a458f8cf877e3307a12b5f02c4523e44ac4302160d55dd993c",
		],
	},

	// AI/LLM
	{
		name: "OPENAI_API_KEY",
		required: false,
		productionOnly: true,
		description: "OpenAI API キー (sk-...)",
		validator: (v) =>
			v.startsWith("sk-") && v !== "sk-your-key-here" && v.length >= 20,
	},
	{
		name: "OLLAMA_BASE_URL",
		required: false,
		default: "http://localhost:11434",
		description: "Ollama API URL",
	},
	{
		name: "OLLAMA_MODEL",
		required: false,
		default: "llama3.2",
		description: "使用するLLMモデル名",
	},

	// Optional Services
	{
		name: "REDIS_ENABLED",
		required: false,
		default: "false",
		description: "Redisレート制限を有効化",
	},
	{
		name: "FASTAPI_BASE_URL",
		required: false,
		default: "http://localhost:8000",
		description: "FastAPI RAGサービスURL",
	},
	{
		name: "VOICEVOX_BASE_URL",
		required: false,
		default: "http://localhost:50021",
		description: "VOICEVOX エンジンURL",
	},
	{
		name: "OPEN_LLM_VTUBER_ENABLED",
		required: false,
		default: "false",
		description: "Open-LLM-VTuber Bridge を有効化",
		validator: (v) => ["true", "false"].includes(v),
	},
	{
		name: "OPEN_LLM_VTUBER_BASE_URL",
		required: false,
		default: "http://127.0.0.1:12393",
		description: "Open-LLM-VTuber サーバーURL",
		validator: (v) => {
			try {
				new URL(v);
				return true;
			} catch {
				return false;
			}
		},
	},
	{
		name: "SLACK_WEBHOOK_URL",
		required: false,
		description: "Slack Incoming Webhook URL",
		validator: (v) => v.startsWith("https://hooks.slack.com/services/"),
	},
	{
		name: "SLACK_SIGNING_SECRET",
		required: false,
		description: "Slack Slash Command 署名検証用シークレット",
		validator: (v) => v.length >= 16,
	},
	{
		name: "SLACK_BOT_TOKEN",
		required: false,
		description: "Slack Bot User OAuth Token (xoxb-...)",
		validator: (v) => v.startsWith("xoxb-"),
	},
	{
		name: "SLACK_APP_TOKEN",
		required: false,
		description: "Slack Socket Mode App-Level Token (xapp-...)",
		validator: (v) => v.startsWith("xapp-"),
	},
	{
		name: "SLACK_SOCKET_MODE_ENABLED",
		required: false,
		default: "false",
		description: "Slack Socket Mode を有効化",
		validator: (v) => ["true", "false"].includes(v),
	},
	{
		name: "SLACK_COMMAND_NAME",
		required: false,
		default: "/ginrou",
		description: "Slack Slash Command 名",
		validator: (v) => v.startsWith("/") && v.length > 1,
	},
	{
		name: "GINROU_OWNER_USER_ID",
		required: false,
		description: "GINROU Shadow Gate Owner Slack User ID",
		validator: (v) => /^[UW][A-Z0-9]+$/.test(v),
	},
	{
		name: "GINROU_AUDIT_CHANNEL_ID",
		required: false,
		description: "GINROU Shadow Gate audit channel ID",
		validator: (v) => /^[CGD][A-Z0-9]+$/.test(v),
	},
	{
		name: "GINROU_ALLOWED_CHANNEL_IDS",
		required: false,
		description:
			"GINROU Shadow Gate allowed Slack channel IDs (comma separated)",
		validator: (v) =>
			v
				.split(",")
				.map((channel) => channel.trim())
				.filter(Boolean)
				.every((channel) => /^[CGD][A-Z0-9]+$/.test(channel)),
	},
	{
		name: "GINROU_GATE_DEFAULT_LOCKED",
		required: false,
		default: "false",
		description: "GINROU Shadow Gate starts locked",
		validator: (v) => ["true", "false"].includes(v),
	},
	{
		name: "GINROU_DEFAULT_REPO",
		required: false,
		default: "Elysia20220909/ElysiaAI",
		description: "GINROU default GitHub repository",
		validator: (v) => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(v),
	},
	{
		name: "GITHUB_TOKEN",
		required: false,
		description: "GitHub token for private repo read access",
		validator: (v) =>
			v.startsWith("ghp_") ||
			v.startsWith("github_pat_") ||
			v.startsWith("ghs_"),
	},
];

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	missing: string[];
	invalid: string[];
}

/**
 * 環境変数を検証
 */
export function validateEnvironment(): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const missing: string[] = [];
	const invalid: string[] = [];
	const isProduction = process.env.NODE_ENV === "production";

	for (const config of ENV_SCHEMA) {
		const value = process.env[config.name];
		const isRequired =
			config.required && (!config.productionOnly || isProduction);

		// 必須チェック
		if (isRequired && !value) {
			missing.push(config.name);
			errors.push(
				`❌ [必須] ${config.name}: ${config.description}${config.default ? ` (デフォルト: ${config.default})` : ""}`,
			);
			continue;
		}

		// デフォルト値の適用
		if (!value && config.default) {
			process.env[config.name] = config.default;
			warnings.push(
				`⚠️  ${config.name}: デフォルト値を使用 (${config.default})`,
			);
			continue;
		}

		// バリデーション
		if (value && config.validator && !config.validator(value)) {
			const message = `${config.name}: ${config.description} (現在の値: ${value.substring(0, 20)}...)`;
			if (isProduction || !config.productionOnly) {
				invalid.push(config.name);
				errors.push(`❌ [無効] ${message}`);
			} else {
				warnings.push(`⚠️  ${message}`);
			}
		}

		if (value && config.disallowedValueHashes?.includes(sha256(value))) {
			const message = `⚠️  ${config.name}: 開発用またはサンプル値が設定されています`;
			if (isProduction) {
				invalid.push(config.name);
				errors.push(`❌ [無効] ${message}`);
			} else {
				warnings.push(message);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		missing,
		invalid,
	};
}

/**
 * 環境変数検証を実行してログ出力
 */
export function checkEnvironmentOrExit() {
	logger.info("🔍 環境変数を検証中...");

	const result = validateEnvironment();

	// 警告表示
	if (result.warnings.length > 0) {
		logger.warn("⚠️  環境変数の警告:");
		for (const warning of result.warnings) {
			logger.warn(`  ${warning}`);
		}
	}

	// エラーチェック
	if (!result.valid) {
		logger.error("❌ 環境変数の検証に失敗しました:");
		for (const error of result.errors) {
			logger.error(`  ${error}`);
		}

		logger.error("\n💡 修正方法:");
		logger.error("  1. .env ファイルを開く");
		logger.error("  2. 上記の必須項目を設定");
		logger.error("  3. サーバーを再起動\n");

		process.exit(1);
	}

	logger.info("✅ 環境変数の検証完了");
}

/**
 * 環境変数の概要を表示
 */
export function printEnvironmentSummary() {
	logger.info("\n📋 環境変数サマリー:");
	logger.info(`  - ポート: ${process.env.PORT || 3000}`);
	logger.info(`  - データベース: ${process.env.DATABASE_URL || "未設定"}`);
	logger.info(
		`  - Redis: ${process.env.REDIS_ENABLED === "true" ? "有効" : "無効"}`,
	);
	logger.info(
		`  - Ollama: ${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}`,
	);
	logger.info(`  - モデル: ${process.env.OLLAMA_MODEL || "llama3.2"}\n`);
}
