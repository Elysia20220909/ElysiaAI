import { Elysia } from "elysia";

console.log("1. Starting...");

const app = new Elysia().get("/", () => "Hello");

console.log("2. App created");

app.listen(3002);

console.log("3. Listen called");

// プロセスを維持
setInterval(() => {
	console.log("Still running...");
}, 5000);
