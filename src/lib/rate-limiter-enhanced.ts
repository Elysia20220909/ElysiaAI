/**
 * Enhanced Rate Limiter with Token Bucket and Sliding Window
 * トークンバケット方式とスライディングウィンドウ方式のレート制限
 */

import { logger } from './logger';

interface RateLimitConfig {
	maxRequests: number;
	windowMs: number;
	algorithm: 'fixed' | 'sliding' | 'token-bucket';
}

interface TokenBucketState {
	tokens: number;
	lastRefill: number;
	capacity: number;
	refillRate: number; // tokens per second
}

interface SlidingWindowState {
	requests: number[];
	windowStart: number;
}

class EnhancedRateLimiter {
  private fixedWindows: Map<string, { count: number; resetTime: number }> =
    new Map();
  private slidingWindows: Map<string, SlidingWindowState> = new Map();
  private tokenBuckets: Map<string, TokenBucketState> = new Map();

  /**
	 * Fixed window rate limiting (現在のシンプルな実装)
	 */
  async checkFixedWindow(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const state = this.fixedWindows.get(key);

    if (!state || now >= state.resetTime) {
      // New window
      this.fixedWindows.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
      };
    }

    if (state.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: state.resetTime,
      };
    }

    state.count++;
    return {
      allowed: true,
      remaining: maxRequests - state.count,
      resetTime: state.resetTime,
    };
  }

  /**
	 * Sliding window rate limiting (より正確)
	 */
  async checkSlidingWindow(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    let state = this.slidingWindows.get(key);

    if (!state) {
      state = { requests: [], windowStart: now };
      this.slidingWindows.set(key, state);
    }

    // Remove requests outside the window
    state.requests = state.requests.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    if (state.requests.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
      };
    }

    state.requests.push(now);
    return {
      allowed: true,
      remaining: maxRequests - state.requests.length,
    };
  }

  /**
	 * Token bucket rate limiting (バースト対応)
	 */
  async checkTokenBucket(
    key: string,
    capacity: number,
    refillRate: number,
  ): Promise<{ allowed: boolean; tokens: number }> {
    const now = Date.now();
    let bucket = this.tokenBuckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefill: now,
        capacity,
        refillRate,
      };
      this.tokenBuckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        tokens: Math.floor(bucket.tokens),
      };
    }

    return {
      allowed: false,
      tokens: 0,
    };
  }

  /**
	 * Check rate limit with specified algorithm
	 */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<{
		allowed: boolean;
		remaining: number;
		resetTime?: number;
	}> {
    switch (config.algorithm) {
    case 'fixed':
      return await this.checkFixedWindow(
        key,
        config.maxRequests,
        config.windowMs,
      );
    case 'sliding':
      return await this.checkSlidingWindow(
        key,
        config.maxRequests,
        config.windowMs,
      );
    case 'token-bucket': {
      const refillRate = config.maxRequests / (config.windowMs / 1000);
      const result = await this.checkTokenBucket(
        key,
        config.maxRequests,
        refillRate,
      );
      return {
        allowed: result.allowed,
        remaining: result.tokens,
      };
    }
    default:
      throw new Error(`Unknown algorithm: ${config.algorithm}`);
    }
  }

  /**
	 * 統計情報取得
	 */
  getStats(): {
		fixedWindows: number;
		slidingWindows: number;
		tokenBuckets: number;
		totalKeys: number;
		} {
    return {
      fixedWindows: this.fixedWindows.size,
      slidingWindows: this.slidingWindows.size,
      tokenBuckets: this.tokenBuckets.size,
      totalKeys:
				this.fixedWindows.size +
				this.slidingWindows.size +
				this.tokenBuckets.size,
    };
  }

  /**
	 * クリーンアップ（期限切れエントリ削除）
	 */
  cleanup(): void {
    const now = Date.now();

    // Fixed windows
    for (const [key, state] of this.fixedWindows.entries()) {
      if (now >= state.resetTime) {
        this.fixedWindows.delete(key);
      }
    }

    // Sliding windows (古いリクエストのみ削除)
    for (const [key, state] of this.slidingWindows.entries()) {
      if (state.requests.length === 0) {
        this.slidingWindows.delete(key);
      }
    }

    logger.info('Rate limiter cleanup completed', {
      remainingKeys: this.getStats().totalKeys,
    });
  }

  /**
	 * IPベースのレート制限
	 */
  async checkIPRateLimit(
    ipAddress: string,
    maxRequests = 100,
    windowMs = 60000,
  ): Promise<boolean> {
    const result = await this.checkRateLimit(`ip:${ipAddress}`, {
      maxRequests,
      windowMs,
      algorithm: 'sliding',
    });
    return result.allowed;
  }

  /**
	 * ユーザーベースのレート制限
	 */
  async checkUserRateLimit(
    userId: string,
    maxRequests = 1000,
    windowMs = 3600000,
  ): Promise<boolean> {
    const result = await this.checkRateLimit(`user:${userId}`, {
      maxRequests,
      windowMs,
      algorithm: 'token-bucket',
    });
    return result.allowed;
  }

  /**
	 * エンドポイント別レート制限
	 */
  async checkEndpointRateLimit(
    endpoint: string,
    identifier: string,
    maxRequests = 10,
    windowMs = 60000,
  ): Promise<boolean> {
    const result = await this.checkRateLimit(
      `endpoint:${endpoint}:${identifier}`,
      {
        maxRequests,
        windowMs,
        algorithm: 'fixed',
      },
    );
    return result.allowed;
  }
}

export const enhancedRateLimiter = new EnhancedRateLimiter();

// 定期的なクリーンアップ（5分ごと）
setInterval(
  () => {
    enhancedRateLimiter.cleanup();
  },
  5 * 60 * 1000,
);
