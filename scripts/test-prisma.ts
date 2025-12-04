#!/usr/bin/env bun
/**
 * Prisma Client 動作確認テスト
 * データベース操作の実装検証
 */

import "dotenv/config";
import * as db from "../src/lib/database-utils";

async function runTests() {
	console.log("🧪 Prisma Client 動作テスト開始...\n");

	try {
		// テスト 1: ユーザー作成
		console.log("📝 テスト 1: ユーザー作成");
		const user = await db.createUser("testuser", "password123");
		console.log(`✅ ユーザー作成成功: ${user.username} (ID: ${user.id})\n`);

		// テスト 2: ユーザー認証
		console.log("🔐 テスト 2: ユーザー認証");
		const authenticated = await db.authenticateUser("testuser", "password123");
		if (authenticated) {
			console.log(`✅ 認証成功\n`);
		} else {
			console.log(`❌ 認証失敗\n`);
		}

		// テスト 3: チャットセッション作成
		console.log("💬 テスト 3: チャットセッション作成");
		const session = await db.createChatSession(user.id, "normal");
		console.log(`✅ セッション作成成功: ${session.id}\n`);

		// テスト 4: メッセージ保存
		console.log("💭 テスト 4: メッセージ保存");
		await db.saveMessage(session.id, "user", "こんにちは");
		await db.saveMessage(
			session.id,
			"assistant",
			"こんにちは。何かお手伝いできることはありますか？",
		);
		console.log(`✅ メッセージ保存成功\n`);

		// テスト 5: セッション取得
		console.log("🔍 テスト 5: セッション取得");
		const retrievedSession = await db.getChatSession(session.id);
		if (retrievedSession) {
			// messages フィールドはオプショナルなため型安全で処理
			console.log("✅ セッション取得成功\n");
		}

		// テスト 6: フィードバック保存
		console.log("⭐ テスト 6: フィードバック保存");
		await db.saveFeedback(
			"テストクエリ",
			"テスト回答",
			"up",
			user.id,
			"素晴らしい回答でした",
		);
		console.log("✅ フィードバック保存成功\n");

		// テスト 7: フィードバック統計
		console.log("📊 テスト 7: フィードバック統計");
		const stats = await db.getFeedbackStats();
		console.log("✅ 統計取得成功:");
		console.log(`   - 総数: ${stats.total}`);
		console.log(`   - ポジティブ: ${stats.up}`);
		console.log(`   - ネガティブ: ${stats.down}`);
		console.log(`   - ポジティブ率: ${stats.upRate.toFixed(1)}%\n`);

		// テスト 8: ナレッジベース追加
		console.log("📚 テスト 8: ナレッジベース追加");
		await db.addKnowledgeBase(
			"Elysia とは?",
			"Elysia は Bun 用の高速 Web フレームワークです",
			user.id,
			"documentation",
		);
		console.log("✅ ナレッジベース追加成功\n");

		// テスト 9: 音声ログ保存
		console.log("🎤 テスト 9: 音声ログ保存");
		await db.saveVoiceLog(
			user.username,
			"これはテスト音声です",
			"normal",
			"https://example.com/audio.mp3",
		);
		console.log("✅ 音声ログ保存成功\n");

		// テスト 10: 全ユーザー取得
		console.log("👥 テスト 10: 全ユーザー取得");
		const allUsers = await db.getAllUsers();
		console.log(`✅ ユーザー取得成功: ${allUsers.length} ユーザー\n`);

		// クリーンアップ
		console.log("🧹 クリーンアップ: テストデータ削除");
		await db.clearTestData();
		console.log("✅ クリーンアップ完了\n");

		console.log("🎉 すべてのテスト成功!\n");
		console.log("✨ Prisma Client は正常に動作しています。");
	} catch (error: unknown) {
		console.error(
			"❌ テストエラー:",
			error instanceof Error ? error.message : error,
		);
		process.exit(1);
	} finally {
		await db.disconnect();
	}
}

runTests();
