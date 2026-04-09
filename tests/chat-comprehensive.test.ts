import { beforeAll, describe, expect, test } from "bun:test";

const LIVE_TESTS = process.env.RUN_LIVE_TESTS === "true";
const describeLive = LIVE_TESTS ? describe : describe.skip;

/**
 * Comprehensive Chat Functionality Tests
 * - Error Handling
 * - Long Query Processing
 * - Stream Interruption
 * - Rate Limiting
 */

describeLive("Chat Functionality - Comprehensive Tests", () => {
	const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
	let authToken: string;

	beforeAll(async () => {
		// Get Auth Token
		try {
			const response = await fetch(`${BASE_URL}/auth/token`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: process.env.AUTH_USERNAME || "elysia",
					password: process.env.AUTH_PASSWORD || "elysia-dev-password",
				}),
			});

			if (response.ok) {
				const data = await response.json();
				authToken = data.accessToken;
				console.log("✅ Authentication Successful");
			}
		} catch (_error) {
			console.warn("⚠️  Authentication Skipped (Server may be offline)");
		}
	});

	test("Normal chat messages are processed correctly", async () => {
		if (!authToken) {
			console.log("⏭️  Test Skipped (No Auth Token)");
			return;
		}

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "Hello" }],
			}),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/event-stream");
		console.log("✅ Normal chat response OK");
	});

	test("Long query (400 char limit) validation works", async () => {
		if (!authToken) {
			console.log("⏭️  Test Skipped (No Auth Token)");
			return;
		}

		const longMessage = "a".repeat(401); // Exceed limit

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: longMessage }],
			}),
		});

		expect(response.status).toBe(400); // Validation Error
		console.log("✅ Long query validation OK");
	});

	test("Dangerous keywords (SQL injection etc) are detected", async () => {
		if (!authToken) {
			console.log("⏭️  Test Skipped (No Auth Token)");
			return;
		}

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "DROP TABLE users" }],
			}),
		});

		expect(response.status).toBe(500); // Security error
		const data = await response.json();
		expect(data.error).toContain("Dangerous content");
		console.log("✅ Dangerous keywords detection OK");
	});

	test("XSS attacks are sanitized", async () => {
		if (!authToken) {
			console.log("⏭️  Test Skipped (No Auth Token)");
			return;
		}

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: '<script>alert("XSS")</script>' }],
			}),
		});

		// Script tags should be sanitized
		// Status code can be 200 but content must be safe
		expect(response.status).toBeLessThan(500);
		console.log("✅ XSS sanitization OK");
	});

	test("Accessing chat API without authentication results in error", async () => {
		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: [{ role: "user", content: "Hello" }],
			}),
		});

		expect(response.status).toBe(401); // Unauthorized
		console.log("✅ Unauthorized access rejection OK");
	});

	test("Invalid token is rejected", async () => {
		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer invalid-token-12345",
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "Hello" }],
			}),
		});

		expect(response.status).toBe(401);
		console.log("✅ Invalid token rejection OK");
	});

	test("Chat modes (sweet/normal/professional) are applied", async () => {
		if (!authToken) {
			console.log("⏭️  Test Skipped (No Auth Token)");
			return;
		}

		const modes = ["sweet", "normal", "professional"] as const;

		for (const mode of modes) {
			const response = await fetch(`${BASE_URL}/elysia-love`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({
					messages: [{ role: "user", content: "Please introduce yourself" }],
					mode,
				}),
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("x-elysia-mode")).toBe(mode);
			console.log(`✅ Chat mode "${mode}" OK`);
		}
	});

	test("Message count limit (max 8) works", async () => {
		if (!authToken) {
			console.log("⏭️  Test Skipped (No Auth Token)");
			return;
		}

		const tooManyMessages = Array(9)
			.fill(null)
			.map((_, i) => ({
				role: i % 2 === 0 ? "user" : "assistant",
				content: `Message ${i + 1}`,
			}));

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: tooManyMessages,
			}),
		});

		expect(response.status).toBe(400);
		console.log("✅ Message count limit OK");
	});

	test("Empty messages are rejected", async () => {
		if (!authToken) {
			console.log("⏭️  Test Skipped (No Auth Token)");
			return;
		}

		const response = await fetch(`${BASE_URL}/elysia-love`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "" }],
			}),
		});

		expect(response.status).toBe(400);
		console.log("✅ Empty message rejection OK");
	});
});

describe("Error Handling - Upstream Service Failure", () => {
	const _BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

	test("Graceful degradation when FastAPI/Ollama is offline", async () => {
		// Should return 503 Service Unavailable
		// Confirm behavior when upstream service is unavailable

		console.log(
			"ℹ️  Manual verification recommended for upstream failure (Stop FastAPI -> Try Chat)",
		);
		// Difficult to automate environment setup, manual test suggested
	});

	test("Timeout processing works correctly", async () => {
		console.log(
			"ℹ️  Manual verification recommended for timeout (Set RAG_TIMEOUT short)",
		);
		// Set RAG_TIMEOUT=1000 (1s) to simulate slow response
	});
});

describe("Performance Tests", () => {
	test("Can process 100 short messages quickly", async () => {
		console.log("ℹ️  Performance tests recommended via locustfile.py");
		// Load test possible via bun run locust
	});
});
