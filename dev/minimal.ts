import { Elysia } from "elysia";

new Elysia().get("/", () => "OK").listen(3000);
console.log("Server started on 3000");
process.stdin.resume();
