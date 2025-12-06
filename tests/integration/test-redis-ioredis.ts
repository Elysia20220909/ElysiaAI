import Redis from "ioredis";

// クラウドRedis接続情報
const redisUrl =
	"redis://default:Hr7pQ66mbyxnu9M2QTPyy31fYC1l97wV@redis-10200.c54.ap-northeast-1-2.ec2.cloud.redislabs.com:10200";

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
