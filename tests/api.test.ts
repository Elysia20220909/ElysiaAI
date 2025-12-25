// Comprehensive Test Suite - Unit Tests
import { beforeAll, describe, expect, it } from "bun:test";
import type app from "../src/index";

type App = typeof app;
const API_URL = "http://localhost:3000";
const LIVE_TESTS = process.env.RUN_LIVE_TESTS === "true";
const describeLive = LIVE_TESTS ? describe : describe.skip;

let _serverAvailable = true;

beforeAll(async () => {
	if (!LIVE_TESTS) return;
	try {
		const res = await fetch(`${API_URL}/ping`);
		if (!res.ok) _serverAvailable = false;
	} catch {
		_serverAvailable = false;
	}
});

describeLive("Health Endpoints", () => {
	it("should return OK for /ping", async () => {
		const response = await fetch(`${API_URL}/ping`);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.ok).toBe(true);
	});

	it("should return health status for /health", async () => {
		const response = await fetch(`${API_URL}/health`);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.status).toBeOneOf(["healthy", "degraded", "unhealthy"]);
		expect(data.uptime).toBeGreaterThan(0);
		expect(data.services).toBeDefined();
		expect(data.services.redis).toBeDefined();
		expect(data.services.fastapi).toBeDefined();
		expect(data.services.ollama).toBeDefined();
	});
});

describeLive("Metrics Endpoint", () => {
	it("should return Prometheus metrics", async () => {
		const response = await fetch(`${API_URL}/metrics`);
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/plain");
		expect(text).toContain("# HELP");
		expect(text).toContain("# TYPE");
		expect(text).toContain("http_requests_total");
	});
});

describeLive("Authentication", () => {
	let accessToken: string;
	let refreshToken: string;

	it("should reject invalid credentials", async () => {
		const response = await fetch(`${API_URL}/auth/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username: "invalid",
				password: "wrong",
			}),
		});

		expect(response.status).toBe(401);
		const data = await response.json();
		expect(data.error).toBe("Invalid credentials");
	});

	it("should issue tokens for valid credentials", async () => {
		const response = await fetch(`${API_URL}/auth/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username: "elysia",
				password: "elysia-dev-password",
			}),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.accessToken).toBeDefined();
		expect(data.refreshToken).toBeDefined();
		expect(data.expiresIn).toBe(900);

		accessToken = data.accessToken;
		refreshToken = data.refreshToken;
	});

	it("should refresh access token", async () => {
		const response = await fetch(`${API_URL}/auth/refresh`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken }),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.accessToken).toBeDefined();
		expect(data.expiresIn).toBe(900);
	});

	it("should reject requests without token", async () => {
		const response = await fetch(`${API_URL}/feedback`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				query: "test",
				answer: "test",
				rating: "up",
			}),
		});

		expect(response.status).toBe(401);
	});

	it("should accept requests with valid token", async () => {
		const response = await fetch(`${API_URL}/feedback`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				query: "test question",
				answer: "test answer",
				rating: "up",
			}),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.ok).toBe(true);
	});
});

describeLive("Input Validation", () => {
	let token: string;

	beforeAll(async () => {
		const response = await fetch(`${API_URL}/auth/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username: "elysia",
				password: "elysia-dev-password",
			}),
		});
		const data = await response.json();
		token = data.accessToken;
	});

	it("should reject too long queries", async () => {
		const response = await fetch(`${API_URL}/feedback`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				query: "a".repeat(500),
				answer: "test",
				rating: "up",
			}),
		});

		expect(response.status).toBe(400);
	});

	it("should reject invalid rating", async () => {
		const response = await fetch(`${API_URL}/feedback`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				query: "test",
				answer: "test",
				rating: "invalid",
			}),
		});

		expect(response.status).toBe(400);
	});
});

describeLive("Rate Limiting", () => {
	let token: string;

	beforeAll(async () => {
		const response = await fetch(`${API_URL}/auth/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username: "elysia",
				password: "elysia-dev-password",
			}),
		});
		const data = await response.json();
		token = data.accessToken;
	});

	it("should enforce rate limits", async () => {
		const requests = Array.from({ length: 70 }, () =>
			fetch(`${API_URL}/elysia-love`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					messages: [{ role: "user", content: "hello" }],
				}),
			}),
		);

		const responses = await Promise.all(requests);
		const rateLimited = responses.filter((r) => r.status === 429);

		expect(rateLimited.length).toBeGreaterThan(0);
	});
});

describeLive("Chat API", () => {
	let token: string;

	beforeAll(async () => {
		const response = await fetch(`${API_URL}/auth/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username: "elysia",
				password: "elysia-dev-password",
			}),
		});
		const data = await response.json();
		token = data.accessToken;
	});

	it("should accept valid chat request", async () => {
		const response = await fetch(`${API_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "こんにちは" }],
				mode: "sweet",
			}),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/event-stream");
	});

	it("should support different modes", async () => {
		for (const mode of ["sweet", "normal", "professional"]) {
			const response = await fetch(`${API_URL}/elysia-love`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					messages: [{ role: "user", content: "test" }],
					mode,
				}),
			});

			expect(response.status).toBe(200);
		}
	});
});

describeLive("Security Headers", () => {
	it("should include security headers", async () => {
		const response = await fetch(`${API_URL}/ping`);

		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("x-frame-options")).toBe("DENY");
	});
});
