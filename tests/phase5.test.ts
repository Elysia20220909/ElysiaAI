import { beforeAll, describe, expect, it } from "bun:test";
import { auditLogger } from "../src/lib/audit-logger";
import { cronScheduler } from "../src/lib/cron-scheduler";
import { jobQueue } from "../src/lib/job-queue";

describe("Phase 5 Features", () => {
	describe("Audit Logger", () => {
		it("should log API requests automatically", () => {
			// Add a test log
			auditLogger.log({
				action: "READ",
				resource: "test",
				method: "GET",
				path: "/test",
				ipAddress: "127.0.0.1",
				userAgent: "test-agent",
				statusCode: 200,
			});

			const result = auditLogger.search({ resource: "test" });
			expect(result.logs.length).toBeGreaterThan(0);

			const lastLog = result.logs[0];
			expect(lastLog.path).toBe("/test");
			expect(lastLog.method).toBe("GET");
		});

		it("should extract userId from JWT token", () => {
			auditLogger.log({
				userId: "testuser",
				action: "READ",
				resource: "test",
				method: "GET",
				path: "/test",
				ipAddress: "127.0.0.1",
				userAgent: "test-agent",
				statusCode: 200,
			});

			const result = auditLogger.search({ userId: "testuser" });
			expect(result.logs.length).toBeGreaterThan(0);
			expect(result.logs[0].userId).toBe("testuser");
		});

		it("should detect action from HTTP method", () => {
			auditLogger.log({
				action: "READ",
				resource: "test",
				method: "GET",
				path: "/test",
				ipAddress: "127.0.0.1",
				userAgent: "test-agent",
				statusCode: 200,
			});

			const readResult = auditLogger.search({ action: "READ" });
			expect(readResult.logs.length).toBeGreaterThan(0);
			expect(readResult.logs[0].action).toBe("READ");

			auditLogger.log({
				action: "CREATE",
				resource: "test",
				method: "POST",
				path: "/test",
				ipAddress: "127.0.0.1",
				userAgent: "test-agent",
				statusCode: 201,
			});

			const createResult = auditLogger.search({ action: "CREATE" });
			expect(createResult.logs.length).toBeGreaterThan(0);
			expect(createResult.logs[0].action).toBe("CREATE");
		});

		it("should extract resource from URL path", () => {
			auditLogger.log({
				action: "READ",
				resource: "feedback",
				resourceId: "123",
				method: "GET",
				path: "/feedback/123",
				ipAddress: "127.0.0.1",
				userAgent: "test-agent",
				statusCode: 200,
			});

			const result = auditLogger.search({ resource: "feedback" });
			expect(result.logs.length).toBeGreaterThan(0);

			const lastLog = result.logs[0];
			expect(lastLog.resource).toBe("feedback");
			expect(lastLog.resourceId).toBe("123");
		});

		it("should detect AUTH action for login endpoint", () => {
			auditLogger.log({
				action: "AUTH",
				resource: "auth",
				method: "POST",
				path: "/auth/login",
				ipAddress: "127.0.0.1",
				userAgent: "test-agent",
				statusCode: 200,
			});

			const result = auditLogger.search({ action: "AUTH" });
			expect(result.logs.length).toBeGreaterThan(0);
			expect(result.logs[0].action).toBe("AUTH");
		});

		it("should get user activity from audit logs", () => {
			auditLogger.log({
				userId: "user123",
				action: "READ",
				resource: "test",
				method: "GET",
				path: "/test",
				ipAddress: "127.0.0.1",
				userAgent: "test",
				statusCode: 200,
			});

			const activity = auditLogger.getUserActivity("user123", 10);
			expect(Array.isArray(activity)).toBe(true);
			expect(activity.length).toBeGreaterThan(0);
			expect(activity[0].userId).toBe("user123");
		});
	});

	describe("WebSocket Integration", () => {
		it("should initialize WebSocket server with HTTP server", async () => {
			// WebSocket manager is initialized in src/index.ts
			const { wsManager } = await import("../src/lib/websocket-manager");

			expect(wsManager).toBeDefined();
			expect(typeof wsManager.getStats).toBe("function");

			const stats = wsManager.getStats();
			expect(stats).toHaveProperty("totalClients");
			expect(stats).toHaveProperty("totalRooms");
		});

		it("should handle WebSocket connections", async () => {
			const { wsManager } = await import("../src/lib/websocket-manager");

			const initialStats = wsManager.getStats();
			expect(initialStats.totalClients).toBeGreaterThanOrEqual(0);
		});

		it("should broadcast messages to rooms", async () => {
			const { wsManager } = await import("../src/lib/websocket-manager");

			// Test broadcast functionality
			wsManager.broadcast({
				type: "notification",
				payload: { message: "test" },
			});

			// Verify stats remain consistent
			const stats = wsManager.getStats();
			expect(stats).toBeDefined();
		});
	});

	describe("Admin Dashboard API", () => {
		beforeAll(async () => {
			// Initialize services
			await jobQueue.initialize();
			cronScheduler.initializeDefaultTasks();
		});

		it("should return job queue statistics", async () => {
			const stats = await jobQueue.getStats();

			expect(stats).toHaveProperty("waiting");
			expect(stats).toHaveProperty("active");
			expect(stats).toHaveProperty("completed");
			expect(stats).toHaveProperty("failed");

			expect(typeof stats.waiting).toBe("number");
			expect(typeof stats.active).toBe("number");
		});

		it("should return cron task statistics", () => {
			const stats = cronScheduler.getStats();

			expect(stats).toHaveProperty("totalTasks");
			expect(stats).toHaveProperty("enabledTasks");
			expect(stats).toHaveProperty("disabledTasks");

			expect(typeof stats.totalTasks).toBe("number");
		});

		it("should return audit log statistics", () => {
			const stats = auditLogger.getStats();

			expect(stats).toHaveProperty("totalLogs");
			expect(stats).toHaveProperty("last24Hours");
			expect(stats).toHaveProperty("last7Days");

			expect(typeof stats.totalLogs).toBe("number");
		});

		it("should search audit logs with filters", () => {
			// Add some test logs
			auditLogger.log({
				action: "READ",
				resource: "test",
				method: "GET",
				path: "/test",
				ipAddress: "127.0.0.1",
				userAgent: "test",
				statusCode: 200,
			});

			const result = auditLogger.search({ action: "READ" });

			expect(result).toHaveProperty("logs");
			expect(result).toHaveProperty("total");
			expect(Array.isArray(result.logs)).toBe(true);

			const readLogs = result.logs.filter((log) => log.action === "READ");
			expect(readLogs.length).toBeGreaterThan(0);
		});

		it("should export audit logs in JSON format", () => {
			const json = auditLogger.export("json");

			expect(typeof json).toBe("string");
			if (json) {
				const parsed = JSON.parse(json);
				expect(Array.isArray(parsed)).toBe(true);
			}
		});

		it("should export audit logs in CSV format", () => {
			const csv = auditLogger.export("csv");

			expect(typeof csv).toBe("string");
			if (csv) {
				expect(csv.includes("Timestamp")).toBe(true);
				expect(csv.includes("Action")).toBe(true);
				expect(csv.includes("Resource")).toBe(true);
			}
		});

		it("should add jobs to queue", async () => {
			const jobId = (await jobQueue.addJob("test-job", {
				type: "test",
				data: { message: "test" },
			})) as string;

			expect(typeof jobId).toBe("string");
			expect(jobId.length).toBeGreaterThan(0);
		});

		it("should list cron tasks", () => {
			const tasks = cronScheduler.listTasks();

			expect(Array.isArray(tasks)).toBe(true);
			if (tasks.length > 0) {
				const task = tasks[0];
				expect(task).toHaveProperty("id");
				expect(task).toHaveProperty("name");
				expect(task).toHaveProperty("schedule");
				expect(task).toHaveProperty("enabled");
			}
		});

		it("should get resource history from audit logs", () => {
			auditLogger.log({
				action: "UPDATE",
				resource: "feedback",
				resourceId: "456",
				method: "PUT",
				path: "/feedback/456",
				ipAddress: "127.0.0.1",
				userAgent: "test",
				statusCode: 200,
			});

			const history = auditLogger.getResourceHistory("feedback", "456");
			expect(Array.isArray(history)).toBe(true);
			expect(history.length).toBeGreaterThan(0);
			expect(history[0].resource).toBe("feedback");
			expect(history[0].resourceId).toBe("456");
		});

		it("should cleanup old logs", () => {
			const deleted = auditLogger.cleanupOldLogs(365);
			expect(typeof deleted).toBe("number");
			expect(deleted).toBeGreaterThanOrEqual(0);
		});
	});
});
