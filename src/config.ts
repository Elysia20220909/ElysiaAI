import { createHash, randomBytes } from "node:crypto";

// src/config.ts – Centralised environment handling
// Lightweight helper to fetch env vars with optional defaults// Centralised environment handling
const requiredProductionEnvKeys = new Set([
	"SESSION_SECRET",
	"DB_URL",
	"DATABASE_URL",
	"JWT_SECRET",
	"JWT_REFRESH_SECRET",
	"AUTH_PASSWORD",
	"ENCRYPTION_SECRET",
	"ENCRYPTION_SALT",
]);

const unsafeProductionEnvValueHashes: Record<string, Set<string>> = {
	AUTH_PASSWORD: new Set([
		"158a5014828bff808fc3211420b053ab541bd5a746a318727075e829ee96ddbe",
		"68a07779e1269de644675d5bd67ba147c4238884f2319e01692d27cdc5c1ed78",
	]),
	ENCRYPTION_SECRET: new Set([
		"d71e125d7e1bff24cd6eec8a73daa1bc551849643ff9cadfbbb19ac920d0a54c",
	]),
	ENCRYPTION_SALT: new Set([
		"809389a47869c5a458f8cf877e3307a12b5f02c4523e44ac4302160d55dd993c",
	]),
	JWT_REFRESH_SECRET: new Set([
		"1311e0d5b8251cdd5e3bf49036ccb40c5e4a43fa70a2ebc8975de969c18d1a24",
		"2eb78d80eedf46d7f1b74fb22e60605efcc8ad3beacc7de8b93fba2c18b4ebc1",
	]),
	JWT_SECRET: new Set([
		"f6d8299e8544bcca13ddd58927515f451dfdeee4680d742ceeb450cba4b29c21",
		"43b5da88b9c9c9f840565cb8bb2ce2c865ee1538b0f37c46b90e9eee3821397f",
	]),
	SESSION_SECRET: new Set([
		"d3aa9cc9ace4300e2286f0265b2a7c5de578fc51bd2775eaf2a5ff5c10ee944b",
	]),
};

const ephemeralDevelopmentSecrets = new Map<string, string>();

export function getEnv(key: string, defaultValue?: string): string {
	const value = process.env[key];
	const isProd = process.env.NODE_ENV === "production";
	if (
		isProd &&
		requiredProductionEnvKeys.has(key) &&
		(value === undefined || value === null || value === "")
	) {
		throw new Error(
			`CRITICAL: Missing required production environment variable: ${key}`,
		);
	}

	if (value !== undefined && value !== null && value !== "") {
		const valueHash = createHash("sha256").update(value).digest("hex");
		if (isProd && unsafeProductionEnvValueHashes[key]?.has(valueHash)) {
			throw new Error(
				`CRITICAL: Insecure production environment variable value: ${key}`,
			);
		}
		return value;
	}

	if (defaultValue !== undefined) return defaultValue;

	return "";
}

function getSecretEnv(key: string): string {
	const value = getEnv(key);
	if (value) return value;
	if (process.env.NODE_ENV === "production") return value;

	let generated = ephemeralDevelopmentSecrets.get(key);
	if (!generated) {
		generated = randomBytes(32).toString("hex");
		ephemeralDevelopmentSecrets.set(key, generated);
	}
	return generated;
}

export const isProd = process.env.NODE_ENV === "production";

