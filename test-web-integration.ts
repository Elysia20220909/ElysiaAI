/**
 * Web Search Integration Test
 * カジュアルモードでのWeb検索統合をテスト
 */

import { generateCasualResponse } from "./src/lib/casual-chat";

async function testWebSearchIntegration() {
	console.log("🧪 Web Search Integration Test\n");
	console.log("=".repeat(60));

	const testQueries = [
		"今日の東京の天気は？",
		"人工知能について教えて",
		"最新のニュースは？",
		"おはよう！",
		"ありがとう",
	];

	for (const query of testQueries) {
		console.log(`\n📝 Query: ${query}`);
		console.log("-".repeat(60));

		try {
			const response = await generateCasualResponse(query);

			if (response) {
				console.log("✅ Response:");
				console.log(response.substring(0, 300) + "...");
			} else {
				console.log("⚠️  No special response (using default casual mode)");
			}
		} catch (error) {
			console.error("❌ Error:", error);
		}
	}

	console.log("\n" + "=".repeat(60));
	console.log("✅ Test completed");
}

testWebSearchIntegration();
