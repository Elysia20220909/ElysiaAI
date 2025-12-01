import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import axios from "axios";
import { Elysia, t } from "elysia";
import sanitizeHtml from "sanitize-html";

// ==================== 定数定義 ====================
const CONFIG = {
	PORT: 3000,
	RAG_API_URL: "http://127.0.0.1:8000/rag",
	RAG_TIMEOUT: 5000,
	MODEL_NAME: "llama3.2",
	MAX_REQUESTS_PER_MINUTE: 60,
	ALLOWED_ORIGINS: ["http://localhost:3000"] as string[],
	DANGEROUS_KEYWORDS: ["eval", "exec", "system", "drop", "delete", "<script"],
};

// レート制限用マップ（簡易実装）
const requestCounts = new Map<string, { count: number; resetTime: number }>();

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
 * 簡易レート制限チェック（IP/識別子ベース）
 */
function checkRateLimit(identifier: string): boolean {
	const now = Date.now();
	const record = requestCounts.get(identifier);

	if (!record || now > record.resetTime) {
		requestCounts.set(identifier, { count: 1, resetTime: now + 60000 });
		return true;
	}

	if (record.count >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
		return false;
	}

	record.count++;
	return true;
}

/**
 * 危険キーワード検出
 */
function containsDangerousKeywords(text: string): boolean {
	const lowerText = text.toLowerCase();
	return CONFIG.DANGEROUS_KEYWORDS.some((kw) => lowerText.includes(kw));
}

// ==================== Elysiaアプリ ====================
const app = new Elysia()
	.use(
		cors({
			origin: CONFIG.ALLOWED_ORIGINS,
			methods: ["GET", "POST"],
			credentials: true,
		}),
	)
	.use(html())
	.use(staticPlugin({ assets: "public", prefix: "" }))
	// ロギングミドルウェア
	.onRequest(({ request }) => {
		const timestamp = new Date().toISOString();
		const method = request.method;
		const url = new URL(request.url).pathname;
		console.log(`[${timestamp}] ${method} ${url}`);
	})

	// ルート: メインHTML配信
	.get("/", () => Bun.file("public/index.html"))

	// エンドポイント: Elysiaとのチャット(ストリーミング)
	.post(
		"/elysia-love",
		async ({ body, request }: { body: ChatRequest; request: Request }) => {
			const { messages } = body;

			// レート制限チェック（簡易：IP取得困難なのでタイムスタンプベース）
			const clientId = request.headers.get("x-forwarded-for") || "anonymous";
			if (!checkRateLimit(clientId)) {
				console.warn(`[Security] Rate limit exceeded: ${clientId}`);
				throw new Error(
					"にゃん♡ おにいちゃん、ちょっと急ぎすぎだよぉ〜？ 少し休憩しよ？",
				);
			}

			// メッセージ内容をサニタイズ
			const sanitizedMessages = messages.map((m) => {
				const cleaned = sanitizeHtml(m.content, {
					allowedTags: [],
					allowedAttributes: {},
				});

				// 危険キーワードチェック
				if (containsDangerousKeywords(cleaned)) {
					console.warn(`[Security] Dangerous keyword detected: ${cleaned}`);
					throw new Error(
						"にゃん♡ いたずらはダメだよぉ〜？ エリシアちゃん怒るよ？",
					);
				}

				return { role: m.role, content: cleaned };
			});

			// FastAPI /chat エンドポイントを直接呼び出し（Ollama統合済み）
			try {
				const response = await axios.post(
					"http://127.0.0.1:8000/chat",
					{
						messages: sanitizedMessages,
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
							minLength: 1,
							// 安全な文字のみ許可（英数字、日本語、基本記号、絵文字）
							pattern: "^[a-zA-Z0-9\\s\\p{L}\\p{N}\\p{P}\\p{S}♡♪〜！？。、]+$",
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
