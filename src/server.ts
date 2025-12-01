/**
 * Legacy server implementation (Not currently used)
 * Main server is in src/index.ts
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Elysia } from "elysia";

const CONFIG = {
	PORT: Number(process.env.PORT) || 3000,
	MODEL: "llama3.2",
	MAX_BUFFER: 10 * 1024 * 1024, // 10MB
} as const;

const app = new Elysia();

// ルート: HTMLファイル配信
app.get("/", () => {
	const htmlPath = path.join(process.cwd(), "public", "index.html");
	const file = fs.readFileSync(htmlPath, "utf8");
	return new Response(file, {
		headers: { "content-type": "text/html; charset=utf-8" },
	});
});

// エンドポイント: AIチャット (Ollamaダイレクト実行)
app.post("/ai", async (c) => {
	const req = c.request;
	const contentType = (req.headers.get("content-type") || "").toLowerCase();

	let messages: Array<{ role?: string; content?: string }> = [];

	// リクエストボディパース
	try {
		if (contentType.includes("application/json")) {
			const json = await req.json();
			messages = json.messages ?? json;
		} else if (contentType.includes("application/x-www-form-urlencoded")) {
			const text = await req.text();
			const params = new URLSearchParams(text);
			const rawMessages = params.get("messages");
			if (rawMessages) {
				try {
					messages = JSON.parse(rawMessages);
				} catch {
					messages = [{ role: "user", content: rawMessages }];
				}
			}
		} else {
			// フォールバック: JSONパース試行、失敗時はプレーンテキスト扱い
			const text = await req.text();
			try {
				const parsed = JSON.parse(text);
				messages = parsed.messages ?? parsed;
			} catch {
				if (text) messages = [{ role: "user", content: text }];
			}
		}
	} catch {
		return new Response(JSON.stringify({ error: "Invalid request body" }), {
			status: 400,
			headers: { "content-type": "application/json; charset=utf-8" },
		});
	}

	// ユーザープロンプト抽出
	const lastUserMessage = messages.filter((m) => m.role === "user").pop() ??
		messages.pop() ?? { content: "" };
	const prompt = (lastUserMessage.content || "").toString().trim();

	if (!prompt) {
		return new Response(JSON.stringify({ error: "Empty prompt" }), {
			status: 400,
			headers: { "content-type": "application/json; charset=utf-8" },
		});
	}

	// Ollama CLI存在確認
	try {
		const version = spawnSync("ollama", ["--version"], { encoding: "utf8" });
		if (version.error) throw version.error;
	} catch {
		return new Response(
			"Ollama CLI not found. Install Ollama and pull a model: `ollama pull llama3.2`",
			{ status: 500 },
		);
	}

	// Ollama実行 (非ストリーミング)
	try {
		const result = spawnSync("ollama", ["run", CONFIG.MODEL, prompt], {
			encoding: "utf8",
			maxBuffer: CONFIG.MAX_BUFFER,
		});

		if (result.error) {
			return new Response(`Failed to execute ollama: ${result.error.message}`, {
				status: 500,
			});
		}

		if (result.status !== 0) {
			const stderr = result.stderr || `Exit code: ${result.status}`;
			return new Response(`Ollama error: ${stderr}`, {
				status: 500,
			});
		}

		const output = result.stdout ?? "";
		return new Response(output, {
			headers: { "content-type": "text/plain; charset=utf-8" },
		});
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		return new Response(`Unexpected error: ${errorMsg}`, {
			status: 500,
		});
	}
});

// サーバー起動
app.listen(CONFIG.PORT);

console.log(`
🚀 Legacy Server (Ollama Direct) Started!
📡 Port: ${CONFIG.PORT}
🤖 Model: ${CONFIG.MODEL}
`);

export default app;