export const config = {
	// Core
	port: getEnv("PORT", "3000"),
	nodeEnv: getEnv("NODE_ENV", "development"),
	sessionSecret: getSecretEnv("SESSION_SECRET"),
	dbUrl: getEnv("DATABASE_URL", "file:./prisma/dev.db"),

	// Security & Hardening
	forceHttps: getEnv("FORCE_HTTPS", "false") === "true",
	cspEnabled: getEnv("CSP_ENABLED", "true") === "true",
	masterApiKey: getEnv("MASTER_API_KEY", ""),
	encryptionSecret: getSecretEnv("ENCRYPTION_SECRET"),
	encryptionSalt: getSecretEnv("ENCRYPTION_SALT"),
	defenseRulesFile: getEnv("DEFENSE_RULES_FILE", ""),

	// Redis
	redisEnabled: getEnv("REDIS_ENABLED", "false") === "true",
	redisUrl: getEnv("REDIS_URL", "redis://127.0.0.1:6379"),
	redisHost: getEnv("REDIS_HOST", ""),
	redisPort: getEnv("REDIS_PORT", "6379"),
	redisPassword: getEnv("REDIS_PASSWORD", ""),
	redisUsername: getEnv("REDIS_USERNAME", ""),
	redisTls: getEnv("REDIS_TLS", "false") === "true",
	redisConnectTimeout: getEnv("REDIS_CONNECT_TIMEOUT", "10000"),
	redisRetryDelay: getEnv("REDIS_RETRY_DELAY_MS", "2000"),

	// External APIs
	fastApiBaseUrl: getEnv("FASTAPI_BASE_URL", "http://127.0.0.1:8000"),
	fastApiApiKey: getEnv("FASTAPI_API_KEY", ""),
	ollamaBaseUrl: getEnv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
	ollamaModel: getEnv("OLLAMA_MODEL", "llama3.2"),
	groqApiKey: getEnv("GROQ_API_KEY", ""),
	openaiApiKey: getEnv("OPENAI_API_KEY", ""),
	openaiModel: getEnv("OPENAI_MODEL", "gpt-4o-mini"),

	// VOICEVOX (TTS)
	voicevoxBaseUrl: getEnv("VOICEVOX_BASE_URL", "http://127.0.0.1:50021"),
	voicevoxSpeakerId: Number(getEnv("VOICEVOX_SPEAKER_ID", "2")),
	voicevoxSpeed: Number(getEnv("VOICEVOX_SPEED", "1.1")),
	voicevoxPitch: Number(getEnv("VOICEVOX_PITCH", "0.0")),
	voicevoxIntonation: Number(getEnv("VOICEVOX_INTONATION", "1.2")),
	voicevoxVolume: Number(getEnv("VOICEVOX_VOLUME", "1.0")),

	// Open-LLM-VTuber bridge
	openLlmVtuberEnabled: getEnv("OPEN_LLM_VTUBER_ENABLED", "false") === "true",
	openLlmVtuberBaseUrl: getEnv(
		"OPEN_LLM_VTUBER_BASE_URL",
		"http://127.0.0.1:12393",
	),

	// Auth
	jwtSecret: getSecretEnv("JWT_SECRET"),
	jwtRefreshSecret: getSecretEnv("JWT_REFRESH_SECRET"),
	authUsername: getEnv("AUTH_USERNAME", "admin"),
	authPassword: getEnv("AUTH_PASSWORD"),

	// Notifications (Email & Webhooks)
	errorAlertsEnabled: getEnv("ERROR_ALERTS_ENABLED", "false") === "true",
	discordWebhookUrl: getEnv("DISCORD_WEBHOOK_URL", ""),
	slackWebhookUrl: getEnv("SLACK_WEBHOOK_URL", ""),
	slackSigningSecret: getEnv("SLACK_SIGNING_SECRET", ""),
	slackBotToken: getEnv("SLACK_BOT_TOKEN", ""),
	slackAppToken: getEnv("SLACK_APP_TOKEN", ""),
	slackCommandName: getEnv("SLACK_COMMAND_NAME", "/ginrou"),
	slackSocketModeEnabled:
		getEnv("SLACK_SOCKET_MODE_ENABLED", "false") === "true",
	ginrouOwnerUserId: getEnv("GINROU_OWNER_USER_ID", ""),
	ginrouAuditChannelId: getEnv("GINROU_AUDIT_CHANNEL_ID", ""),
	ginrouAllowedChannelIds: getEnv("GINROU_ALLOWED_CHANNEL_IDS", ""),
	ginrouGateDefaultLocked:
		getEnv("GINROU_GATE_DEFAULT_LOCKED", "false") === "true",
	ginrouDefaultRepo: getEnv("GINROU_DEFAULT_REPO", "Elysia20220909/ElysiaAI"),
	githubToken: getEnv("GITHUB_TOKEN", ""),
	customWebhookUrl: getEnv("CUSTOM_WEBHOOK_URL", ""),
	customWebhookSecret: getEnv("CUSTOM_WEBHOOK_SECRET", ""),
	emailNotificationsEnabled:
		getEnv("EMAIL_NOTIFICATIONS_ENABLED", "false") === "true",
	smtpHost: getEnv("SMTP_HOST", "smtp.gmail.com"),
	smtpPort: getEnv("SMTP_PORT", "587"),
	smtpSecure: getEnv("SMTP_SECURE", "false") === "true",
	smtpUser: getEnv("SMTP_USER", ""),
	smtpPass: getEnv("SMTP_PASS", ""),
	emailFrom: getEnv("EMAIL_FROM", "noreply@elysia-ai.com"),
	adminEmail: getEnv("ADMIN_EMAIL", ""),

	// Files & Logs
	uploadDir: getEnv("UPLOAD_DIR", "./uploads"),
	maxUploadSizeMb: getEnv("MAX_UPLOAD_SIZE_MB", "10"),
	auditLogDir: getEnv("AUDIT_LOG_DIR", "./logs/audit"),
	logDir: getEnv("LOG_DIR", "./logs"),
	logMaxAgeDays: getEnv("LOG_MAX_AGE_DAYS", "30"),
	logMaxSizeMb: getEnv("LOG_MAX_SIZE_MB", "500"),
	logCleanupEnabled: getEnv("LOG_CLEANUP_ENABLED", "true") === "true",
	logCleanupIntervalHours: getEnv("LOG_CLEANUP_INTERVAL_HOURS", "24"),
	logCompressionEnabled: getEnv("LOG_COMPRESSION_ENABLED", "false") === "true",
	logLevel: getEnv("LOG_LEVEL", "info"),
	debugSql: getEnv("DEBUG_SQL", "false") === "true",
	sqlitePath: getEnv("ELYSIA_SQLITE_PATH", ""),
	pythonCommand: getEnv("ELYSIA_PYTHON", getEnv("PYTHON", "python")),

	// Backup and scheduled jobs
	autoBackupEnabled: getEnv("AUTO_BACKUP_ENABLED", "false") === "true",
	backupIntervalMinutes: Number(getEnv("BACKUP_INTERVAL_MINUTES", "60")),
	maxBackupGenerations: Number(getEnv("MAX_BACKUP_GENERATIONS", "7")),
	backupDir: getEnv("BACKUP_DIR", "./backups"),
	dailyReportEnabled: getEnv("DAILY_REPORT_ENABLED", "false") === "true",
	weeklyReportEnabled: getEnv("WEEKLY_REPORT_ENABLED", "false") === "true",
	monthlyReportEnabled: getEnv("MONTHLY_REPORT_ENABLED", "false") === "true",
	healthCheckCronEnabled:
		getEnv("HEALTH_CHECK_CRON_ENABLED", "false") === "true",

	// Localization
	defaultLocale: getEnv("DEFAULT_LOCALE", "en"),

	// Monitoring & Telemetry
	healthMonitoringEnabled:
		getEnv("HEALTH_MONITORING_ENABLED", "true") === "true",
	telemetryEnabled: getEnv("TELEMETRY_ENABLED", "true") === "true",
};
