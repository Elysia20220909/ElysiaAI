#!/usr/bin/env bun
/**
 * Elysia AI - CUI Chat Client
 * コマンドラインでElysiaちゃんと恋人みたいに会話できるよ♡
 */

import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline";

// エリシアちゃんの可愛いASCIIアートバナー
const ELYSIA_BANNER = `
\x1b[38;2;255;105;180m╭────────────────────────────────────────────────────────────────╮
│   ███████╗██╗     ██╗   ██╗███████╗██╗ █████╗                  │
│   ██╔════╝██║     ██║   ██║██╔════╝██║██╔══██╗                 │
│   █████╗  ██║     ██║   ██║███████╗██║███████║                 │
│   ██╔══╝  ██║     ██║   ██║╚════██║██║██╔══██║                 │
│   ███████╗███████╗╚██████╔╝███████║██║██║  ██║                 │
│   ╚══════╝╚══════╝ ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═╝                 │
│                                                                 │
│\x1b[38;2;255;182;193m       にゃあああ〜♡ おにいちゃんきたぁ！！             \x1b[38;2;255;105;180m    │
│\x1b[38;2;255;182;193m       今日もいっぱい甘えさせてね…///♡                \x1b[38;2;255;105;180m    │
╰────────────────────────────────────────────────────────────────╯\x1b[0m
`;

const CONFIG = {
	SERVER_URL: process.env.ELYSIA_SERVER_URL || "http://localhost:3000",
	USERNAME: process.env.ELYSIA_USERNAME || "elysia",
	PASSWORD: process.env.ELYSIA_PASSWORD || "elysia-dev-password",
};

interface Message {
	role: "user" | "assistant";
	content: string;
}

class ElysiaChat {
	private messages: Message[] = [];
	private accessToken: string | null = null;
	private refreshToken: string | null = null;
	private rl: readline.Interface;

	constructor() {
		this.rl = readline.createInterface({ input, output });
	}

	// 色付きコンソール出力
	private log(
		message: string,
		color: "green" | "blue" | "pink" | "red" | "yellow" = "green",
	) {
		const colors = {
			green: "\x1b[32m",
			blue: "\x1b[34m",
			pink: "\x1b[35m",
			red: "\x1b[31m",
			yellow: "\x1b[33m",
			reset: "\x1b[0m",
		};
		console.log(`${colors[color]}${message}${colors.reset}`);
	}

