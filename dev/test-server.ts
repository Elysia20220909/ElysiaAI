import { Elysia } from "elysia";

// Simplified test server to verify deployment readiness
const _app = new Elysia()
	.get("/", () => ({
		status: "ok",
		message: "🌸 Elysia AI Server (Test Mode)",
		timestamp: new Date().toISOString(),
	}))
	.get("/health", () => ({
		status: "healthy",
		uptime: process.uptime(),
		memory: process.memoryUsage(),
		timestamp: new Date().toISOString(),
	}))
	.get("/metrics", () => {
		const mem = process.memoryUsage();
		return `# HELP nodejs_memory_heap_used_bytes Memory usage
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${mem.heapUsed}
# HELP nodejs_memory_heap_total_bytes Memory usage  
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${mem.heapTotal}
`;
	})
	.listen(3000);

console.log(`
🌸 Elysia AI Test Server Running
📡 Port: 3000
🌐 URL: http://localhost:3000
🏥 Health: http://localhost:3000/health
📊 Metrics: http://localhost:3000/metrics

Note: This is a simplified test server.
For full features, fix Bun v1.1.29 double-serve issue or upgrade Bun.
`);
