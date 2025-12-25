/**
 * Audit Logger
 * 監査ログ記録システム
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "./logger";

interface AuditLog {
	id: string;
	timestamp: Date;
	userId?: string;
	action: string;
	resource: string;
	resourceId?: string;
	method: string;
	path: string;
	ipAddress: string;
	userAgent: string;
	statusCode: number;
	before?: unknown;
	after?: unknown;
	error?: string;
}

interface AuditSearchOptions {
	userId?: string;
	action?: string;
	resource?: string;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
	offset?: number;
}

class AuditLoggerService {
	private readonly LOG_DIR: string;
	private readonly LOG_FILE: string;
	private logs: AuditLog[];
	private logCounter: number;

	constructor() {
		this.LOG_DIR = process.env.AUDIT_LOG_DIR || "./logs/audit";
		this.LOG_FILE = path.join(this.LOG_DIR, "audit.jsonl");
		this.logs = [];
		this.logCounter = 0;

		// ログディレクトリ作成
		if (!fs.existsSync(this.LOG_DIR)) {
			fs.mkdirSync(this.LOG_DIR, { recursive: true });
		}

		// 既存ログの読み込み
		this.loadLogs();
	}

	/**
	 * 既存ログを読み込み
	 */
	private loadLogs() {
		if (!fs.existsSync(this.LOG_FILE)) return;

		try {
			const content = fs.readFileSync(this.LOG_FILE, "utf-8");
			const lines = content.split("\n").filter((line) => line.trim());

			for (const line of lines) {
				try {
					const log = JSON.parse(line);
					log.timestamp = new Date(log.timestamp);
					this.logs.push(log);
				} catch {
					// 無効な行はスキップ
				}
			}

			logger.info("Audit logs loaded", { count: this.logs.length });
		} catch (error) {
			logger.error("Failed to load audit logs", error as Error);
		}
	}

	/**
	 * ログを記録
	 */
	log(entry: Omit<AuditLog, "id" | "timestamp">): void {
		const log: AuditLog = {
			id: `audit-${Date.now()}-${++this.logCounter}`,
			timestamp: new Date(),
			...entry,
		};

		this.logs.push(log);

		// ファイルに追記
		try {
			fs.appendFileSync(this.LOG_FILE, `${JSON.stringify(log)}\n`);
		} catch (error) {
			logger.error("Failed to write audit log", error as Error);
		}

		logger.debug("Audit log recorded", {
			id: log.id,
			action: log.action,
			resource: log.resource,
		});
	}

	/**
	 * ログを検索
	 */
	search(options: AuditSearchOptions = {}): {
		logs: AuditLog[];
		total: number;
		offset: number;
		limit: number;
	} {
		let filtered = [...this.logs];

		// フィルタリング
		if (options.userId) {
			filtered = filtered.filter((log) => log.userId === options.userId);
		}

		if (options.action) {
			filtered = filtered.filter((log) => log.action === options.action);
		}

		if (options.resource) {
			filtered = filtered.filter((log) => log.resource === options.resource);
		}

		if (options.startDate) {
			const startDate = options.startDate;
			filtered = filtered.filter((log) => log.timestamp >= startDate);
		}

		if (options.endDate) {
			const endDate = options.endDate;
			filtered = filtered.filter((log) => log.timestamp <= endDate);
		}

		// ソート（新しい順）
		filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

		const total = filtered.length;
		const offset = options.offset || 0;
		const limit = options.limit || 100;

		// ページング
		const paginated = filtered.slice(offset, offset + limit);

		return {
			logs: paginated,
			total,
			offset,
			limit,
		};
	}

	/**
	 * ユーザーの最近のアクティビティを取得
	 */
	getUserActivity(userId: string, limit = 20): AuditLog[] {
		return this.search({ userId, limit }).logs;
	}

	/**
	 * リソースの変更履歴を取得
	 */
	getResourceHistory(resource: string, resourceId: string): AuditLog[] {
		return this.logs
			.filter((log) => log.resource === resource && log.resourceId === resourceId)
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
	}

	/**
	 * 統計情報を取得
	 */
	getStats() {
		const now = new Date();
		const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		const recentLogs = this.logs.filter((log) => log.timestamp >= last24h);
		const weeklyLogs = this.logs.filter((log) => log.timestamp >= last7d);

		const actionCounts: Record<string, number> = {};
		const userCounts: Record<string, number> = {};

		for (const log of recentLogs) {
			actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
			if (log.userId) {
				userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
			}
		}

		return {
			totalLogs: this.logs.length,
			last24Hours: recentLogs.length,
			last7Days: weeklyLogs.length,
			topActions: Object.entries(actionCounts)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 10)
				.map(([action, count]) => ({ action, count })),
			topUsers: Object.entries(userCounts)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 10)
				.map(([userId, count]) => ({ userId, count })),
		};
	}

	/**
	 * 古いログをクリーンアップ
	 */
	cleanupOldLogs(maxAgeDays = 90) {
		const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
		const originalCount = this.logs.length;

		this.logs = this.logs.filter((log) => log.timestamp >= cutoff);

		// ファイルを再書き込み
		try {
			const content = this.logs.map((log) => JSON.stringify(log)).join("\n");
			fs.writeFileSync(this.LOG_FILE, `${content}\n`);

			logger.info("Old audit logs cleaned up", {
				deleted: originalCount - this.logs.length,
				remaining: this.logs.length,
				maxAgeDays,
			});

			return originalCount - this.logs.length;
		} catch (error) {
			logger.error("Failed to cleanup audit logs", error as Error);
			return 0;
		}
	}

	/**
	 * ログをエクスポート
	 */
	export(format: "json" | "csv", options: AuditSearchOptions = {}): string | null {
		const { logs } = this.search(options);

		if (format === "json") {
			return JSON.stringify(logs, null, 2);
		}

		if (format === "csv") {
			const headers = [
				"ID",
				"Timestamp",
				"User ID",
				"Action",
				"Resource",
				"Resource ID",
				"Method",
				"Path",
				"IP Address",
				"Status Code",
			];

			const rows = logs.map((log) => {
				const status = log.statusCode ?? 0;
				return [
					log.id,
					log.timestamp.toISOString(),
					log.userId || "",
					log.action,
					log.resource,
					log.resourceId || "",
					log.method,
					log.path,
					log.ipAddress,
					status.toString(),
				];
			});

			return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
		}

		return null;
	}
}

export const auditLogger = new AuditLoggerService();
