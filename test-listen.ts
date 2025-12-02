import { Elysia } from "elysia";

const app = new Elysia().get("/ping", () => ({ ok: true })).listen(3001);

console.log("Server started on port 3001");
console.log(`Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
