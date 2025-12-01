import Redis from 'ioredis';

const CONFIG = {
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_ENABLED: process.env.REDIS_ENABLED !== 'false', // デフォルトで有効
};

// Redis クライアント初期化（エラーハンドリング付き）
let redis: Redis | null = null;
let redisAvailable = false;

if (CONFIG.REDIS_ENABLED) {
  try {
    redis = new Redis(CONFIG.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[Redis] 接続失敗: フォールバック to in-memory rate limiting');
          redisAvailable = false;
          return null; // 再試行停止
        }
        return Math.min(times * 100, 2000); // 100ms, 200ms, 300ms...
      },
      lazyConnect: true, // 遅延接続
    });

    redis.on('connect', () => {
      console.log('[Redis] 接続成功 ✅');
      redisAvailable = true;
    });

    redis.on('error', (err) => {
      console.error('[Redis] エラー:', err.message);
      redisAvailable = false;
    });

    // 初回接続試行
    redis.connect().catch((err) => {
      console.warn('[Redis] 起動時接続失敗:', err.message);
      redisAvailable = false;
    });
  } catch (err) {
    console.error('[Redis] 初期化エラー:', err);
    redis = null;
    redisAvailable = false;
  }
}

/**
 * Redis統合レート制限チェック（永続化対応）
 * @param id - クライアント識別子（IP、ユーザーIDなど）
 * @param maxRequests - 許可する最大リクエスト数
 * @param windowSeconds - 時間窓（秒）
 * @returns {Promise<boolean>} true: 許可、false: 制限超過
 */
export async function checkRateLimitRedis(
  id: string,
  maxRequests: number,
  windowSeconds: number = 60
): Promise<boolean> {
  if (!redis || !redisAvailable) {
    // Redis未接続時はフォールバック（常に許可）
    return true;
  }

  try {
    const key = `ratelimit:${id}`;
    const current = await redis.incr(key);
    
    // 初回カウント時に有効期限を設定
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    
    return current <= maxRequests;
  } catch (err) {
    console.error('[Redis] レート制限チェックエラー:', err);
    return true; // エラー時は許可（サービス継続優先）
  }
}

/**
 * リフレッシュトークンをRedisに保存（7日間有効）
 * @param userId - ユーザー識別子
 * @param refreshToken - リフレッシュトークン
 * @param expiresIn - 有効期限（秒）デフォルト7日
 */
export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  expiresIn: number = 7 * 24 * 60 * 60 // 7日
): Promise<void> {
  if (!redis || !redisAvailable) {
    console.warn('[Redis] リフレッシュトークン保存スキップ（Redis未接続）');
    return;
  }

  try {
    const key = `refresh:${userId}`;
    await redis.setex(key, expiresIn, refreshToken);
  } catch (err) {
    console.error('[Redis] リフレッシュトークン保存エラー:', err);
  }
}

/**
 * リフレッシュトークンを検証
 * @param userId - ユーザー識別子
 * @param refreshToken - 検証するリフレッシュトークン
 * @returns {Promise<boolean>} true: 有効、false: 無効
 */
export async function verifyRefreshToken(
  userId: string,
  refreshToken: string
): Promise<boolean> {
  if (!redis || !redisAvailable) {
    console.warn('[Redis] リフレッシュトークン検証スキップ（Redis未接続）');
    return false;
  }

  try {
    const key = `refresh:${userId}`;
    const storedToken = await redis.get(key);
    return storedToken === refreshToken;
  } catch (err) {
    console.error('[Redis] リフレッシュトークン検証エラー:', err);
    return false;
  }
}

/**
 * リフレッシュトークンを無効化（ログアウト時）
 * @param userId - ユーザー識別子
 */
export async function revokeRefreshToken(userId: string): Promise<void> {
  if (!redis || !redisAvailable) {
    return;
  }

  try {
    const key = `refresh:${userId}`;
    await redis.del(key);
  } catch (err) {
    console.error('[Redis] リフレッシュトークン無効化エラー:', err);
  }
}

/**
 * Redis接続状態を取得
 */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export default redis;
