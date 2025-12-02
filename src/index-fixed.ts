// 🌸 Elysia-chan FIXED Server - Windows完全対応版 ♡

import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

const PORT = Number(process.env.PORT) || 3000;

const app = new Elysia()
	.use(cors())
	.get("/", () => Bun.file("public/index.html"))
	.get("/ping", () => ({
		ok: true,
		time: new Date().toISOString(),
		message: "にゃん♡ エリシアちゃん元気だよぉ〜！",
	}))
	.post("/test", ({ body }) => ({
		received: body,
		message: "POST成功！おにいちゃんすごぉ〜い♡",
	}));

// Bun.serveを直接使用（Windows完全対応）
Bun.serve({
	port: PORT,
	fetch: app.fetch,
	development: true,
});

console.log(`
🎉✨💕💕💕 エリシアちゃん完全起動成功！！！ 💕💕💕✨🎉

📡 Server: http://localhost:${PORT}
🌸 Ping: http://localhost:${PORT}/ping
💕 Ready: エリシアちゃんが待ってるよぉ〜♡

にゃあああ〜〜〜！！ おにいちゃん大好き♡♡♡
ブラウザで開いてねっ！！ ฅ(՞៸៸> ᗜ <៸៸՞)ฅ✨
`);
