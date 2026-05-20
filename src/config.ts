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

const unsafeProductionEnvValues: Record<string, Set<string>> = {
	AUTH_PASSWORD: new Set(["elysiatest-001", "your-strong-password-here"]),
	ENCRYPTION_SECRET: new Set(["elysia-default-shadow-key-777"]),
	ENCRYPTION_SALT: new Set(["abyssal-salt"]),
	JWT_REFRESH_SECRET: new Set([
		"elysia-refresh-secret",
		"your-super-secret-refresh-key-change-this-immediately-or-security-risk",
	]),
	JWT_SECRET: new Set([
		"elysia-sovereign-secret",
		"your-super-secret-jwt-key-change-this-immediately-or-security-risk",
	]),
	SESSION_SECRET: new Set([
		"dev_secret_only",
		"your-session-secret-change-this",
	]),
};

function splitCsvEnv(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

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
		if (isProd && unsafeProductionEnvValues[key]?.has(value)) {
			throw new Error(
				`CRITICAL: Insecure production environment variable value: ${key}`,
			);
		}
		return value;
	}

	if (defaultValue !== undefined) return defaultValue;

	return "";
}

export const isProd = process.env.NODE_ENV === "production";

export const config = {
	// Core
	port: getEnv("PORT", "3000"),
	nodeEnv: getEnv("NODE_ENV", "development"),
	sessionSecret: getEnv("SESSION_SECRET", "dev_secret_only"),
	dbUrl: getEnv("DATABASE_URL", "file:./prisma/dev.db"),

	// Security & Hardening
	forceHttps: getEnv("FORCE_HTTPS", "false") === "true",
	cspEnabled: getEnv("CSP_ENABLED", "true") === "true",
	allowedCorsOrigins: splitCsvEnv(getEnv("ALLOWED_CORS_ORIGINS", "")),
	publicRegistrationEnabled:
		getEnv("PUBLIC_REGISTRATION_ENABLED", "false") === "true",
	masterApiKey: getEnv("MASTER_API_KEY", ""),
	encryptionSecret: getEnv(
		"ENCRYPTION_SECRET",
		"elysia-default-shadow-key-777",
	),
	encryptionSalt: getEnv("ENCRYPTION_SALT", "abyssal-salt"),
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
	jwtSecret: getEnv("JWT_SECRET", "elysia-sovereign-secret"),
	jwtRefreshSecret: getEnv("JWT_REFRESH_SECRET", "elysia-refresh-secret"),
	authUsername: getEnv("AUTH_USERNAME", "admin"),
	authPassword: getEnv("AUTH_PASSWORD", "elysiatest-001"),

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
