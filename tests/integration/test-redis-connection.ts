import { createClient } from "redis";

const redisUrl =
	"redis://default:Hr7pQ66mbyxnu9M2QTPyy31fYC1l97wV@redis-10200.c54.ap-northeast-1-2.ec2.cloud.redislabs.com:10200";

const client = createClient({
	url: redisUrl,
	socket: {
		reconnectStrategy: (retries) => {
			if (retries > 3) {
				console.error("❌ Redis接続失敗: リトライ回数上限");
				return new Error("Max retries exceeded");
			}
			return Math.min(retries * 50, 500);
		},
	},
});

client.on("error", (err) => {
	console.error("❌ Redis エラー:", err.message);
	process.exit(1);
});

client.on("connect", () => {
	console.log("✅ Redis接続成功");
});

(async () => {
	try {
		console.log("🔄 Redis接続中...");
		await client.connect();

		console.log("🔄 PINGテスト...");
		const pong = await client.ping();
		console.log("✅ PING応答:", pong);

		console.log("🔄 INFO取得...");
		const info = await client.info();
		const lines = info.split("\r\n").slice(0, 10);
		console.log("✅ Redis情報:", lines.join("\n"));

		console.log("🔄 キー数確認...");
		const dbsize = await client.dbSize();
		console.log("✅ DB内キー数:", dbsize);

		await client.disconnect();
		console.log("✅ 接続を切断しました");
	} catch (error) {
		console.error(
			"❌ エラー:",
			error instanceof Error ? error.message : String(error),
		);
		process.exit(1);
	}
})();
