#!/usr/bin/env bun
// シンプルなサーバー起動スクリプト（Bunバグ回避用）

import app from "./src/index";

const PORT = process.env.PORT || 3000;

// @ts-expect-error
console.log(`🌸 Starting Elysia AI Server on port ${PORT}...`);

app.listen(PORT, (server) => {
	console.log(`✅ Server is running at ${server.url}`);
	console.log(`📚 Swagger: ${server.url}/swagger`);
	console.log(`🏥 Health: ${server.url}/health`);
	console.log(`📊 Metrics: ${server.url}/metrics`);
});