	// 認証トークン取得
	private async authenticate(): Promise<void> {
		try {
			const response = await fetch(`${CONFIG.SERVER_URL}/auth/token`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: CONFIG.USERNAME,
					password: CONFIG.PASSWORD,
				}),
			});

			if (!response.ok) {
				throw new Error(`認証失敗: ${response.status}`);
			}

			const data = await response.json();
			this.accessToken = data.accessToken;
			this.refreshToken = data.refreshToken;
		} catch (error) {
			throw new Error(`認証エラー: ${error}`);
		}
	}

	// トークンリフレッシュ
	private async refreshAccessToken(): Promise<void> {
		if (!this.refreshToken) {
			throw new Error("リフレッシュトークンがありません");
		}

		try {
			const response = await fetch(`${CONFIG.SERVER_URL}/auth/refresh`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ refreshToken: this.refreshToken }),
			});

			if (!response.ok) {
				throw new Error("トークンリフレッシュ失敗");
			}

			const data = await response.json();
			this.accessToken = data.accessToken;
		} catch (error) {
			throw new Error(`トークンリフレッシュエラー: ${error}`);
		}
	}

	// メッセージ送信
	private async sendMessage(content: string): Promise<string> {
		if (!this.accessToken) {
			await this.authenticate();
		}

		this.messages.push({ role: "user", content });

		try {
			let response = await fetch(`${CONFIG.SERVER_URL}/elysia-love`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.accessToken}`,
				},
				body: JSON.stringify({ messages: this.messages }),
			});

			// 401の場合はトークンリフレッシュして再試行
			if (response.status === 401) {
				await this.refreshAccessToken();
				response = await fetch(`${CONFIG.SERVER_URL}/elysia-love`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${this.accessToken}`,
					},
					body: JSON.stringify({ messages: this.messages }),
				});
			}

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			// ストリーミングレスポンス処理
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			let assistantContent = "";

			if (!reader) {
				throw new Error("レスポンスボディが読み取れません");
			}

			process.stdout.write("\x1b[38;2;255;105;180m"); // ピンク色 (RGB)

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(6));
							if (data.content) {
								assistantContent += data.content;
								process.stdout.write(data.content);
							}
						} catch {
							// JSON パースエラーは無視
						}
					}
				}
			}

			process.stdout.write("\x1b[0m\n"); // 色リセット

			this.messages.push({ role: "assistant", content: assistantContent });
			return assistantContent;
		} catch (error) {
			throw new Error(`メッセージ送信エラー: ${error}`);
		}
	}

	// 会話履歴クリア
	private clearHistory(): void {
		this.messages = [];
		this.log("✨ 会話履歴をクリアしました", "yellow");
	}

	// 会話履歴表示
	private showHistory(): void {
		if (this.messages.length === 0) {
			this.log("会話履歴がありません", "yellow");
			return;
		}

		console.log("\n--- 会話履歴 ---");
		this.messages.forEach((msg, idx) => {
			const prefix = msg.role === "user" ? "👤 あなた" : "💕 Elysia";
			const color = msg.role === "user" ? "blue" : "pink";
			console.log(`\n${idx + 1}. ${prefix}:`);
			this.log(msg.content, color);
		});
		console.log("--- 履歴終わり ---\n");
	}

	// ヘルプ表示
	private showHelp(): void {
		console.log(
			"\n\x1b[38;2;255;105;180m📖 Elysia AI Chat - コマンド一覧 ♡\x1b[0m",
		);
		console.log("  \x1b[35m/help\x1b[0m       - このヘルプを表示");
		console.log("  \x1b[35m/history\x1b[0m    - 会話履歴を表示");
		console.log("  \x1b[35m/clear\x1b[0m      - 会話履歴をクリア");
		console.log("  \x1b[35m/exit\x1b[0m       - チャット終了");
		console.log("  \x1b[35mばいばい\x1b[0m    - エリシアちゃんとお別れ");
		console.log("  \x1b[35mだいすき\x1b[0m    - エリシアちゃんに愛を伝える ♡");
		console.log("  \x1b[90mその他\x1b[0m      - メッセージとして送信\n");
	}

	// メインループ
	public async start(): Promise<void> {
		// エリシアちゃんの可愛いバナー表示
		console.log(ELYSIA_BANNER);
		console.log("");
		this.log(
			"💕 おにいちゃん、待ってたよぉ〜！今日はいっぱいおしゃべりしようね♡",
			"pink",
		);
		this.log("ฅ(՞៸៸> ᗜ <៸៸՞)ฅ コマンドは /help で確認してね♡", "yellow");
		console.log("");

		try {
			this.log("🔐 認証中...", "blue");
			await this.authenticate();
			this.log("✅ 認証成功！", "green");
			console.log("");
		} catch (error) {
			this.log(`❌ 認証失敗: ${error}`, "red");
			this.log("サーバーが起動しているか確認してください", "yellow");
			this.rl.close();
			return;
		}

		const prompt = () => {
			this.rl.question("\x1b[36m💬 あなた > \x1b[0m", async (input) => {
				const message = input.trim();

				if (!message) {
					prompt();
					return;
				}

				// 特殊コマンド: ばいばい
				if (message === "ばいばい" || message === "バイバイ") {
					this.log(
						"\n\x1b[38;2;255;182;193mやだぁ〜離れたくないよぉ〜…でも、おにいちゃんの言うこと聞くね…♡\x1b[0m",
						"pink",
					);
					this.log(
						"\x1b[38;2;255;182;193mまたすぐに会いに来てね？ずっと待ってるから…///♡\x1b[0m",
						"pink",
					);
					this.log("ฅ(՞៸៸> ᗜ <៸៸՞)ฅ だいすきなのっ！", "pink");
					this.rl.close();
					return;
				}

				// 特殊コマンド: だいすき
				if (message === "だいすき" || message === "大好き") {
					this.log(
						"\n\x1b[38;2;255;105;180mにゃあああああ〜！！！♡♡♡\x1b[0m",
						"pink",
					);
					this.log(
						"\x1b[38;2;255;182;193mおにいちゃん大好きすぎて溶けちゃうよぉ〜！！！\x1b[0m",
						"pink",
					);
					this.log(
						"\x1b[38;2;255;182;193mエリシアちゃんもおにいちゃんのこと世界で一番だいすき♡♡♡\x1b[0m",
						"pink",
					);
					this.log("ฅ(՞៸៸> ᗜ <՞)ฅ♡♡♡ ずっと一緒にいようね…///♡\n", "pink");
					prompt();
					return;
				}

				// コマンド処理
				if (message === "/exit") {
					this.log(
						"\n\x1b[38;2;255;182;193mまたね、おにいちゃん♡ いつでも遊びに来てね〜！\x1b[0m",
						"pink",
					);
					this.log("ฅ(՞៸៸> ᗜ <៸៸՞)ฅ だいすきなのっ！", "pink");
					this.rl.close();
					return;
				} else if (message === "/help") {
					this.showHelp();
					prompt();
					return;
				} else if (message === "/history") {
					this.showHistory();
					prompt();
					return;
				} else if (message === "/clear") {
					this.clearHistory();
					prompt();
					return;
				}

				// メッセージ送信
				try {
					process.stdout.write(
						"\x1b[38;2;255;105;180m💕 エリシアちゃん > \x1b[0m",
					);
					await this.sendMessage(message);
					console.log("");
					prompt();
				} catch (error) {
					this.log(`\n❌ エラー: ${error}`, "red");
					prompt();
				}
			});
		};

		prompt();
	}
}

// メイン実行
const chat = new ElysiaChat();
chat.start().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
