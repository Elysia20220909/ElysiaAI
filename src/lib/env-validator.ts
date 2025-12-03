/**
 * Environment Variables Validator
 * サーバー起動時に必須環境変数をチェック
 */

import { logger } from "./logger";

interface EnvConfig {
  name: string;
  required: boolean;
  default?: string;
  description: string;
  validator?: (value: string) => boolean;
}

const ENV_SCHEMA: EnvConfig[] = [
  // Security - 必須
  {
    name: "JWT_SECRET",
    required: true,
    description: "JWT署名用シークレットキー (32文字以上推奨)",
    validator: (v) => v.length >= 32,
  },
  {
    name: "JWT_REFRESH_SECRET",
    required: true,
    description: "リフレッシュトークン用シークレットキー (32文字以上推奨)",
    validator: (v) => v.length >= 32,
  },
  {
    name: "AUTH_PASSWORD",
    required: true,
    description: "デフォルトユーザー(elysia)のパスワード",
    validator: (v) => v !== "your-strong-password-here" && v.length >= 8,
  },

  // Server Configuration
  {
    name: "PORT",
    required: false,
    default: "3000",
    description: "サーバーポート番号",
    validator: (v) => !isNaN(Number(v)) && Number(v) > 0 && Number(v) < 65536,
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
    description: "Prisma データベース接続URL",
  },

  // AI/LLM
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

  for (const config of ENV_SCHEMA) {
    const value = process.env[config.name];

    // 必須チェック
    if (config.required && !value) {
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
      invalid.push(config.name);
      errors.push(
        `❌ [無効] ${config.name}: ${config.description} (現在の値: ${value.substring(0, 20)}...)`,
      );
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
  logger.info(`  - Redis: ${process.env.REDIS_ENABLED === "true" ? "有効" : "無効"}`);
  logger.info(
    `  - Ollama: ${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}`,
  );
  logger.info(
    `  - モデル: ${process.env.OLLAMA_MODEL || "llama3.2"}\n`,
  );
}
