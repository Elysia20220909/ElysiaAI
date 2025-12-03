import { Elysia } from "elysia";

const app = new Elysia()
	.get("/", () => "Hello Elysia!")
	.get("/ping", () => ({ ok: true, message: "pong" }))
	.listen(3001);

console.log(`
✅ Test server running
🌐 http://localhost:3001
📍 http://127.0.0.1:3001
`);
