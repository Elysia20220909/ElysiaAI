/**
 * Error Monitoring & Alert Service
 * Discord/Slack Webhook連携でエラー通知
 */

import { getEnv } from "../../../../src/config.ts";
import { logger } from "./logger";

interface ErrorAlert {
	message: string;
	stack?: string;
	level: "error" | "critical" | "warning";
	context?: Record<string, unknown>;
	timestamp: Date;
}

interface WebhookConfig {
	discord?: string;
	slack?: string;
	enabled: boolean;
}

export class ErrorMonitor {
	private webhookConfig: WebhookConfig;
	private errorCounts: Map<string, { count: number; lastSeen: Date }>;
	private readonly RATE_LIMIT = 5; // 5分以内に同じエラーは1回だけ通知

	constructor() {
		this.webhookConfig = {
			discord: getEnv("DISCORD_WEBHOOK_URL", ""),
			slack: getEnv("SLACK_WEBHOOK_URL", ""),
			enabled: getEnv("ERROR_ALERTS_ENABLED", "false") === "true",
		};
		this.errorCounts = new Map();
	}

	/**
	 * エラーを記録して通知
	 */
	async captureError(error: Error | string, context?: Record<string, unknown>) {
		const errorKey = typeof error === "string" ? error : error.message;
		const now = new Date();

		// レート制限チェック
		const existing = this.errorCounts.get(errorKey);
		if (existing) {
			const minutesSinceLastSeen =
				(now.getTime() - existing.lastSeen.getTime()) / 1000 / 60;
			if (minutesSinceLastSeen < this.RATE_LIMIT) {
				existing.count++;
				return; // 通知しない
			}
		}

		// エラー記録
		this.errorCounts.set(errorKey, { count: 1, lastSeen: now });

		const alert: ErrorAlert = {
			message: typeof error === "string" ? error : error.message,
			stack: typeof error === "string" ? undefined : error.stack,
			level: "error",
			context,
			timestamp: now,
		};

		logger.error("Error captured", { error: alert } as unknown as Error); // Webhook通知
		if (this.webhookConfig.enabled) {
			await this.sendWebhookNotification(alert);
		}
	}

	/**
	 * 重大なエラーを通知
	 */
	async captureCritical(
		error: Error | string,
		context?: Record<string, unknown>,
	) {
		const alert: ErrorAlert = {
			message: typeof error === "string" ? error : error.message,
			stack: typeof error === "string" ? undefined : error.stack,
			level: "critical",
			context,
			timestamp: new Date(),
		};

		logger.error("CRITICAL ERROR", { error: alert } as unknown as Error); // 重大エラーは必ず通知
		if (this.webhookConfig.enabled) {
			await this.sendWebhookNotification(alert);
		}
	}

	/**
	 * Discord/Slackに通知
	 */
	private async sendWebhookNotification(alert: ErrorAlert) {
		const promises: Promise<void>[] = [];

		if (this.webhookConfig.discord) {
			promises.push(this.sendDiscordWebhook(alert));
		}

		if (this.webhookConfig.slack) {
			promises.push(this.sendSlackWebhook(alert));
		}

		await Promise.allSettled(promises);
	}

	/**
	 * Fetch with retry
	 */
	private async retryFetch(
		url: string,
		options: RequestInit,
		retries = 3,
	): Promise<Response> {
		for (let i = 0; i < retries; i++) {
			try {
				const response = await fetch(url, options);
				if (response.ok) return response;
			} catch {
				// Retry on failure
			}
			await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
		}
		return await fetch(url, options);
	}

	/**
	 * Discord Webhook
	 */
	private async sendDiscordWebhook(alert: ErrorAlert) {
		if (!this.webhookConfig.discord) return;

		const color =
			alert.level === "critical"
				? 0xff0000
				: alert.level === "error"
					? 0xffa500
					: 0xffff00;

		const payload = {
			embeds: [
				{
					title: `${alert.level === "critical" ? "🚨" : "⚠️"} ${alert.level.toUpperCase()} - Elysia AI`,
					description: alert.message,
					color,
					fields: [
						{
							name: "Timestamp",
							value: alert.timestamp.toISOString(),
							inline: true,
						},
						...(alert.context
							? [
									{
										name: "Context",
										value: JSON.stringify(alert.context, null, 2).substring(
											0,
											1024,
										),
										inline: false,
									},
								]
							: []),
						...(alert.stack
							? [
									{
										name: "Stack Trace",
										value: `\`\`\`\n${alert.stack.substring(0, 1000)}\n\`\`\``,
										inline: false,
									},
								]
							: []),
					],
				},
			],
		};

		try {
			const response = await this.retryFetch(this.webhookConfig.discord, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				logger.warn("Discord webhook failed", { status: response.status });
			}
		} catch {
			logger.warn("Failed to send Discord notification");
		}
	}

	/**
	 * Slack Webhook
	 */
	private async sendSlackWebhook(alert: ErrorAlert) {
		if (!this.webhookConfig.slack) return;

		const emoji =
			alert.level === "critical"
				? ":rotating_light:"
				: alert.level === "error"
					? ":warning:"
					: ":information_source:";

		const payload = {
			text: `${emoji} *${alert.level.toUpperCase()}* - Elysia AI`,
			blocks: [
				{
					type: "header",
					text: {
						type: "plain_text",
						text: `${emoji} ${alert.level.toUpperCase()} Alert`,
					},
				},
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: `*Message:* ${alert.message}`,
					},
				},
				{
					type: "section",
					fields: [
						{
							type: "mrkdwn",
							text: `*Timestamp:*\n${alert.timestamp.toISOString()}`,
						},
						...(alert.context
							? [
									{
										type: "mrkdwn",
										text: `*Context:*\n\`\`\`${JSON.stringify(alert.context, null, 2).substring(0, 500)}\`\`\``,
									},
								]
							: []),
					],
				},
				...(alert.stack
					? [
							{
								type: "section",
								text: {
									type: "mrkdwn",
									text: `*Stack Trace:*\n\`\`\`${alert.stack.substring(0, 1000)}\`\`\``,
								},
							},
						]
					: []),
			],
		};

		try {
			const response = await this.retryFetch(this.webhookConfig.slack, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				logger.warn("Slack webhook failed", { status: response.status });
			}
		} catch {
			logger.warn("Failed to send Slack notification");
		}
	}

	/**
	 * エラー統計を取得
	 */
	getErrorStats() {
		const stats: Record<string, { count: number; lastSeen: string }> = {};

		for (const [error, data] of this.errorCounts.entries()) {
			stats[error] = {
				count: data.count,
				lastSeen: data.lastSeen.toISOString(),
			};
		}

		return stats;
	}

	/**
	 * エラーカウントをリセット
	 */
	clearStats() {
		this.errorCounts.clear();
	}
}

export const errorMonitor = new ErrorMonitor();
