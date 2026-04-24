import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { Elysia, t } from "elysia";

// --- Kernel Bridge (Sovereign Binary Stream) ---
let pythonProcess: any;

function startKernel() {
	console.log("[BRIDGE] Starting Sovereign Kernel...");
	pythonProcess = Bun.spawn(["python", "main.py"], {
		stdin: "pipe",
		stdout: "pipe",
		stderr: "inherit",
		onExit(proc, exitCode, signalCode, error) {
			console.error(
				`[BRIDGE] Kernel exited with code ${exitCode}. Restarting...`,
			);
			setTimeout(startKernel, 1000);
		},
	});
	setupReader();
}

const requests = new Map<number, (res: any) => void>();
let requestId = 0;

async function callKernel(method: string, params: any = {}) {
	if (!pythonProcess || pythonProcess.killed) {
		return { error: "Kernel offline" };
	}
	const id = requestId++;
	const payload = `${JSON.stringify({ id, method, params })}\n`;

	const requestPromise = new Promise((resolve) => {
		requests.set(id, resolve);
		pythonProcess.stdin.write(payload);
		pythonProcess.stdin.flush();
	});

	const timeoutPromise = new Promise((resolve) => {
		setTimeout(() => {
			if (requests.has(id)) {
				requests.delete(id);
				resolve({ error: "Kernel request timeout", status: "timeout" });
			}
		}, 30000);
	});

	return Promise.race([requestPromise, timeoutPromise]);
}

function setupReader() {
	const reader = pythonProcess.stdout.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	(async () => {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value);
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (!line.trim()) continue;
				try {
					const response = JSON.parse(line);
					if (response.id !== undefined && requests.has(response.id)) {
						requests.get(response.id)!(response.result);
						requests.delete(response.id);
					}
				} catch (e) {
					// Ignore non-JSON logs
				}
			}
		}
	})();
}

startKernel();

const app = new Elysia()
	.use(cors())
	.use(staticPlugin())
	.get("/", () => Bun.file("index.html"))
	.get("/api/health", async () => {
		return await callKernel("health");
	})
	.post(
		"/api/process",
		async ({ body }) => {
			const { query } = body as { query: string };
			return await callKernel("process", { query });
		},
		{
			body: t.Object({ query: t.String() }),
		},
	)
	.listen(3000);

console.log(
	`🦊 Elysia (Sovereign Node) is running at ${app.server?.hostname}:${app.server?.port}`,
);
