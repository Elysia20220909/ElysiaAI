declare class PerformanceOptimizer {
	private cache;
	private readonly DEFAULT_TTL;
	getCache<T>(key: string): T | null;
	setCache<T>(key: string, data: T, ttlSeconds?: number): void;
	deleteCache(key: string): void;
	clearCacheByPattern(pattern: RegExp): number;
	clearAllCache(): void;
	cleanupExpiredCache(): number;
	getCacheStats(): {
		totalEntries: number;
		totalHits: number;
		avgHitsPerEntry: number;
		topEntries: {
			key: string;
			hits: number;
		}[];
	};
	shouldCompress(contentType: string, size: number): boolean;
}
export declare const performanceOptimizer: PerformanceOptimizer;
export {};
//# sourceMappingURL=performance-optimizer.d.ts.map
