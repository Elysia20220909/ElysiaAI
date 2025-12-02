import { Elysia } from "elysia";

const app = new Elysia()
	.get("/", () => "Hello World!")
	.get("/ping", () => ({ ok: true }));

const server = Bun.serve({
	port: 3000,
	fetch: app.fetch,
});

console.log(`Server running on http://localhost:${server.port}`);

// Keep process alive
process.on("SIGINT", () => {
	console.log("\nShutting down...");
	server.stop();
	process.exit(0);
});

// Prevent premature exit on Windows
if (process.platform === "win32") {
	setInterval(() => {}, 1000);
}
