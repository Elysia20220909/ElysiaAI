/**
 * Log Cleanup Automation
 * 古いログファイル自動削除・ログローテーション強化
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "./logger";

interface LogCleanupConfig {
	enabled: boolean;
	logDir: string;
	maxAgeDays: number;
	maxSizeMB: number;
	checkInterval: number; // 時間単位
	compressionEnabled: boolean;
}

class LogCleanupManager {
	private config: LogCleanupConfig;
	private intervalId?: Timer;
	private isRunning = false;

	constructor() {
		this.config = {
			enabled: process.env.LOG_CLEANUP_ENABLED !== "false",
			logDir: process.env.LOG_DIR || "./logs",
			maxAgeDays: Number(process.env.LOG_MAX_AGE_DAYS) || 30,
			maxSizeMB: Number(process.env.LOG_MAX_SIZE_MB) || 500,
			checkInterval: Number(process.env.LOG_CLEANUP_INTERVAL_HOURS) || 24,
			compressionEnabled: process.env.LOG_COMPRESSION_ENABLED === "true",
		};
	}

	/**
	 * 自動クリーンアップを開始
	 */
	start() {
		if (!this.config.enabled) {
			logger.info("Log cleanup is disabled");
			return;
		}

		if (this.isRunning) {
			logger.warn("Log cleanup is already running");
			return;
		}

		this.isRunning = true;

		// 初回実行
		this.performCleanup();

		// 定期実行
		this.intervalId = setInterval(
			() => {
				this.performCleanup();
			},
			this.config.checkInterval * 60 * 60 * 1000,
		);

		logger.info("Log cleanup started", {
			interval: `${this.config.checkInterval} hours`,
			maxAge: `${this.config.maxAgeDays} days`,
			maxSize: `${this.config.maxSizeMB} MB`,
		});
	}

	/**
	 * 自動クリーンアップを停止
	 */
	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
			this.isRunning = false;
			logger.info("Log cleanup stopped");
		}
	}

	/**
	 * クリーンアップを実行
	 */
	private async performCleanup() {
		const startTime = Date.now();

		try {
			logger.info("Starting log cleanup");

			if (!fs.existsSync(this.config.logDir)) {
				logger.warn(`Log directory not found: ${this.config.logDir}`);
				return;
			}

			const stats = await this.analyzeLogDirectory();

			// 古いログを削除
			const deletedByAge = await this.deleteOldLogs();

			// サイズ制限を超えている場合は古いものから削除
			let deletedBySize = 0;
			if (stats.totalSizeMB > this.config.maxSizeMB) {
				deletedBySize = await this.deleteBySize(stats.totalSizeMB - this.config.maxSizeMB);
			}

			const duration = Date.now() - startTime;

			logger.info("Log cleanup completed", {
				deletedByAge,
				deletedBySize,
				duration: `${duration}ms`,
			});
		} catch (error) {
			logger.error("Log cleanup failed", error as Error);
		}
	}

	/**
	 * ログディレクトリを分析
	 */
	private async analyzeLogDirectory() {
		const files = fs.readdirSync(this.config.logDir);
		let totalSize = 0;
		let fileCount = 0;

		for (const file of files) {
			if (file.endsWith(".log") || file.endsWith(".log.gz")) {
				const filePath = path.join(this.config.logDir, file);
				const stats = fs.statSync(filePath);
				totalSize += stats.size;
				fileCount++;
			}
		}

		return {
			totalSizeMB: totalSize / (1024 * 1024),
			fileCount,
		};
	}

	/**
	 * 古いログを削除
	 */
	private async deleteOldLogs(): Promise<number> {
		const files = fs.readdirSync(this.config.logDir);
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - this.config.maxAgeDays);

		let deletedCount = 0;

		for (const file of files) {
			if (file.endsWith(".log") || file.endsWith(".log.gz")) {
				const filePath = path.join(this.config.logDir, file);
				const stats = fs.statSync(filePath);

				if (stats.mtime < cutoffDate) {
					fs.unlinkSync(filePath);
					deletedCount++;
					logger.debug("Old log deleted", { file });
				}
			}
		}

		return deletedCount;
	}

	/**
	 * サイズ制限に基づいて削除
	 */
	private async deleteBySize(targetSizeMB: number): Promise<number> {
		const files = fs
			.readdirSync(this.config.logDir)
			.filter((f) => f.endsWith(".log") || f.endsWith(".log.gz"))
			.map((f) => {
				const filePath = path.join(this.config.logDir, f);
				const stats = fs.statSync(filePath);
				return {
					path: filePath,
					name: f,
					size: stats.size,
					mtime: stats.mtime,
				};
			})
			.sort((a, b) => a.mtime.getTime() - b.mtime.getTime()); // 古い順

		let deletedSize = 0;
		let deletedCount = 0;
		const targetSize = targetSizeMB * 1024 * 1024;

		for (const file of files) {
			if (deletedSize >= targetSize) break;

			fs.unlinkSync(file.path);
			deletedSize += file.size;
			deletedCount++;
			logger.debug("Log deleted due to size limit", { file: file.name });
		}

		return deletedCount;
	}

	/**
	 * ログをローテーション（現在のログをアーカイブ）
	 */
	async rotateLog(logFile: string) {
		const filePath = path.join(this.config.logDir, logFile);

		if (!fs.existsSync(filePath)) {
			logger.warn(`Log file not found: ${logFile}`);
			return;
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const archiveName = `${logFile}.${timestamp}`;
		const archivePath = path.join(this.config.logDir, archiveName);

		try {
			// ログファイルをリネーム
			fs.renameSync(filePath, archivePath);

			// 圧縮（オプション）
			if (this.config.compressionEnabled) {
				await this.compressLog(archivePath);
			}

			logger.info("Log rotated", { file: logFile, archive: archiveName });
		} catch (error) {
			logger.error("Log rotation failed", error as Error);
		}
	}

	/**
	 * ログを圧縮
	 */
	private async compressLog(filePath: string) {
		try {
			const zlib = await import("node:zlib");
			const { createReadStream, createWriteStream } = fs;
			const gzip = zlib.createGzip();

			const source = createReadStream(filePath);
			const destination = createWriteStream(`${filePath}.gz`);

			await new Promise<void>((resolve, reject) => {
				source
					.pipe(gzip)
					.pipe(destination)
					.on("finish", () => resolve())
					.on("error", reject);
			});

			// 元のファイルを削除
			fs.unlinkSync(filePath);

			logger.debug("Log compressed", { file: path.basename(filePath) });
		} catch (error) {
			logger.error("Log compression failed", error as Error);
		}
	}

	/**
	 * クリーンアップ統計を取得
	 */
	getStats() {
		try {
			const stats = this.analyzeLogDirectory();

			return {
				enabled: this.config.enabled,
				running: this.isRunning,
				logDir: this.config.logDir,
				maxAgeDays: this.config.maxAgeDays,
				maxSizeMB: this.config.maxSizeMB,
				...stats,
			};
		} catch {
			return {
				enabled: this.config.enabled,
				running: this.isRunning,
				error: "Unable to analyze logs",
			};
		}
	}

	/**
	 * 手動クリーンアップを実行
	 */
	async triggerManualCleanup() {
		await this.performCleanup();
	}
}

export const logCleanupManager = new LogCleanupManager();
