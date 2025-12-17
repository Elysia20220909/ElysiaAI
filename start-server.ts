#!/usr/bin/env bun
// シンプルなサーバー起動スクリプト（Bunバグ回避用）

import app from "./src/index";

const PORT = process.env.PORT || 3000;
console.log(`🌸 Starting Elysia AI Server on port ${PORT}...`);

app.listen(PORT, (server) => {
	const base = String(server.url).replace(/\/$/, "");
	console.log(`✅ Server is running at ${base}/`);
	console.log(`📚 Swagger: ${base}/swagger`);
	console.log(`🏥 Health: ${base}/health`);
	console.log(`📊 Metrics: ${base}/metrics`);
});
