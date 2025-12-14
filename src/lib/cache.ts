// Redis Cache Layer with TTL Management
import Redis from "ioredis";

export interface CacheOptions {
	ttl?: number; // seconds
	namespace?: string;
}

export class CacheManager {
	private redis: Redis;
	private defaultTTL: number;
	private namespace: string;

	constructor(redisUrl: string, defaultTTL = 3600, namespace = "elysia") {
		this.redis = new Redis(redisUrl);
		this.defaultTTL = defaultTTL;
		this.namespace = namespace;

		this.redis.on("error", (error) => {
			console.error("[Cache] Redis error:", error);
		});
	}

	private getKey(key: string, namespace?: string): string {
		return `${namespace || this.namespace}:${key}`;
	}

	/**
	 * Get value from cache
	 */
	async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			const value = await this.redis.get(fullKey);
			return value ? JSON.parse(value) : null;
		} catch (error) {
			console.error("[Cache] Get error:", error);
			return null;
		}
	}

	/**
	 * Set value in cache with TTL
	 */
	async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			const ttl = options?.ttl || this.defaultTTL;
			const serialized = JSON.stringify(value);

			if (ttl > 0) {
				await this.redis.setex(fullKey, ttl, serialized);
			} else {
				await this.redis.set(fullKey, serialized);
			}
			return true;
		} catch (error) {
			console.error("[Cache] Set error:", error);
			return false;
		}
	}

	/**
	 * Delete key from cache
	 */
	async del(key: string, options?: CacheOptions): Promise<boolean> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			await this.redis.del(fullKey);
			return true;
		} catch (error) {
			console.error("[Cache] Delete error:", error);
			return false;
		}
	}

	/**
	 * Check if key exists
	 */
	async exists(key: string, options?: CacheOptions): Promise<boolean> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			const result = await this.redis.exists(fullKey);
			return result === 1;
		} catch (error) {
			console.error("[Cache] Exists error:", error);
			return false;
		}
	}

	/**
	 * Get remaining TTL for key
	 */
	async ttl(key: string, options?: CacheOptions): Promise<number> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			return await this.redis.ttl(fullKey);
		} catch (error) {
			console.error("[Cache] TTL error:", error);
			return -1;
		}
	}

	/**
	 * Increment counter
	 */
	async incr(key: string, options?: CacheOptions): Promise<number> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			const value = await this.redis.incr(fullKey);

			// Set TTL if specified
			if (options?.ttl) {
				await this.redis.expire(fullKey, options.ttl);
			}

			return value;
		} catch (error) {
			console.error("[Cache] Increment error:", error);
			return 0;
		}
	}

	/**
	 * Get or compute value (cache-aside pattern)
	 */
	async getOrSet<T>(key: string, compute: () => Promise<T>, options?: CacheOptions): Promise<T> {
		// Try to get from cache
		const cached = await this.get<T>(key, options);
		if (cached !== null) {
			return cached;
		}

		// Compute value
		const value = await compute();

		// Store in cache
		await this.set(key, value, options);

		return value;
	}

	/**
	 * Invalidate cache by pattern
	 */
	async invalidatePattern(pattern: string, options?: CacheOptions): Promise<number> {
		try {
			const fullPattern = this.getKey(pattern, options?.namespace);
			const keys = await this.redis.keys(fullPattern);

			if (keys.length === 0) return 0;

			await this.redis.del(...keys);
			return keys.length;
		} catch (error) {
			console.error("[Cache] Invalidate pattern error:", error);
			return 0;
		}
	}

	/**
	 * Hash operations
	 */
	async hget(key: string, field: string, options?: CacheOptions): Promise<string | null> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			return await this.redis.hget(fullKey, field);
		} catch (error) {
			console.error("[Cache] HGet error:", error);
			return null;
		}
	}

	async hset(key: string, field: string, value: string, options?: CacheOptions): Promise<boolean> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			await this.redis.hset(fullKey, field, value);

			if (options?.ttl) {
				await this.redis.expire(fullKey, options.ttl);
			}

			return true;
		} catch (error) {
			console.error("[Cache] HSet error:", error);
			return false;
		}
	}

	async hgetall(key: string, options?: CacheOptions): Promise<Record<string, string>> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			return await this.redis.hgetall(fullKey);
		} catch (error) {
			console.error("[Cache] HGetAll error:", error);
			return {};
		}
	}

	/**
	 * List operations
	 */
	async lpush(key: string, ...values: string[]): Promise<number> {
		try {
			const fullKey = this.getKey(key);
			return await this.redis.lpush(fullKey, ...values);
		} catch (error) {
			console.error("[Cache] LPush error:", error);
			return 0;
		}
	}

	async lrange(key: string, start: number, stop: number): Promise<string[]> {
		try {
			const fullKey = this.getKey(key);
			return await this.redis.lrange(fullKey, start, stop);
		} catch (error) {
			console.error("[Cache] LRange error:", error);
			return [];
		}
	}

	/**
	 * Close connection
	 */
	async close(): Promise<void> {
		await this.redis.quit();
	}

	/**
	 * Flush namespace
	 */
	async flushNamespace(namespace?: string): Promise<number> {
		return await this.invalidatePattern("*", { namespace });
	}
}

// Create singleton instance
let cacheInstance: CacheManager | null = null;

export function createCacheManager(
	redisUrl: string,
	defaultTTL?: number,
	namespace?: string,
): CacheManager {
	if (!cacheInstance) {
		cacheInstance = new CacheManager(redisUrl, defaultTTL, namespace);
	}
	return cacheInstance;
}

export function getCacheManager(): CacheManager {
	if (!cacheInstance) {
		throw new Error("Cache manager not initialized. Call createCacheManager first.");
	}
	return cacheInstance;
}
