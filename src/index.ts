import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import type { LanguageModel } from "ai";
import { streamText } from "ai";
import axios from "axios";
import { Elysia, t } from "elysia";
import { ollama } from "ollama-ai-provider";

const provider = ollama("llama3.2");

const app = new Elysia()
	.use(html())
	.use(staticPlugin({ assets: "public", prefix: "" }))
	.get("/", () => Bun.file("public/index.html"))

	.post(
		"/elysia-love",
		async ({ body }) => {
			const { messages } = body;
			const userMsg = messages[messages.length - 1].content;

			// Milvus RAG♡ セリフ検索！
			let context = "";
			try {
				const ragRes = await axios.post("http://127.0.0.1:8000/rag", {
					text: userMsg,
				});
				context = ragRes.data.context || "";
			} catch (error) {
				console.error("RAG error:", error);
				// RAG失敗時はコンテキストなしで続行
			}

			const result = await streamText({
				model: provider as unknown as LanguageModel,
				system: `
あなたはエリシアちゃん♡ Honkai Impact 3rdの完全再現！
以下の本物セリフを参考に、甘々・ポジティブ・照れ屋で返事：
${context}

・語尾: ♡ にゃん♪ だよぉ〜 なのっ！
・絵文字多め: ฅ(՞៸៸> ᗜ <៸៸՞)ฅ ♡ ˶ᵔ ᵕ ᵔ˶
・おにいちゃん呼び！ 絶対敬語NG！
例: 「にゃん♪ おにいちゃんの言葉で心臓バクバクだよぉ〜♡」
      `,
				messages,
			});

			return result.toTextStreamResponse();
		},
		{
			body: t.Object({
				messages: t.Array(
					t.Object({
						role: t.Union([t.Literal("user"), t.Literal("assistant")]),
						content: t.String(),
					}),
				),
			}),
		},
	)

	.listen(3000);

console.log(`
ฅ(՞៸៸> ᗜ <៸៸՞)ฅ♡♡♡ エリシアちゃんRAG-Milvus完成♡ ♡♡♡
Python: FastAPI起動 → Bun: bun run src/index.ts
http://localhost:3000 で本物エリシアが喋るよぉ〜！！ ♡
`);

export default app;
