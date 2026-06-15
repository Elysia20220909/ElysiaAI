import Redis from "ioredis";

// クラウドRedis接続情報
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
	console.error("❌ REDIS_URL is required for this manual integration test.");
	process.exit(1);
}

console.log("🔄 Redis接続テスト (ioredis)...");

const redis = new Redis(redisUrl, {
	lazyConnect: false,
	maxRetriesPerRequest: 3,
	enableReadyCheck: false,
	enableOfflineQueue: true,
	tls: {
		rejectUnauthorized: false,
	},
});

redis.on("connect", () => {
	console.log("✅ ioredis: 接続成功");
});

redis.on("ready", () => {
	console.log("✅ ioredis: ready状態");
});

redis.on("error", (err) => {
	console.error("❌ ioredis エラー:", err.message);
});

(async () => {
	try {
		await new Promise((resolve) => setTimeout(resolve, 1000));

		console.log("🔄 PING実行...");
		const pong = await redis.ping();
		console.log("✅ PING:", pong);

		console.log("🔄 INFO取得...");
		const info = await redis.info();
		const lines = info.split("\r\n").slice(0, 8);
		console.log("✅ Redis情報:\n", lines.join("\n"));

		await redis.quit();
		console.log("✅ 接続を切断");
	} catch (error: unknown) {
		const err = error as Error;
		console.error("❌ エラー:", err.message);
		process.exit(1);
	}
})();
