/**
 * Prisma Database Integration Tests
 * Verification tests for database operations
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
	authenticateUser,
	clearTestData,
	createChatSession,
	createUser,
	disconnect,
	getFeedbackStats,
	prisma,
	saveFeedback,
	saveMessage,
} from "../packages/server/src/lib/database-utils";

// ========== Test Suite ==========

describe("Prisma Database Integration Tests", () => {
	beforeAll(async () => {
		// Clear test data
		await clearTestData();
		console.log("✅ Test data cleared");
	});

	afterAll(async () => {
		console.log("✅ Test cleanup complete");
	});

	// ========== Authentication Tests ==========

	it("User Creation: Should create a new user", async () => {
		const user = await createUser("testuser", "password123");
		expect(user.username).toBe("testuser");
		expect(user.role).toBe("user");
	});

	it("Authentication: Success with correct password", async () => {
		await createUser("authtest", "correctpass");
		const user = await authenticateUser("authtest", "correctpass");
		expect(user).toBeTruthy();
		expect(user?.username).toBe("authtest");
	});

	it("Authentication: Failure with wrong password", async () => {
		await createUser("secureuser", "securepass");
		const user = await authenticateUser("secureuser", "wrongpass");
		expect(user).toBeNull();
	});

	// ========== Chat Functionality Tests ==========

	it("Chat: Create Session", async () => {
		const session = await createChatSession(undefined, "sweet");
		expect(session.id).toBeTruthy();
		expect(session.mode).toBe("sweet");
	});

	it("Chat: Save Message", async () => {
		const session = await createChatSession(undefined, "normal");
		await saveMessage(session.id, "user", "Hello");

		expect(session.id).toBeTruthy();
	});

	it("Chat: Save Multiple Messages", async () => {
		const session = await createChatSession();
		await saveMessage(session.id, "user", "Hello");
		await saveMessage(session.id, "assistant", "Hello there!");
		await saveMessage(session.id, "user", "What is your name?");
		await saveMessage(session.id, "assistant", "I am Elysia ♪");

		expect(session.id).toBeTruthy();
	});

	// ========== Feedback Functionality Tests ==========

	it("Feedback: Save positive rating", async () => {
		const feedback = await saveFeedback(
			"Who is Elysia?",
			"An AI character",
			"up",
		);

		expect(feedback.rating).toBe("up");
	});

	it("Feedback: Save negative rating", async () => {
		const feedback = await saveFeedback(
			"質問",
			"回答",
			"down",
			undefined,
			"Incorrect",
		);
		expect(feedback.rating).toBe("down");
		expect(feedback.reason).toBe("Incorrect");
	});

	it("Feedback: Get statistics", async () => {
		// 複数のフィードバック保存
		await saveFeedback("q1", "a1", "up");
		await saveFeedback("q2", "a2", "up");
		await saveFeedback("q3", "a3", "down");

		// 統計取得
		const stats = await getFeedbackStats();
		expect(stats.total).toBeGreaterThanOrEqual(3);
		expect(stats.upRate).toBeGreaterThan(0);
	});
});

describe("Database Health Checks", () => {
	it("Database connection check", async () => {
		const result = await prisma.$queryRaw`SELECT 1`;
		expect(result).toBeDefined();
	});

	it("Table existence check", async () => {
		const tables = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `;

		const tableNames = tables.map((t: { name: string }) => t.name);
		expect(tableNames).toContain("users");
		expect(tableNames).toContain("messages");
		expect(tableNames).toContain("feedbacks");
	});

	afterAll(async () => {
		await disconnect();
	});
});
