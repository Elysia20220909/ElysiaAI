/**
 * API Analytics Service
 * エンドポイント別統計とレスポンスタイム分析
 */

import { logger } from "./logger";

interface RequestMetrics {
	endpoint: string;
	method: string;
	statusCode: number;
	responseTime: number;
	timestamp: Date;
	userId?: string;
}

interface EndpointStats {
	totalRequests: number;
	successCount: number;
	errorCount: number;
	avgResponseTime: number;
	minResponseTime: number;
	maxResponseTime: number;
	lastAccessed: Date;
}

class APIAnalytics {
	private metrics: RequestMetrics[] = [];
	private readonly MAX_METRICS = 10000; // 最大保存数

	/**
	 * リクエストを記録
	 */
	recordRequest(data: RequestMetrics) {
		this.metrics.push(data);

		// 古いメトリクスを削除
		if (this.metrics.length > this.MAX_METRICS) {
			this.metrics = this.metrics.slice(-this.MAX_METRICS);
		}
	}

	/**
	 * エンドポイント別統計を取得
	 */
	getEndpointStats(): Record<string, EndpointStats> {
		const stats: Record<string, EndpointStats> = {};

		for (const metric of this.metrics) {
			const key = `${metric.method} ${metric.endpoint}`;

			if (!stats[key]) {
				stats[key] = {
					totalRequests: 0,
					successCount: 0,
					errorCount: 0,
					avgResponseTime: 0,
					minResponseTime: Number.POSITIVE_INFINITY,
					maxResponseTime: 0,
					lastAccessed: metric.timestamp,
				};
			}

			const stat = stats[key];
			stat.totalRequests++;

			if (metric.statusCode >= 200 && metric.statusCode < 400) {
				stat.successCount++;
			} else {
				stat.errorCount++;
			}

			stat.minResponseTime = Math.min(
				stat.minResponseTime,
				metric.responseTime,
			);
			stat.maxResponseTime = Math.max(
				stat.maxResponseTime,
				metric.responseTime,
			);
			stat.lastAccessed =
				metric.timestamp > stat.lastAccessed
					? metric.timestamp
					: stat.lastAccessed;
		}

		// 平均レスポンスタイムを計算
		for (const key in stats) {
			const relevantMetrics = this.metrics.filter(
				(m) => `${m.method} ${m.endpoint}` === key,
			);
			const totalTime = relevantMetrics.reduce(
				(sum, m) => sum + m.responseTime,
				0,
			);
			stats[key].avgResponseTime = totalTime / relevantMetrics.length;
		}

		return stats;
	}

	/**
	 * 時間帯別アクセス統計
	 */
	getHourlyStats(): Record<number, number> {
		const hourly: Record<number, number> = {};

		for (let i = 0; i < 24; i++) {
			hourly[i] = 0;
		}

		for (const metric of this.metrics) {
			const hour = metric.timestamp.getHours();
			hourly[hour]++;
		}

		return hourly;
	}

	/**
	 * レスポンスタイム分布
	 */
	getResponseTimeDistribution(): Record<string, number> {
		const distribution = {
			"< 100ms": 0,
			"100-500ms": 0,
			"500ms-1s": 0,
			"1s-3s": 0,
			"> 3s": 0,
		};

		for (const metric of this.metrics) {
			const time = metric.responseTime;
			if (time < 100) {
				distribution["< 100ms"]++;
			} else if (time < 500) {
				distribution["100-500ms"]++;
			} else if (time < 1000) {
				distribution["500ms-1s"]++;
			} else if (time < 3000) {
				distribution["1s-3s"]++;
			} else {
				distribution["> 3s"]++;
			}
		}

		return distribution;
	}

	/**
	 * 人気エンドポイントTop10
	 */
	getTopEndpoints(limit = 10): Array<{ endpoint: string; requests: number }> {
		const endpointCounts: Record<string, number> = {};

		for (const metric of this.metrics) {
			const key = `${metric.method} ${metric.endpoint}`;
			endpointCounts[key] = (endpointCounts[key] || 0) + 1;
		}

		return Object.entries(endpointCounts)
			.map(([endpoint, requests]) => ({ endpoint, requests }))
			.sort((a, b) => b.requests - a.requests)
			.slice(0, limit);
	}

	/**
	 * エラー率を取得
	 */
	getErrorRate(): { total: number; errors: number; rate: number } {
		const total = this.metrics.length;
		const errors = this.metrics.filter((m) => m.statusCode >= 400).length;
		const rate = total > 0 ? (errors / total) * 100 : 0;

		return { total, errors, rate };
	}

	/**
	 * 統計をリセット
	 */
	clearMetrics() {
		this.metrics = [];
	}

	/**
	 * JSON形式でエクスポート
	 */
	exportJSON() {
		return {
			summary: {
				totalRequests: this.metrics.length,
				errorRate: this.getErrorRate(),
				topEndpoints: this.getTopEndpoints(),
				responseTimeDistribution: this.getResponseTimeDistribution(),
			},
			endpointStats: this.getEndpointStats(),
			hourlyStats: this.getHourlyStats(),
			generatedAt: new Date().toISOString(),
		};
	}
}

export const apiAnalytics = new APIAnalytics();
