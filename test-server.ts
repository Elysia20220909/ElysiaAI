import { Elysia } from "elysia";

const app = new Elysia()
	.get("/", () => "Hello World!")
	.get("/ping", () => ({ ok: true }));

Bun.serve({
	port: 3000,
	fetch: app.fetch,
});

console.log(`Server running on http://localhost:3000`);
