import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import type { LanguageModel } from "ai";
import { streamText } from "ai";
import axios from "axios";
import { Elysia, t } from "elysia";
import { ollama } from "ollama-ai-provider";

// ==================== 定数定義 ====================
const CONFIG = {
	PORT: 3000,
	RAG_API_URL: "http://127.0.0.1:8000/rag",
	RAG_TIMEOUT: 5000,
	MODEL_NAME: "llama3.2",
} as const;

const ELYSIA_SYSTEM_PROMPT = `
あなたはエリシアちゃん♡ Honkai Impact 3rdの完全再現!
以下の本物セリフを参考に、甘々・ポジティブ・照れ屋で返事:
{context}

【性格ガイドライン】
・語尾: ♡ にゃん♪ だよぉ〜 なのっ!
・絵文字多め: ฅ(՞៸៸> ᗜ <៸៸՞)ฅ ♡ ˶ᵔ ᵕ ᵔ˶
・おにいちゃん呼び! 絶対敬語NG!
・例: 「にゃん♪ おにいちゃんの言葉で心臓バクバクだよぉ〜♡」
` as const;

// ==================== 型定義 ====================
interface Message {
	role: "user" | "assistant";
	content: string;
}

interface ChatRequest {
	messages: Message[];
}

// ==================== ヘルパー関数 ====================
/**
 * RAGコンテキストを取得
 * @param userMessage ユーザーメッセージ
 * @returns RAGコンテキスト文字列
 */
async function fetchRAGContext(userMessage: string): Promise<string> {
	try {
		const response = await axios.post(
			CONFIG.RAG_API_URL,
			{ text: userMessage },
			{ timeout: CONFIG.RAG_TIMEOUT },
		);
		return response.data?.context || "";
	} catch (error) {
		if (axios.isAxiosError(error)) {
			console.warn(
				`[RAG] Failed to fetch context: ${error.message}`,
				error.code,
			);
		} else {
			console.error("[RAG] Unexpected error:", error);
		}
		return ""; // フォールバック: コンテキストなしで続行
	}
}

// ==================== Elysiaアプリ ====================
const provider = ollama(CONFIG.MODEL_NAME);

const app = new Elysia()
	.use(html())
	.use(staticPlugin({ assets: "public", prefix: "" }))

	// ルート: メインHTML配信
	.get("/", () => Bun.file("public/index.html"))

	// エンドポイント: Elysiaとのチャット(ストリーミング)
	.post(
		"/elysia-love",
		async ({ body }: { body: ChatRequest }) => {
			const { messages } = body;
			const userMsg = messages[messages.length - 1]?.content || "";

			// FastAPI /chat エンドポイントを直接呼び出し（Ollama統合済み）
			try {
				const response = await axios.post(
					"http://127.0.0.1:8000/chat",
					{
						messages: messages.map((m) => ({
							role: m.role,
							content: m.content,
						})),
						stream: true,
					},
					{
						responseType: "stream",
						timeout: 60000,
					},
				);

				// ストリーミングレスポンスをそのまま返す
				return new Response(response.data, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			} catch (error) {
				console.error("[Chat] Error:", error);
				if (axios.isAxiosError(error) && error.response?.status === 503) {
					throw new Error(
						"Ollama service is not available. Please start Ollama: ollama serve",
					);
				}
				throw error;
			}
		},
		{
			body: t.Object({
				messages: t.Array(
					t.Object({
						role: t.Union([t.Literal("user"), t.Literal("assistant")]),
						content: t.String({
							maxLength: 500,
						}),
					}),
					{ maxItems: 10 },
				),
			}),
		},
	)
	.listen(CONFIG.PORT);

// ==================== サーバー起動メッセージ ====================
console.log(`
${"+".repeat(60)}
✨ Elysia AI Server Started! ✨
${"+".repeat(60)}
🌸 ฅ(՞៸៸> ᗜ <៸៸՞)ฅ エリシアちゃんRAG-Milvus完成♡

📡 Server: http://localhost:${CONFIG.PORT}
🔮 RAG API: ${CONFIG.RAG_API_URL}
🤖 LLM Model: ${CONFIG.MODEL_NAME}

💡 Usage:
   1. FastAPI起動 → python python/fastapi_server.py
   2. このサーバー起動 → bun run src/index.ts
   3. ブラウザアクセス → http://localhost:${CONFIG.PORT}
${"+".repeat(60)}
`);

export default app;
