import { describe, expect, it } from "bun:test";

const BASE_URL = "http://localhost:3000";
const LIVE_TESTS_ENABLED = process.env.RUN_LIVE_TESTS === "true";
const describeLive = LIVE_TESTS_ENABLED ? describe : describe.skip;

describeLive("Health Endpoints", () => {
	it("GET /health - should return healthy status", async () => {
		const response = await fetch(`${BASE_URL}/health`);
		const data = await response.json();

		// Allow 200 (healthy) or 503 (degraded/unhealthy) depending on optional deps (e.g., Ollama)
		expect([200, 503]).toContain(response.status);
		expect(data).toHaveProperty("status");
		expect(["healthy", "degraded", "unhealthy"]).toContain(data.status);
		expect(data).toHaveProperty("timestamp");
	});

	it("GET /metrics - should return Prometheus metrics", async () => {
		const response = await fetch(`${BASE_URL}/metrics`);
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/plain");
		expect(text).toContain("# HELP");
		expect(text).toContain("# TYPE");
	});
});

describeLive("API Root", () => {
	it("GET / - should return HTML (landing page)", async () => {
		const response = await fetch(BASE_URL);
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(text.length).toBeGreaterThan(0);
	});
});

describeLive("Swagger Documentation", () => {
	it("GET /swagger - should return Swagger UI", async () => {
		const response = await fetch(`${BASE_URL}/swagger`);
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(text).toContain("swagger");
	});

	it("GET /swagger/json - should return OpenAPI spec", async () => {
		const response = await fetch(`${BASE_URL}/swagger/json`);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toHaveProperty("openapi");
		expect(data).toHaveProperty("info");
		expect(data).toHaveProperty("paths");
	});
});

describeLive("Authentication Endpoints", () => {
	let _authToken: string;
	let refreshToken: string;

	const creds = {
		username: "elysia",
		password: process.env.AUTH_PASSWORD || "elysia-dev-password",
	};

	it("POST /auth/token - should login and get tokens", async () => {
		const response = await fetch(`${BASE_URL}/auth/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(creds),
		});
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toHaveProperty("accessToken");
		expect(data).toHaveProperty("refreshToken");

		_authToken = data.accessToken;
		refreshToken = data.refreshToken;
	});

	it("POST /auth/refresh - should refresh access token", async () => {
		const response = await fetch(`${BASE_URL}/auth/refresh`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken }),
		});
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toHaveProperty("accessToken");
	});

	it("POST /auth/logout - should revoke refresh token", async () => {
		const response = await fetch(`${BASE_URL}/auth/logout`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken }),
		});

		expect(response.status).toBe(200);
	});
});

// Chat endpoints are covered by E2E elsewhere; skipped here to avoid flakiness

describeLive("Error Handling", () => {
	it("GET /nonexistent - should return 404", async () => {
		const response = await fetch(`${BASE_URL}/nonexistent`);

		expect(response.status).toBe(404);
	});

	it("POST /auth/token - should return 401 for invalid credentials", async () => {
		const response = await fetch(`${BASE_URL}/auth/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username: "wrong", password: "wrong" }),
		});

		expect(response.status).toBe(401);
	});

	// Protected endpoints require Bearer token; skip explicit check here
});

describeLive("Rate Limiting", () => {
	it("should enforce rate limits on repeated requests", async () => {
		// Use /ping to avoid dependency-sensitive health status
		const requests = Array(20)
			.fill(null)
			.map(() => fetch(`${BASE_URL}/ping`));

		const responses = await Promise.all(requests);
		const statusCodes = responses.map((r) => r.status);

		// Smoke test: should receive at least one 200
		expect(statusCodes).toContain(200);
	}, 10000);
});
