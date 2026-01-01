// Redis Cache Layer with optional in-memory fallback
import Redis from "ioredis";

export interface CacheOptions {
	ttl?: number; // seconds
	namespace?: string;
}

type MemoryEntry = {
	value: unknown;
	expiresAt: number | null;
};

export class CacheManager {
	private redis: Redis | null;
	private memory: Map<string, MemoryEntry>;
	private defaultTTL: number;
	private namespace: string;
	private useMemory: boolean;

	constructor(redisUrl: string, defaultTTL = 3600, namespace = "elysia") {
		this.useMemory =
			process.env.CACHE_DRIVER === "memory" ||
			process.env.NODE_ENV === "test" ||
			process.env.MOCK_REDIS === "true";
		this.redis = this.useMemory ? null : new Redis(redisUrl);
		this.memory = new Map();
		this.defaultTTL = defaultTTL;
		this.namespace = namespace;

		if (this.redis) {
			this.redis.on("error", (error) => {
				console.error("[Cache] Redis error:", error);
			});
		}
	}

	private getKey(key: string, namespace?: string): string {
		return `${namespace || this.namespace}:${key}`;
	}

	private isExpired(entry?: MemoryEntry | null): boolean {
		return !!entry?.expiresAt && entry.expiresAt < Date.now();
	}

	async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
		const fullKey = this.getKey(key, options?.namespace);

		if (this.useMemory) {
			const entry = this.memory.get(fullKey);
			if (!entry || this.isExpired(entry)) {
				this.memory.delete(fullKey);
				return null;
			}
			return entry.value as T;
		}

		const value = await this.redis!.get(fullKey);
		return value ? (JSON.parse(value) as T) : null;
	}

	async set<T>(
		key: string,
		value: T,
		options?: CacheOptions,
	): Promise<boolean> {
		const fullKey = this.getKey(key, options?.namespace);
		const ttl = options?.ttl ?? this.defaultTTL;

		if (this.useMemory) {
			this.memory.set(fullKey, {
				value,
				expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : null,
			});
			return true;
		}

		if (ttl > 0) {
			await this.redis!.setex(fullKey, ttl, JSON.stringify(value));
		} else {
			await this.redis!.set(fullKey, JSON.stringify(value));
		}
		return true;
	}

	async del(key: string, options?: CacheOptions): Promise<boolean> {
		const fullKey = this.getKey(key, options?.namespace);
		if (this.useMemory) {
			this.memory.delete(fullKey);
			return true;
		}
		await this.redis!.del(fullKey);
		return true;
	}

	async exists(key: string, options?: CacheOptions): Promise<boolean> {
		const fullKey = this.getKey(key, options?.namespace);
		if (this.useMemory) {
			const entry = this.memory.get(fullKey);
			if (!entry || this.isExpired(entry)) {
				this.memory.delete(fullKey);
				return false;
			}
			return true;
		}
		return (await this.redis!.exists(fullKey)) === 1;
	}

	async ttl(key: string, options?: CacheOptions): Promise<number> {
		const fullKey = this.getKey(key, options?.namespace);
		if (this.useMemory) {
			const entry = this.memory.get(fullKey);
			if (!entry || entry.expiresAt === null) return -1;
			return Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000));
		}
		return await this.redis!.ttl(fullKey);
	}

	async incr(key: string, options?: CacheOptions): Promise<number> {
		const fullKey = this.getKey(key, options?.namespace);
		if (this.useMemory) {
			const entry = this.memory.get(fullKey);
			const current = entry && !this.isExpired(entry) ? Number(entry.value) || 0 : 0;
			const next = current + 1;
			this.memory.set(fullKey, {
				value: next,
				expiresAt:
					options?.ttl && options.ttl > 0
						? Date.now() + options.ttl * 1000
						: entry?.expiresAt ?? null,
			});
			return next;
		}

		const value = await this.redis!.incr(fullKey);
		if (options?.ttl) {
			await this.redis!.expire(fullKey, options.ttl);
		}
		return value;
	}

	async getOrSet<T>(
		key: string,
		compute: () => Promise<T>,
		options?: CacheOptions,
	): Promise<T> {
		const cached = await this.get<T>(key, options);
		if (cached !== null) return cached;

		const value = await compute();
		await this.set(key, value, options);
		return value;
	}

	async invalidatePattern(
		pattern: string,
		options?: CacheOptions,
	): Promise<number> {
		const fullPattern = this.getKey(pattern, options?.namespace);
		if (this.useMemory) {
			const regex = new RegExp("^" + fullPattern.replace("*", ".*").replace(":", ":"));
			const keys = [...this.memory.keys()].filter((k) => regex.test(k));
			keys.forEach((k) => this.memory.delete(k));
			return keys.length;
		}

		const keys = await this.redis!.keys(fullPattern);
		if (keys.length) {
			await this.redis!.del(...keys);
		}
		return keys.length;
	}

	async hget(
		key: string,
		field: string,
		options?: CacheOptions,
	): Promise<string | null> {
		const fullKey = `${this.getKey(key, options?.namespace)}:${field}`;
		if (this.useMemory) {
			const entry = this.memory.get(fullKey);
			if (!entry || this.isExpired(entry)) {
				this.memory.delete(fullKey);
				return null;
			}
			return String(entry.value);
		}
		return await this.redis!.hget(this.getKey(key, options?.namespace), field);
	}

	async hset(
		key: string,
		field: string,
		value: string,
		options?: CacheOptions,
	): Promise<boolean> {
		const fullKey = `${this.getKey(key, options?.namespace)}:${field}`;
		if (this.useMemory) {
			this.memory.set(fullKey, {
				value,
				expiresAt: options?.ttl ? Date.now() + options.ttl * 1000 : null,
			});
			return true;
		}
		await this.redis!.hset(this.getKey(key, options?.namespace), field, value);
		if (options?.ttl) {
			await this.redis!.expire(this.getKey(key, options?.namespace), options.ttl);
		}
		return true;
	}

	async hgetall(
		key: string,
		options?: CacheOptions,
	): Promise<Record<string, string>> {
		if (this.useMemory) {
			const prefix = `${this.getKey(key, options?.namespace)}:`;
			const result: Record<string, string> = {};
			for (const [k, v] of this.memory.entries()) {
				if (k.startsWith(prefix) && !this.isExpired(v)) {
					result[k.replace(prefix, "")] = String(v.value);
				}
			}
			return result;
		}
		return await this.redis!.hgetall(this.getKey(key, options?.namespace));
	}

	async close(): Promise<void> {
		if (this.redis) {
			await this.redis.quit();
		}
		this.memory.clear();
	}

	async flushNamespace(namespace?: string): Promise<void> {
		const ns = namespace || this.namespace;
		await this.invalidatePattern(`${ns}*`);
	}
}
export default CacheManager;






