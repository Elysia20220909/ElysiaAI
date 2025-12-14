import { logger } from "./logger";

interface CacheOptions {
	ttl?: number; // Time to live in seconds
	prefix?: string;
}

// biome-ignore lint: Dynamic import type for optional Redis client
type RedisClientType = any;

class CacheService {
	private client: RedisClientType | null = null;
	private isConnected = false;
	private readonly defaultTTL = 300; // 5 minutes
	private readonly keyPrefix = "cache:";

	async initialize(): Promise<void> {
		try {
			// Dynamic import to avoid compile-time dependency
			const redis = await import("redis").catch(() => null);
			if (!redis) {
				logger.warn(
					"Redis package not installed. Cache service disabled. Install with: bun add redis",
				);
				return;
			}

			this.client = redis.createClient({
				url: process.env.REDIS_URL || "redis://localhost:6379",
			});

			this.client.on("error", (err: Error) => {
				logger.error(`Redis cache error: ${err.message}`);
				this.isConnected = false;
			});

			this.client.on("connect", () => {
				logger.info("Redis cache connected");
				this.isConnected = true;
			});

			this.client.on("disconnect", () => {
				logger.warn("Redis cache disconnected");
				this.isConnected = false;
			});

			await this.client.connect();
		} catch (error) {
			logger.error(
				`Failed to initialize Redis cache: ${error instanceof Error ? error.message : String(error)}`,
			);
			this.client = null;
			this.isConnected = false;
		}
	}

	async disconnect(): Promise<void> {
		if (this.client && this.isConnected) {
			await this.client.quit();
			this.isConnected = false;
			logger.info("Redis cache disconnected");
		}
	}

	private buildKey(key: string, prefix?: string): string {
		return `${prefix || this.keyPrefix}${key}`;
	}

	async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
		if (!this.client || !this.isConnected) return null;

		try {
			const fullKey = this.buildKey(key, options?.prefix);
			const value = await this.client.get(fullKey);
			if (!value) return null;

			return JSON.parse(value) as T;
		} catch (error) {
			logger.error(`Cache get error: ${error instanceof Error ? error.message : String(error)}`);
			return null;
		}
	}

	async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
		if (!this.client || !this.isConnected) return;

		try {
			const fullKey = this.buildKey(key, options?.prefix);
			const ttl = options?.ttl || this.defaultTTL;
			await this.client.setEx(fullKey, ttl, JSON.stringify(value));
		} catch (error) {
			logger.error(`Cache set error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async delete(key: string, options?: CacheOptions): Promise<void> {
		if (!this.client || !this.isConnected) return;

		try {
			const fullKey = this.buildKey(key, options?.prefix);
			await this.client.del(fullKey);
		} catch (error) {
			logger.error(`Cache delete error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async has(key: string, options?: CacheOptions): Promise<boolean> {
		if (!this.client || !this.isConnected) return false;

		try {
			const fullKey = this.buildKey(key, options?.prefix);
			const exists = await this.client.exists(fullKey);
			return exists === 1;
		} catch (error) {
			logger.error(`Cache has error: ${error instanceof Error ? error.message : String(error)}`);
			return false;
		}
	}

	async invalidatePattern(pattern: string, options?: CacheOptions): Promise<void> {
		if (!this.client || !this.isConnected) return;

		try {
			const fullPattern = this.buildKey(pattern, options?.prefix);
			const keys = await this.client.keys(fullPattern);
			if (keys.length > 0) {
				await this.client.del(keys);
			}
		} catch (error) {
			logger.error(
				`Cache invalidate error: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// Specialized cache methods
	async cacheQueryResult<T>(queryKey: string, queryFn: () => Promise<T>, ttl = 300): Promise<T> {
		const cached = await this.get<T>(queryKey);
		if (cached !== null) return cached;

		const result = await queryFn();
		await this.set(queryKey, result, { ttl });
		return result;
	}

	async cacheAPIKey(apiKey: string, userId: string, ttl = 3600): Promise<void> {
		await this.set(`apikey:${apiKey}`, { userId, valid: true }, { ttl, prefix: "" });
	}

	async validateAPIKey(apiKey: string): Promise<{ userId: string; valid: boolean } | null> {
		return await this.get<{ userId: string; valid: boolean }>(`apikey:${apiKey}`, { prefix: "" });
	}

	async invalidateAPIKey(apiKey: string): Promise<void> {
		await this.delete(`apikey:${apiKey}`, { prefix: "" });
	}

	getStats(): { connected: boolean; client: RedisClientType | null } {
		return {
			connected: this.isConnected,
			client: this.client,
		};
	}
}

export const cacheService = new CacheService();
