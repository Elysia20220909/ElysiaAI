import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Elysia } from "elysia";

const app = new Elysia();

app.get("/", () => {
	const file = fs.readFileSync(
		path.join(process.cwd(), "public", "index.html"),
		"utf8",
	);
	return new Response(file, {
		headers: { "content-type": "text/html; charset=utf-8" },
	});
});

app.post("/ai", async (c) => {
	const req = c.request;
	const ct = (req.headers.get("content-type") || "").toLowerCase();

	let messages: Array<{ role?: string; content?: string }> = [];

	try {
		if (ct.includes("application/json")) {
			const j = await req.json();
			messages = j.messages ?? j;
		} else if (ct.includes("application/x-www-form-urlencoded")) {
			const txt = await req.text();
			const params = new URLSearchParams(txt);
			const m = params.get("messages");
			if (m) {
				try {
					messages = JSON.parse(m);
				} catch {
					messages = [{ role: "user", content: m }];
				}
			}
		} else {
			// fallback: try parse body as JSON, otherwise treat whole body as user content
			const txt = await req.text();
			try {
				const parsed = JSON.parse(txt);
				messages = parsed.messages ?? parsed;
			} catch {
				if (txt) messages = [{ role: "user", content: txt }];
			}
		}
	} catch (_e) {
		return new Response(JSON.stringify({ error: "invalid request body" }), {
			status: 400,
			headers: { "content-type": "application/json; charset=utf-8" },
		});
	}

	const lastUser = (messages.filter((m) => m.role === "user").pop() ??
		messages.pop()) || { content: "" };
	const prompt = (lastUser.content || "").toString();

	if (!prompt.trim())
		return new Response(JSON.stringify({ error: "empty prompt" }), {
			status: 400,
			headers: { "content-type": "application/json; charset=utf-8" },
		});

	// Ensure ollama CLI is available
	try {
		const v = spawnSync("ollama", ["--version"], { encoding: "utf8" });
		if (v.error) throw v.error;
	} catch (_err) {
		return new Response(
			"Ollama CLI not found on server. Install Ollama and pull a model (e.g. `ollama pull llama3.2`).",
			{ status: 500 },
		);
	}

	// Run Ollama synchronously and return full output (non-streaming)
	try {
		// Pass prompt as an argument to `ollama run`. This assumes the CLI supports: `ollama run <model> <prompt>`.
		const run = spawnSync("ollama", ["run", "llama3.2", prompt], {
			encoding: "utf8",
			maxBuffer: 10 * 1024 * 1024,
		});

		if (run.error) {
			return new Response(`Failed to execute ollama: ${run.error.message}`, {
				status: 500,
			});
		}

		if (run.status !== 0) {
			const stderr = run.stderr || String(run.status);
			return new Response(`Ollama returned non-zero status: ${stderr}`, {
				status: 500,
			});
		}

		const out = run.stdout ?? "";
		return new Response(out, {
			headers: { "content-type": "text/plain; charset=utf-8" },
		});
	} catch (e: unknown) {
		const errorMsg = e instanceof Error ? e.message : String(e);
		return new Response(`Unexpected error running ollama: ${errorMsg}`, {
			status: 500,
		});
	}
});

const port = Number(process.env.PORT) || 3000;
app.listen(port);

export default app;
