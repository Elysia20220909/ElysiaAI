/**
 * Prisma データベース統合テスト
 * データベース操作の確認テスト
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
	createUser,
	authenticateUser,
	createChatSession,
	saveMessage,
	saveFeedback,
	getFeedbackStats,
	clearTestData,
	disconnect,
	prisma,
} from "../lib/database-utils";

// ========== テストスイート ==========

describe("Prisma Database Integration Tests", () => {
	beforeAll(async () => {
		// テストデータをクリア
		await clearTestData();
		console.log("✅ テストデータクリア完了");
	});

	afterAll(async () => {
		// Prisma切断
		await disconnect();
		console.log("✅ テストクリーンアップ完了");
	});

	// ========== ユーザー認証テスト ==========

	it("ユーザー作成: 新規ユーザーを作成できる", async () => {
		const user = await createUser("testuser", "password123");
		expect(user.username).toBe("testuser");
		expect(user.role).toBe("user");
	});

	it("ユーザー認証: 正しいパスワードで認証成功", async () => {
		await createUser("authtest", "correctpass");
		const user = await authenticateUser("authtest", "correctpass");
		expect(user).toBeTruthy();
		expect(user?.username).toBe("authtest");
	});

	it("ユーザー認証: 間違ったパスワードで認証失敗", async () => {
		await createUser("secureuser", "securepass");
		const user = await authenticateUser("secureuser", "wrongpass");
		expect(user).toBeNull();
	});

	// ========== チャット機能テスト ==========

	it("チャット: セッション作成", async () => {
		const session = await createChatSession(undefined, "sweet");
		expect(session.id).toBeTruthy();
		expect(session.mode).toBe("sweet");
	});

	it("チャット: メッセージ保存", async () => {
		const session = await createChatSession(undefined, "normal");
		await saveMessage(session.id, "user", "こんにちは");
		expect(session.id).toBeTruthy();
	});

	it("チャット: 複数メッセージ保存", async () => {
		const session = await createChatSession();
		await saveMessage(session.id, "user", "こんにちは");
		await saveMessage(session.id, "assistant", "こんにちは！");
		await saveMessage(session.id, "user", "お名前は？");
		await saveMessage(session.id, "assistant", "エリシアです♪");
		expect(session.id).toBeTruthy();
	});

	// ========== フィードバック機能テスト ==========

	it("フィードバック: ポジティブ評価を保存", async () => {
		const feedback = await saveFeedback(
			"エリシアって？",
			"AIキャラクターです",
			"up",
		);
		expect(feedback.rating).toBe("up");
	});

	it("フィードバック: ネガティブ評価を保存", async () => {
		const feedback = await saveFeedback(
			"質問",
			"回答",
			"down",
			undefined,
			"不正確",
		);
		expect(feedback.rating).toBe("down");
		expect(feedback.reason).toBe("不正確");
	});

	it("フィードバック: 統計情報を取得", async () => {
		// 複数のフィードバック保存
		await saveFeedback("q1", "a1", "up");
		await saveFeedback("q2", "a2", "up");
		await saveFeedback("q3", "a3", "down");

		// 統計取得
		const stats = await getFeedbackStats();
		expect(stats.total).toBeGreaterThanOrEqual(3);
		expect(stats.upRate).toBeGreaterThan(0);
	});
});

describe("Database Health Checks", () => {
	it("データベース接続確認", async () => {
		const result = await prisma.$queryRaw`SELECT 1`;
		expect(result).toBeDefined();
	});

	it("テーブル存在確認", async () => {
		const tables = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `;

		const tableNames = tables.map((t: { name: string }) => t.name);
		expect(tableNames).toContain("users");
		expect(tableNames).toContain("messages");
		expect(tableNames).toContain("feedbacks");
	});

	afterAll(async () => {
		await disconnect();
	});
});
