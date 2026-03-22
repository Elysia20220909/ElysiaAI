export interface CacheOptions {
	ttl?: number;
	namespace?: string;
}
export declare class CacheManager {
	private redis;
	private defaultTTL;
	private namespace;
	constructor(redisUrl: string, defaultTTL?: number, namespace?: string);
	private getKey;
	get<T>(key: string, options?: CacheOptions): Promise<T | null>;
	set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>;
	del(key: string, options?: CacheOptions): Promise<boolean>;
	exists(key: string, options?: CacheOptions): Promise<boolean>;
	ttl(key: string, options?: CacheOptions): Promise<number>;
	incr(key: string, options?: CacheOptions): Promise<number>;
	getOrSet<T>(key: string, compute: () => Promise<T>, options?: CacheOptions): Promise<T>;
	invalidatePattern(pattern: string, options?: CacheOptions): Promise<number>;
	hget(key: string, field: string, options?: CacheOptions): Promise<string | null>;
	hset(key: string, field: string, value: string, options?: CacheOptions): Promise<boolean>;
	hgetall(key: string, options?: CacheOptions): Promise<Record<string, string>>;
	lpush(key: string, ...values: string[]): Promise<number>;
	lrange(key: string, start: number, stop: number): Promise<string[]>;
	close(): Promise<void>;
	flushNamespace(namespace?: string): Promise<number>;
}
export declare function createCacheManager(
	redisUrl: string,
	defaultTTL?: number,
	namespace?: string,
): CacheManager;
export declare function getCacheManager(): CacheManager;
//# sourceMappingURL=cache.d.ts.map
