/**
 * Performance Optimizer
 * レスポンスキャッシュ、静的ファイル圧縮
 */

import { logger } from "./logger";

interface CacheEntry<T> {
	data: T;
	cachedAt: Date;
	expiresAt: Date;
	hits: number;
}

class PerformanceOptimizer {
	private cache: Map<string, CacheEntry<unknown>> = new Map();
	private readonly DEFAULT_TTL = 300; // 5分

	/**
	 * キャッシュを取得
	 */
	getCache<T>(key: string): T | null {
		const entry = this.cache.get(key) as CacheEntry<T> | undefined;

		if (!entry) {
			return null;
		}

		// 有効期限チェック
		if (entry.expiresAt < new Date()) {
			this.cache.delete(key);
			return null;
		}

		entry.hits++;
		logger.debug("Cache hit", { key, hits: entry.hits });
		return entry.data;
	}

	/**
	 * キャッシュを設定
	 */
	setCache<T>(key: string, data: T, ttlSeconds = this.DEFAULT_TTL): void {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

		this.cache.set(key, {
			data,
			cachedAt: now,
			expiresAt,
			hits: 0,
		});

		logger.debug("Cache set", { key, ttl: ttlSeconds });
	}

	/**
	 * キャッシュを削除
	 */
	deleteCache(key: string): void {
		this.cache.delete(key);
		logger.debug("Cache deleted", { key });
	}

	/**
	 * パターンマッチでキャッシュをクリア
	 */
	clearCacheByPattern(pattern: RegExp): number {
		let cleared = 0;
		for (const key of this.cache.keys()) {
			if (pattern.test(key)) {
				this.cache.delete(key);
				cleared++;
			}
		}
		logger.info("Cache cleared by pattern", {
			pattern: pattern.source,
			count: cleared,
		});
		return cleared;
	}

	/**
	 * すべてのキャッシュをクリア
	 */
	clearAllCache(): void {
		const size = this.cache.size;
		this.cache.clear();
		logger.info("All cache cleared", { count: size });
	}

	/**
	 * 期限切れキャッシュを削除
	 */
	cleanupExpiredCache(): number {
		const now = new Date();
		let cleaned = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.expiresAt < now) {
				this.cache.delete(key);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			logger.info("Expired cache cleaned", { count: cleaned });
		}

		return cleaned;
	}

	/**
	 * キャッシュ統計
	 */
	getCacheStats() {
		const entries = Array.from(this.cache.entries());
		const totalHits = entries.reduce((sum, [, entry]) => sum + entry.hits, 0);
		const avgHits = entries.length > 0 ? totalHits / entries.length : 0;

		return {
			totalEntries: this.cache.size,
			totalHits,
			avgHitsPerEntry: Math.round(avgHits * 100) / 100,
			topEntries: entries
				.map(([key, entry]) => ({ key, hits: entry.hits }))
				.sort((a, b) => b.hits - a.hits)
				.slice(0, 10),
		};
	}

	/**
	 * レスポンス圧縮推奨チェック
	 */
	shouldCompress(contentType: string, size: number): boolean {
		const compressibleTypes = [
			"text/html",
			"text/css",
			"text/javascript",
			"application/javascript",
			"application/json",
			"application/xml",
			"text/xml",
		];

		const isCompressible = compressibleTypes.some((type) => contentType.includes(type));
		const isSizeEligible = size > 1024; // 1KB以上

		return isCompressible && isSizeEligible;
	}
}

export const performanceOptimizer = new PerformanceOptimizer();

// 定期的に期限切れキャッシュをクリーンアップ
setInterval(() => {
	performanceOptimizer.cleanupExpiredCache();
}, 60000); // 1分ごと
