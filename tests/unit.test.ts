// Unit Tests for Library Modules
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { CacheManager } from "../src/lib/cache";
import { logger } from "../src/lib/logger";
import { metricsCollector } from "../src/lib/metrics";

describe("Metrics Collector", () => {
	it("should increment request counter", () => {
		metricsCollector.incrementRequest("GET", "/test", 200);
		const metrics = metricsCollector.getMetrics();
		expect(metrics.http_requests_total.get("GET:/test:200")).toBeGreaterThan(0);
	});

	it("should record request duration", () => {
		metricsCollector.recordRequestDuration("GET", "/test", 0.123);
		const metrics = metricsCollector.getMetrics();
		const durations = metrics.http_request_duration_seconds.get("GET:/test");
		expect(durations).toBeDefined();
		if (durations) {
			expect(durations.length).toBeGreaterThan(0);
		}
	});

	it("should increment error counter", () => {
		metricsCollector.incrementError("POST", "/api", "validation");
		const metrics = metricsCollector.getMetrics();
		expect(metrics.http_errors_total.get("POST:/api:validation")).toBeGreaterThan(0);
	});

	it("should track active connections", () => {
		const before = metricsCollector.getMetrics().active_connections;
		metricsCollector.incrementConnections();
		const after = metricsCollector.getMetrics().active_connections;
		expect(after).toBe(before + 1);

		metricsCollector.decrementConnections();
		const final = metricsCollector.getMetrics().active_connections;
		expect(final).toBe(before);
	});

	it("should generate Prometheus format", () => {
		const prometheus = metricsCollector.toPrometheusFormat();
		expect(prometheus).toContain("# HELP");
		expect(prometheus).toContain("# TYPE");
		expect(prometheus).toContain("http_requests_total");
		expect(prometheus).toContain("process_uptime_seconds");
	});
});

describe("Logger", () => {
	it("should log info messages", () => {
		expect(() => logger.info("Test info message")).not.toThrow();
	});

	it("should log with context", () => {
		expect(() => logger.info("Test with context", { userId: "123", action: "test" })).not.toThrow();
	});

	it("should log errors with stack trace", () => {
		const error = new Error("Test error");
		expect(() => logger.error("Error occurred", error)).not.toThrow();
	});

	it("should log HTTP requests", () => {
		expect(() =>
			logger.logRequest("GET", "/test", 200, 123.45, "127.0.0.1", "user123"),
		).not.toThrow();
	});
});

describe("Cache Manager", () => {
	let cache: CacheManager;

	beforeAll(() => {
		cache = new CacheManager("redis://localhost:6379", 60, "test");
	});

	afterAll(async () => {
		await cache.flushNamespace("test");
		await cache.close();
	});

	it("should set and get value", async () => {
		await cache.set("test-key", { data: "test" });
		const value = await cache.get<{ data: string }>("test-key");
		expect(value).toEqual({ data: "test" });
	});

	it("should return null for non-existent key", async () => {
		const value = await cache.get("non-existent");
		expect(value).toBeNull();
	});

	it("should delete key", async () => {
		await cache.set("delete-test", "value");
		await cache.del("delete-test");
		const value = await cache.get("delete-test");
		expect(value).toBeNull();
	});

	it("should check if key exists", async () => {
		await cache.set("exists-test", "value");
		const exists = await cache.exists("exists-test");
		expect(exists).toBe(true);

		const notExists = await cache.exists("not-exists");
		expect(notExists).toBe(false);
	});

	it("should respect TTL", async () => {
		await cache.set("ttl-test", "value", { ttl: 1 });
		const immediate = await cache.get("ttl-test");
		expect(immediate).toBe("value");

		await new Promise((resolve) => setTimeout(resolve, 1500));
		const expired = await cache.get("ttl-test");
		expect(expired).toBeNull();
	});

	it("should increment counter", async () => {
		const count1 = await cache.incr("counter-test");
		const count2 = await cache.incr("counter-test");
		expect(count2).toBe(count1 + 1);
	});

	it("should use getOrSet pattern", async () => {
		const computeFn = async () => ({ computed: true });
		const value = await cache.getOrSet("compute-test", computeFn);
		expect(value).toEqual({ computed: true });

		// Second call should return cached value without calling compute
		const cached = await cache.getOrSet("compute-test", async () => ({
			computed: false,
		}));
		expect(cached).toEqual({ computed: true });
	});

	it("should invalidate by pattern", async () => {
		await cache.set("pattern-1", "value1");
		await cache.set("pattern-2", "value2");
		await cache.set("pattern-3", "value3");

		const count = await cache.invalidatePattern("pattern-*");
		expect(count).toBeGreaterThanOrEqual(3);
	});
});
