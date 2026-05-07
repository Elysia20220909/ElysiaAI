// Redis Cache Layer with TTL Management
import Redis from "ioredis";
import { config } from "../../../../src/config.ts";

export interface CacheOptions {
	ttl?: number; // seconds
	namespace?: string;
}

export class CacheManager {
	private redis: Redis | null;
	private defaultTTL: number;
	private namespace: string;
	private readonly memory = new Map<
		string,
		{ value: string; expiresAt: number }
	>();
	private readonly useMemoryFallback: boolean;

	constructor(redisUrl: string, defaultTTL = 3600, namespace = "elysia") {
		this.useMemoryFallback = !config.redisEnabled;
		this.redis = this.useMemoryFallback
			? null
			: new Redis(redisUrl, {
					enableOfflineQueue: false,
					maxRetriesPerRequest: 1,
				});
		this.defaultTTL = defaultTTL;
		this.namespace = namespace;

		this.redis?.on("error", (error) => {
			console.error("[Cache] Redis error:", error);
		});
	}

	private getKey(key: string, namespace?: string): string {
		return `${namespace || this.namespace}:${key}`;
	}

	private isExpired(entry: { expiresAt: number }): boolean {
		return entry.expiresAt > 0 && Date.now() > entry.expiresAt;
	}

	private getMemoryValue(fullKey: string): string | null {
		const entry = this.memory.get(fullKey);
		if (!entry) return null;
		if (this.isExpired(entry)) {
			this.memory.delete(fullKey);
			return null;
		}
		return entry.value;
	}

	/**
	 * Get value from cache
	 */
	async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			const value = this.redis
				? await this.redis.get(fullKey)
				: this.getMemoryValue(fullKey);
			return value ? JSON.parse(value) : null;
		} catch (error) {
			console.error("[Cache] Get error:", error);
			return null;
		}
	}

	/**
	 * Set value in cache with TTL
	 */
	async set<T>(
		key: string,
		value: T,
		options?: CacheOptions,
	): Promise<boolean> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			const ttl = options?.ttl || this.defaultTTL;
			const serialized = JSON.stringify(value);

			if (!this.redis) {
				this.memory.set(fullKey, {
					value: serialized,
					expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : 0,
				});
			} else if (ttl > 0) {
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
			if (this.redis) {
				await this.redis.del(fullKey);
			} else {
				this.memory.delete(fullKey);
			}
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
			const result = this.redis
				? await this.redis.exists(fullKey)
				: this.getMemoryValue(fullKey) === null
					? 0
					: 1;
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
			if (this.redis) return await this.redis.ttl(fullKey);

			const entry = this.memory.get(fullKey);
			if (!entry) return -2;
			if (this.isExpired(entry)) {
				this.memory.delete(fullKey);
				return -2;
			}
			if (entry.expiresAt === 0) return -1;
			return Math.ceil((entry.expiresAt - Date.now()) / 1000);
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
			const value = this.redis
				? await this.redis.incr(fullKey)
				: Number(this.getMemoryValue(fullKey) ?? 0) + 1;

			// Set TTL if specified
			if (!this.redis) {
				this.memory.set(fullKey, {
					value: String(value),
					expiresAt: options?.ttl ? Date.now() + options.ttl * 1000 : 0,
				});
			} else if (options?.ttl) {
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
	async getOrSet<T>(
		key: string,
		compute: () => Promise<T>,
		options?: CacheOptions,
	): Promise<T> {
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
	async invalidatePattern(
		pattern: string,
		options?: CacheOptions,
	): Promise<number> {
		try {
			const fullPattern = this.getKey(pattern, options?.namespace);
			const keys = this.redis
				? await this.redis.keys(fullPattern)
				: Array.from(this.memory.keys()).filter((key) =>
						key.startsWith(fullPattern.replace("*", "")),
					);

			if (keys.length === 0) return 0;

			if (this.redis) {
				await this.redis.del(...keys);
			} else {
				for (const key of keys) this.memory.delete(key);
			}
			return keys.length;
		} catch (error) {
			console.error("[Cache] Invalidate pattern error:", error);
			return 0;
		}
	}

	/**
	 * Hash operations
	 */
	async hget(
		key: string,
		field: string,
		options?: CacheOptions,
	): Promise<string | null> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			if (!this.redis) return null;
			return await this.redis.hget(fullKey, field);
		} catch (error) {
			console.error("[Cache] HGet error:", error);
			return null;
		}
	}

	async hset(
		key: string,
		field: string,
		value: string,
		options?: CacheOptions,
	): Promise<boolean> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			if (!this.redis) return false;
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

	async hgetall(
		key: string,
		options?: CacheOptions,
	): Promise<Record<string, string>> {
		try {
			const fullKey = this.getKey(key, options?.namespace);
			if (!this.redis) return {};
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
			if (!this.redis) return 0;
			return await this.redis.lpush(fullKey, ...values);
		} catch (error) {
			console.error("[Cache] LPush error:", error);
			return 0;
		}
	}

	async lrange(key: string, start: number, stop: number): Promise<string[]> {
		try {
			const fullKey = this.getKey(key);
			if (!this.redis) return [];
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
		this.memory.clear();
		await this.redis?.quit();
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
		throw new Error(
			"Cache manager not initialized. Call createCacheManager first.",
		);
	}
	return cacheInstance;
}
