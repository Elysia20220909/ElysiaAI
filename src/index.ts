import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";

const app = new Elysia()
	.use(cors())
	.get("/", () => Bun.file("index.html"))
	.post(
		"/ask",
		async ({ body, set }) => {
			const { query } = body as { query: string };

			try {
				// Python Kernel (Resonance Loop) へリクエストを転送
				const response = await fetch("http://localhost:8000/process", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ query }),
				});

				if (!response.ok) {
					throw new Error("Kernel communication failed");
				}

				return await response.json();
			} catch (error) {
				// 仕様書に基づいた構造化エラーレスポンス
				set.status = 503;
				return {
					success: false,
					error: {
						code: "ERR_KERNEL_OFFLINE",
						message: "Python AI Kernel に接続できません。",
						hint: "make boot を実行してカーネルが起動しているか確認してください。",
						retryable: true,
					},
				};
			}
		},
		{
			body: t.Object({
				query: t.String(),
			}),
		},
	)
	.listen(3000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
