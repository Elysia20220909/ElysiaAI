import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
	throw new Error("REDIS_URL is required for this live Redis integration test.");
}

const url = new URL(redisUrl);

console.log("📋 接続情報:");
console.log("  ホスト:", url.hostname);
console.log("  ポート:", url.port);
console.log("  ユーザー:", url.username);
console.log("  パスワード:", url.password ? "***" : "なし");

const redis = new Redis({
	host: url.hostname,
	port: Number.parseInt(url.port || "10200", 10),
	username: url.username || "default",
	password: url.password,
	tls: {},
	maxRetriesPerRequest: null,
	enableReadyCheck: false,
	connectTimeout: 10000,
	retryStrategy: (times) => {
		const delay = Math.min(times * 100, 3000);
		console.log(`🔄 リトライ ${times}回目... (${delay}ms後)`);
		return delay;
	},
});

redis.on("connect", () => {
	console.log("✅ Redis: connected イベント");
});

redis.on("ready", async () => {
	console.log("✅ Redis: ready イベント");
	try {
		const pong = await redis.ping();
		console.log("✅ PING:", pong);

		const info = await redis.info("server");
		console.log("✅ Server Info:", info.split("\r\n").slice(0, 5).join("\n"));

		await redis.quit();
		console.log("✅ 接続を切断");
		process.exit(0);
	} catch (err) {
		console.error("❌ コマンド実行失敗:", (err as Error).message);
		process.exit(1);
	}
});

redis.on("error", (err) => {
	console.error("❌ Redis エラー:", err.message);
});

setTimeout(() => {
	console.error("❌ タイムアウト: 5秒以内に接続できませんでした");
	process.exit(1);
}, 5000);
