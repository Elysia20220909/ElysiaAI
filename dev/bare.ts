import { Elysia } from "elysia";

new Elysia().get("/", () => "Hello Elysia").listen(3003);

console.log("🦊 Elysia is running at http://localhost:3003");
