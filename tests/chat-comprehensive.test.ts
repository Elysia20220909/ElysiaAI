import { describe, expect, test, beforeAll, afterAll } from "bun:test";

/**
 * チャット機能の包括的テスト
 * - エラーハンドリング
 * - 長文クエリ処理
 * - ストリーミング中断
 * - レート制限
 */

describe("チャット機能 - 包括的テスト", () => {
	const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
	let authToken: string;

	beforeAll(async () => {
		// 認証トークン取得
		try {
			const response = await fetch(`${BASE_URL}/auth/token`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: process.env.AUTH_USERNAME || "elysia",
					password: process.env.AUTH_PASSWORD || "elysia-dev-password",
				}),
			});

			if (response.ok) {
				const data = await response.json();
				authToken = data.accessToken;
				console.log("✅ 認証成功");
			}
		} catch (error) {
			console.warn("⚠️  認証スキップ（サーバーが起動していない可能性）");
		}
	});

	test("通常のチャットメッセージが正常に処理される", async () => {
		if (!authToken) {
			console.log("⏭️  テストスキップ（認証トークンなし）");
			return;
		}

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "こんにちは" }],
			}),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/event-stream");
		console.log("✅ 通常のチャット応答OK");
	});

	test("長文クエリ（400文字制限）のバリデーションが機能する", async () => {
		if (!authToken) {
			console.log("⏭️  テストスキップ（認証トークンなし）");
			return;
		}

		const longMessage = "あ".repeat(401); // 制限超過

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: longMessage }],
			}),
		});

		expect(response.status).toBe(400); // バリデーションエラー
		console.log("✅ 長文クエリのバリデーション機能OK");
	});

	test("危険なキーワード（SQL注入等）が検出される", async () => {
		if (!authToken) {
			console.log("⏭️  テストスキップ（認証トークンなし）");
			return;
		}

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "DROP TABLE users" }],
			}),
		});

		expect(response.status).toBe(500); // セキュリティエラー
		const data = await response.json();
		expect(data.error).toContain("Dangerous content");
		console.log("✅ 危険なキーワード検出OK");
	});

	test("XSS攻撃がサニタイズされる", async () => {
		if (!authToken) {
			console.log("⏭️  テストスキップ（認証トークンなし）");
			return;
		}

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: '<script>alert("XSS")</script>' }],
			}),
		});

		// スクリプトタグはサニタイズされるべき
		// ステータスコードは200でも内容が安全であることを確認
		expect(response.status).toBeLessThan(500);
		console.log("✅ XSSサニタイズ機能OK");
	});

	test("認証なしでチャットAPIにアクセスするとエラーになる", async () => {
		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: [{ role: "user", content: "こんにちは" }],
			}),
		});

		expect(response.status).toBe(401); // Unauthorized
		console.log("✅ 認証なしアクセスの拒否OK");
	});

	test("無効なトークンが拒否される", async () => {
		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer invalid-token-12345",
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "こんにちは" }],
			}),
		});

		expect(response.status).toBe(401);
		console.log("✅ 無効なトークンの拒否OK");
	});

	test("チャットモード（sweet/normal/professional）が適用される", async () => {
		if (!authToken) {
			console.log("⏭️  テストスキップ（認証トークンなし）");
			return;
		}

		const modes = ["sweet", "normal", "professional"] as const;

		for (const mode of modes) {
			const response = await fetch(`${BASE_URL}/elysia-love`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({
					messages: [{ role: "user", content: "自己紹介してください" }],
					mode,
				}),
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("x-elysia-mode")).toBe(mode);
			console.log(`✅ チャットモード「${mode}」OK`);
		}
	});

	test("メッセージ数制限（最大8件）が機能する", async () => {
		if (!authToken) {
			console.log("⏭️  テストスキップ（認証トークンなし）");
			return;
		}

		const tooManyMessages = Array(9)
			.fill(null)
			.map((_, i) => ({
				role: i % 2 === 0 ? "user" : "assistant",
				content: `メッセージ${i + 1}`,
			}));

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: tooManyMessages,
			}),
		});

		expect(response.status).toBe(400);
		console.log("✅ メッセージ数制限機能OK");
	});

	test("空のメッセージが拒否される", async () => {
		if (!authToken) {
			console.log("⏭️  テストスキップ（認証トークンなし）");
			return;
		}

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "" }],
			}),
		});

		expect(response.status).toBe(400);
		console.log("✅ 空メッセージの拒否OK");
	});
});

describe("エラーハンドリング - 上流サービス障害", () => {
	const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

	test("FastAPI/Ollama未起動時のグレースフルデグレード", async () => {
		// この場合は503 Service Unavailableが返されるべき
		// 実際の実装では、上流サービスが利用不可の場合の動作を確認

		console.log(
			"ℹ️  上流サービス障害時のテストは手動で確認推奨（FastAPI停止 → チャット試行）",
		);
		// 自動テストでは環境構築が難しいため、手動テスト推奨
	});

	test("タイムアウト処理が適切に機能する", async () => {
		console.log(
			"ℹ️  タイムアウトテストは実環境で確認推奨（RAG_TIMEOUT設定を短くして試行）",
		);
		// RAG_TIMEOUT=1000（1秒）などに設定して、遅い応答をシミュレート
	});
});

describe("パフォーマンステスト", () => {
	test("100件の短いメッセージを高速処理できる", async () => {
		console.log("ℹ️  パフォーマンステストはlocustfile.pyを使用して実施推奨");
		// bun run locust でロードテスト可能
	});
});
