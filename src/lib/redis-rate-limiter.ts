/**
 * Redis ベースのレート制限サービス
 * IP単位とユーザー単位でのレート制限を実装
 */

import { logger } from './logger';

type RedisClientType = any;

export interface RateLimitConfig {
  windowMs: number;  // タイムウィンドウ（ミリ秒）
  maxRequests: number;  // 最大リクエスト数
  blockDurationMs?: number;  // ブロック期間（オプション）
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;  // 秒数
}

export class RedisRateLimiter {
  private client: RedisClientType | null = null;
  private enabled: boolean = false;

  async initialize(): Promise<void> {
    try {
      // @ts-ignore - redis is optional dependency
      const redis = (await import('redis').catch(() => null)) as any;
      if (!redis) {
        logger.warn('Redis パッケージが未インストール。レート制限は無効です。');
        return;
      }

      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.client.on('error', (err: Error) => {
        logger.error(`Redis rate limiter error: ${err.message}`);
      });

      await this.client.connect();
      this.enabled = true;
      logger.info('Redis rate limiter initialized');
    } catch (error) {
      logger.error(
        `Failed to initialize Redis rate limiter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.enabled = false;
      logger.info('Redis rate limiter disconnected');
    }
  }

  /**
   * レート制限をチェック
   * @param key 識別キー（IP、ユーザーIDなど）
   * @param config レート制限設定
   */
  async checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // Redis が無効な場合は常に許可
    if (!this.enabled || !this.client) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + config.windowMs),
      };
    }

    const now = Date.now();
    const windowKey = `ratelimit:${key}`;
    const blockKey = `ratelimit:block:${key}`;

    try {
      // ブロック期間中かチェック
      if (config.blockDurationMs) {
        const blockExpiry = await this.client.get(blockKey);
        if (blockExpiry) {
          const blockedUntil = parseInt(blockExpiry, 10);
          if (now < blockedUntil) {
            return {
              allowed: false,
              remaining: 0,
              resetAt: new Date(blockedUntil),
              retryAfter: Math.ceil((blockedUntil - now) / 1000),
            };
          }
        }
      }

      // 現在のウィンドウ内のリクエスト数を取得
      const requests = await this.client.get(windowKey);
      const currentCount = requests ? parseInt(requests, 10) : 0;

      // 制限を超えているかチェック
      if (currentCount >= config.maxRequests) {
        // ブロック期間を設定（オプション）
        if (config.blockDurationMs) {
          const blockUntil = now + config.blockDurationMs;
          await this.client.set(
            blockKey,
            blockUntil.toString(),
            { EX: Math.ceil(config.blockDurationMs / 1000) }
          );
        }

        const ttl = await this.client.ttl(windowKey);
        const resetAt = new Date(now + (ttl > 0 ? ttl * 1000 : config.windowMs));

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter: ttl > 0 ? ttl : Math.ceil(config.windowMs / 1000),
        };
      }

      // カウントをインクリメント
      const newCount = await this.client.incr(windowKey);

      // 初回アクセスの場合、有効期限を設定
      if (newCount === 1) {
        await this.client.expire(windowKey, Math.ceil(config.windowMs / 1000));
      }

      const ttl = await this.client.ttl(windowKey);
      const resetAt = new Date(now + (ttl > 0 ? ttl * 1000 : config.windowMs));

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - newCount),
        resetAt,
      };
    } catch (error) {
      logger.error(`Rate limit check failed: ${error}`);
      // エラー時は許可（fail-open）
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowMs),
      };
    }
  }

  /**
   * ログイン試行のレート制限
   */
  async checkLoginAttempt(identifier: string): Promise<RateLimitResult> {
    return this.checkLimit(`login:${identifier}`, {
      windowMs: 15 * 60 * 1000,  // 15分
      maxRequests: 5,  // 5回まで
      blockDurationMs: 30 * 60 * 1000,  // 30分ブロック
    });
  }

  /**
   * API リクエストのレート制限
   */
  async checkApiRequest(identifier: string, tier: 'free' | 'premium' = 'free'): Promise<RateLimitResult> {
    const configs = {
      free: {
        windowMs: 60 * 1000,  // 1分
        maxRequests: 20,  // 20リクエスト/分
      },
      premium: {
        windowMs: 60 * 1000,  // 1分
        maxRequests: 100,  // 100リクエスト/分
      },
    };

    return this.checkLimit(`api:${identifier}`, configs[tier]);
  }

  /**
   * チャットリクエストのレート制限
   */
  async checkChatRequest(identifier: string): Promise<RateLimitResult> {
    return this.checkLimit(`chat:${identifier}`, {
      windowMs: 60 * 1000,  // 1分
      maxRequests: 10,  // 10メッセージ/分
    });
  }

  /**
   * 手動でカウンターをリセット（管理用）
   */
  async resetLimit(key: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.del(`ratelimit:${key}`);
      await this.client.del(`ratelimit:block:${key}`);
      logger.info(`Rate limit reset for key: ${key}`);
    } catch (error) {
      logger.error(`Failed to reset rate limit: ${error}`);
    }
  }

  /**
   * 統計情報取得
   */
  async getStats(key: string): Promise<{ count: number; ttl: number } | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const windowKey = `ratelimit:${key}`;
      const count = await this.client.get(windowKey);
      const ttl = await this.client.ttl(windowKey);

      return {
        count: count ? parseInt(count, 10) : 0,
        ttl: ttl > 0 ? ttl : 0,
      };
    } catch (error) {
      logger.error(`Failed to get rate limit stats: ${error}`);
      return null;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// シングルトンインスタンス
export const redisRateLimiter = new RedisRateLimiter();
