/**
 * OpenAI API統合のテスト
 */

import {
	conversationChat,
	estimateTokens,
	initializeOpenAI,
	isOpenAIAvailable,
	listAvailableModels,
	type OpenAIChatMessage,
	simpleChat,
} from "./src/lib/openai-integration";

async function testOpenAI() {
	console.log("=== OpenAI API統合テスト ===\n");

	// 1. APIキーの確認
	console.log("1. APIキーの確認");
	console.log(`利用可能: ${isOpenAIAvailable()}\n`);

	if (!isOpenAIAvailable()) {
		console.log(
			"環境変数 OPENAI_API_KEY が設定されていません。テストを終了します。",
		);
		return;
	}

	// 2. クライアント初期化
	console.log("2. クライアント初期化");
	try {
		initializeOpenAI();
		console.log("✅ クライアント初期化成功\n");
	} catch (error) {
		console.error("❌ 初期化エラー:", error);
		return;
	}

	// 3. 簡単なチャット
	console.log("3. 簡単なチャット");
	try {
		const response = await simpleChat("こんにちは", undefined, {
			model: "gpt-4o-mini",
			temperature: 0.7,
		});
		console.log(`応答: ${response}\n`);
	} catch (error) {
		console.error("❌ チャットエラー:", error, "\n");
	}

	// 4. システムプロンプト付きチャット
	console.log("4. システムプロンプト付きチャット");
	try {
		const response = await simpleChat(
			"今日の天気は?",
			"あなたは親切で優しいAIアシスタントです。タメ口で話してください。",
			{
				model: "gpt-4o-mini",
				temperature: 0.8,
			},
		);
		console.log(`応答: ${response}\n`);
	} catch (error) {
		console.error("❌ チャットエラー:", error, "\n");
	}

	// 5. 会話履歴付きチャット
	console.log("5. 会話履歴付きチャット");
	try {
		let history: OpenAIChatMessage[] = [
			{ role: "system", content: "あなたは日本語で話すAIです。" },
		];

		// 1ターン目
		const turn1 = await conversationChat(history, "私の名前はタロウです。");
		console.log("[ユーザー] 私の名前はタロウです。");
		console.log(`[AI] ${turn1.response}`);
		history = turn1.updatedHistory;

		// 2ターン目
		const turn2 = await conversationChat(history, "私の名前は何でしたか?");
		console.log("[ユーザー] 私の名前は何でしたか?");
		console.log(`[AI] ${turn2.response}\n`);
	} catch (error) {
		console.error("❌ 会話エラー:", error, "\n");
	}

	// 6. トークン推定
	console.log("6. トークン推定");
	const testText = "こんにちは、今日はいい天気ですね。Hello, how are you?";
	const tokens = estimateTokens(testText);
	console.log(`テキスト: ${testText}`);
	console.log(`推定トークン数: ${tokens}\n`);

	// 7. 利用可能なモデル一覧
	console.log("7. 利用可能なモデル一覧");
	try {
		const models = await listAvailableModels();
		console.log(`GPTモデル数: ${models.length}`);
		if (models.length > 0) {
			console.log("例:", models.slice(0, 5).join(", "));
		}
	} catch (error) {
		console.error("❌ モデル一覧取得エラー:", error);
	}

	console.log("\n=== テスト完了 ===");
}

// 実行
testOpenAI().catch(console.error);
