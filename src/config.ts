// src/config.ts – Centralised environment handling
// Lightweight helper to fetch env vars with optional defaults// Centralised environment handling
export function getEnv(key: string, defaultValue?: string): string {
	const value = process.env[key];
	if (value !== undefined && value !== null && value !== "") return value;
	if (defaultValue !== undefined) return defaultValue;

	// Enforce required variables in production
	const isProd = process.env.NODE_ENV === "production";
	if (isProd && ["SESSION_SECRET", "DB_URL"].includes(key)) {
		throw new Error(
			`CRITICAL: Missing required production environment variable: ${key}`,
		);
	}

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

	// VOICEVOX (TTS)
	voicevoxBaseUrl: getEnv("VOICEVOX_BASE_URL", "http://127.0.0.1:50021"),
	voicevoxSpeakerId: Number(getEnv("VOICEVOX_SPEAKER_ID", "2")),
	voicevoxSpeed: Number(getEnv("VOICEVOX_SPEED", "1.1")),
	voicevoxPitch: Number(getEnv("VOICEVOX_PITCH", "0.0")),
	voicevoxIntonation: Number(getEnv("VOICEVOX_INTONATION", "1.2")),
	voicevoxVolume: Number(getEnv("VOICEVOX_VOLUME", "1.0")),

	// Auth
	jwtSecret: getEnv("JWT_SECRET", "elysia-sovereign-secret"),
	jwtRefreshSecret: getEnv("JWT_REFRESH_SECRET", "elysia-refresh-secret"),
	authUsername: getEnv("AUTH_USERNAME", "admin"),
	authPassword: getEnv("AUTH_PASSWORD", "elysiatest-001"),

	// Notifications (Email & Webhooks)
	errorAlertsEnabled: getEnv("ERROR_ALERTS_ENABLED", "false") === "true",
	discordWebhookUrl: getEnv("DISCORD_WEBHOOK_URL", ""),
	slackWebhookUrl: getEnv("SLACK_WEBHOOK_URL", ""),
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

	// Monitoring & Telemetry
	healthMonitoringEnabled:
		getEnv("HEALTH_MONITORING_ENABLED", "true") === "true",
	telemetryEnabled: getEnv("TELEMETRY_ENABLED", "true") === "true",
};
