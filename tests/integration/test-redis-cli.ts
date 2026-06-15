// 公式Node Redis クライアントでテスト
// redis-cli互換の接続方法
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
	console.error("❌ REDIS_URL is required for this manual integration test.");
	process.exit(1);
}

console.log("🔍 redis-cli互換テストを実行...");
console.log("URL:", new URL(redisUrl).host);

(async () => {
	try {
		// PINGテスト
		console.log("🔄 PING実行...");
		const { stdout: ping } = await execFileAsync(
			"npx",
			["redis-cli", "-u", redisUrl, "PING"],
			{
				timeout: 10000,
			},
		);
		console.log("✅ PING:", ping.trim());

		// INFO取得
		console.log("🔄 INFO SERVER取得...");
		const { stdout: info } = await execFileAsync(
			"npx",
			["redis-cli", "-u", redisUrl, "INFO", "server"],
			{
				timeout: 10000,
			},
		);
		const lines = info
			.split("\n")
			.filter((l: string) => !l.startsWith("#"))
			.slice(0, 5);
		console.log("✅ Info:", lines.join("\n"));

		console.log("✅ テスト完了");
		process.exit(0);
	} catch (error) {
		console.error("❌ エラー:", (error as Error).message);
		process.exit(1);
	}
})();
