import Redis from "ioredis";

const redisHost =
	process.env.REDIS_HOST;
const redisPort = Number(process.env.REDIS_PORT || "6379");
const redisPassword = process.env.REDIS_PASSWORD;
const redisUsername = process.env.REDIS_USERNAME || "default";
const useTLS = process.env.REDIS_TLS === "true";

if (!redisHost || !redisPassword) {
	throw new Error(
		"REDIS_HOST and REDIS_PASSWORD are required for this live Redis integration test.",
	);
}

console.log("📋 Redis接続設定:");
console.log("  ホスト:", redisHost);
console.log("  ポート:", redisPort);
console.log("  ユーザー:", redisUsername);
console.log("  TLS:", useTLS ? "有効" : "無効");

const config: Record<string, unknown> = {
	host: redisHost,
	port: redisPort,
	username: redisUsername,
	password: redisPassword,
	maxRetriesPerRequest: 5,
	connectTimeout: 10000,
	enableReadyCheck: false,
	enableOfflineQueue: true,
	retryStrategy: (times: number) => {
		const delay = Math.min(times * 2000, 10000);
		console.log(`🔄 リトライ ${times}回目 (${delay}ms後)`);
		return delay;
	},
};

if (useTLS) {
	config.tls = {
		rejectUnauthorized: false,
	};
}

const redis = new Redis(config as never);

redis.on("connect", () => console.log("✅ Redis: connected"));
redis.on("ready", () => console.log("✅ Redis: ready"));
redis.on("error", (err) => console.error("❌ Redis Error:", err.message));

(async () => {
	try {
		console.log("🔄 接続中... (最大10秒)");
		await new Promise((resolve) => setTimeout(resolve, 2000));

		const pong = await redis.ping();
		console.log("✅ PING:", pong);

		const info = await redis.info("server");
		const lines = info
			.split("\r\n")
			.filter((l: string) => !l.startsWith("#"))
			.slice(0, 5);
		console.log("✅ Server Info:", lines.join("\n"));

		await redis.quit();
		console.log("✅ 接続を切断");
		process.exit(0);
	} catch (err) {
		console.error("❌ エラー:", (err as Error).message);
		process.exit(1);
	}
})();

setTimeout(() => {
	console.error("❌ タイムアウト");
	process.exit(1);
}, 12000);
