#!/usr/bin/env bun
// シンプルなサーバー起動スクリプト（Bunバグ回避用）

import { startServer } from "./src/index";

const PORT = Number(process.env.PORT || 3000);

console.log(`🌸 Starting Elysia AI Server on port ${PORT}...`);
startServer(PORT);
console.log(`✅ Server is running at http://localhost:${PORT}`);
console.log(`📚 Swagger: http://localhost:${PORT}/swagger`);
console.log(`🏥 Health: http://localhost:${PORT}/health`);
console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
