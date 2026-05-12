/**
 * Auto Delivery Protocol
 * 自動配信・定期運用・通知の起動制御を束ねる薄い調停層。
 */

import { config } from "../../../../src/config.ts";
import { backupScheduler } from "./backup-scheduler";
import { cronScheduler } from "./cron-scheduler";
import { healthMonitor } from "./health-monitor";
import { jobQueue } from "./job-queue";
import { logCleanupManager } from "./log-cleanup";
import { logger } from "./logger";

class AutoDeliveryProtocol {
	private started = false;
	private startupPromise: Promise<void> | null = null;

	async start() {
		if (this.started) return;
		if (this.startupPromise) return await this.startupPromise;

		this.startupPromise = this.startInternal();
		try {
			await this.startupPromise;
		} finally {
			this.startupPromise = null;
		}
	}

	private async startInternal() {
		await jobQueue.initialize();
		cronScheduler.initializeDefaultTasks();
		backupScheduler.start();
		healthMonitor.start();
		logCleanupManager.start();

		this.started = true;
		logger.info("Auto delivery protocol started", {
			queue: config.redisEnabled ? "redis" : "in-memory",
			backup: config.autoBackupEnabled,
			healthMonitoring: config.healthMonitoringEnabled,
			logCleanup: config.logCleanupEnabled,
		});
	}

	async stop() {
		if (this.startupPromise) {
			await this.startupPromise.catch(() => undefined);
		}
		if (!this.started) return;

		cronScheduler.stopAll();
		backupScheduler.stop();
		healthMonitor.stop();
		logCleanupManager.stop();
		await jobQueue.close();

		this.started = false;
		logger.info("Auto delivery protocol stopped");
	}

	async getStatus() {
		const configuredRecipients = [
			config.discordWebhookUrl ? "discord" : null,
			config.slackWebhookUrl ? "slack" : null,
			config.customWebhookUrl ? "custom-webhook" : null,
			config.emailNotificationsEnabled && config.adminEmail ? "email" : null,
		].filter(Boolean);

		return {
			codename: "AutoDeliveryProtocol",
			started: this.started,
			generatedAt: new Date().toISOString(),
			controls: {
				queue: config.redisEnabled ? "redis" : "in-memory-fallback",
				dailyReport: config.dailyReportEnabled,
				weeklyReport: config.weeklyReportEnabled,
				monthlyReport: config.monthlyReportEnabled,
				backup: config.autoBackupEnabled,
				healthMonitoring: config.healthMonitoringEnabled,
				logCleanup: config.logCleanupEnabled,
				fileCleanupCron: config.fileCleanupCronEnabled,
				recipients: configuredRecipients,
			},
			lanes: {
				queue: await jobQueue.getStats(),
				cron: cronScheduler.getStats(),
				backup: backupScheduler.getStatus(),
				health: healthMonitor.getStatus(),
				logs: logCleanupManager.getStats(),
			},
			guardrails: [
				"local-first execution",
				"no secret values in delivery payloads",
				"configured outbound channels only",
				"no desktop, game, or hidden input automation",
			],
		};
	}
}

export const autoDeliveryProtocol = new AutoDeliveryProtocol();
