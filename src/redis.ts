import Redis from "ioredis";

const CONFIG = {
	REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
	REDIS_ENABLED: process.env.REDIS_ENABLED !== "false", // デフォルトで有効
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
					console.warn(
						"[Redis] Connection failed: Fallback to in-memory rate limiting",
					);
					redisAvailable = false;
					return null;
				}
				return Math.min(times * 100, 2000);
			},
			lazyConnect: true, // 遅延接続
		});

		redis.on("connect", () => {
			console.log("[Redis] Connected successfully");
			redisAvailable = true;
		});

		redis.on("error", (err) => {
			console.error("[Redis] Error:", err.message);
			redisAvailable = false;
		});

		// Initial connection attempt
		redis.connect().catch((err) => {
			console.warn("[Redis] Initial connection failed:", err.message);
			redisAvailable = false;
		});
	} catch (err) {
		console.error("[Redis] Initialization error:", err);
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
	windowSeconds: number = 60,
): Promise<boolean> {
	if (!redis || !redisAvailable) {
		// Redis未接続時はフォールバック（常に許可）
		return true;
	}

	try {
		const key = `ratelimit:${id}`;
		const nowMs = Date.now();
		const windowStart = nowMs - windowSeconds * 1000;

		// スライディングウィンドウ: ZSETでタイムスタンプ管理
		// 1) 古いエントリを削除
		await redis.zremrangebyscore(key, 0, windowStart);
		// 2) 現在のリクエストを追加（score=タイムスタンプ）
		await redis.zadd(key, nowMs, `${nowMs}:${Math.random()}`);
		// 3) カウント
		const count = await redis.zcard(key);
		// 4) キーの期限（保険）
		await redis.expire(key, windowSeconds);

		return count <= maxRequests;
	} catch (err) {
		console.error("[Redis] Rate limit check error:", err);
		return true; // Allow on error to maintain service
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
	expiresIn: number = 7 * 24 * 60 * 60, // 7日
): Promise<void> {
	if (!redis || !redisAvailable) {
		console.warn(
			"[Redis] Skipping refresh token storage (Redis not connected)",
		);
		return;
	}

	try {
		const key = `refresh:${userId}`;
		await redis.setex(key, expiresIn, refreshToken);
	} catch (err) {
		console.error("[Redis] Refresh token storage error:", err);
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
	refreshToken: string,
): Promise<boolean> {
	if (!redis || !redisAvailable) {
		console.warn(
			"[Redis] Skipping refresh token verification (Redis not connected)",
		);
		return false;
	}

	try {
		const key = `refresh:${userId}`;
		const storedToken = await redis.get(key);
		return storedToken === refreshToken;
	} catch (err) {
		console.error("[Redis] Refresh token verification error:", err);
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
		console.error("[Redis] Refresh token revocation error:", err);
	}
}

/**
 * Redis接続状態を取得
 */
export function isRedisAvailable(): boolean {
	return redisAvailable;
}

export default redis;
