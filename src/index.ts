import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { Elysia, t } from "elysia";

const KERNEL_URL = "http://localhost:8000";

const app = new Elysia()
	.use(cors())
	.use(staticPlugin())
	.get("/", () => Bun.file("index.html"))

	// システムヘルスチェックのプロキシ
	.get("/api/health", async ({ set }) => {
		try {
			const res = await fetch(`${KERNEL_URL}/health`);
			if (!res.ok) throw new Error();
			return await res.json();
		} catch (e) {
			set.status = 503;
			return { ollama: false, kernel: false, workspace: false };
		}
	})

	.post(
		"/api/process",
		async ({ body, set }) => {
			const { query } = body as { query: string };

			try {
				const response = await fetch(`${KERNEL_URL}/process`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ query }),
				});

				if (!response.ok) {
					throw new Error("Kernel communication failed");
				}

				return await response.json();
			} catch (error) {
				set.status = 503;
				return {
					response:
						"知能の共鳴が遮断されました。深層回路（Python Kernel）の接続を確認してください。",
					thoughts: ["致命的エラー：通信路の破綻。"],
					status: "error",
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
