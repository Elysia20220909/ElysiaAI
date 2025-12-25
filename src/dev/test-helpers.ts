/**
 * Test Helpers
 * Development test data generation and assertions
 */

import { randomUUID } from "node:crypto";
import * as db from "../lib/database-utils";

export const testDataGenerator = {
	// User test data generation
	createTestUser: async (
		username = `test_${Date.now()}`,
		password = "test123456",
	) => {
		return await db.createUser(username, password, "user");
	},

	// Chat session test data generation
	createTestSession: async (userId?: string, mode = "normal") => {
		return await db.createChatSession(userId, mode);
	},

	// Message test data generation
	createTestMessages: async (sessionId: string, count = 3) => {
		const messages = [];
		for (let i = 0; i < count; i++) {
			await db.saveMessage(
				sessionId,
				i % 2 === 0 ? "user" : "assistant",
				`Test message ${i + 1}`,
			);
			messages.push(`Message ${i + 1}`);
		}
		return messages;
	},

	// Feedback test data generation
	createTestFeedback: async (count = 5) => {
		const feedbacks = [];
		for (let i = 0; i < count; i++) {
			await db.saveFeedback(
				`Test query ${i + 1}`,
				`Test answer ${i + 1}`,
				i % 2 === 0 ? "up" : "down",
			);
			feedbacks.push(`Feedback ${i + 1}`);
		}
		return feedbacks;
	},

	// Knowledge base test data generation
	createTestKnowledge: async (count = 3) => {
		const knowledge = [];
		for (let i = 0; i < count; i++) {
			await db.addKnowledgeBase(`Test content ${i + 1}`, `topic-${i + 1}`);
			knowledge.push(`Knowledge ${i + 1}`);
		}
		return knowledge;
	},
};

export const assert = {
	assertEquals: (
		actual: unknown,
		expected: unknown,
		message?: string,
	): void => {
		if (actual !== expected) {
			throw new Error(
				`Assertion failed: ${message || ""}\nExpected: ${expected}\nActual: ${actual}`,
			);
		}
	},

	assertNotNull: (value: unknown, message?: string): void => {
		if (value === null || value === undefined) {
			throw new Error(
				`Assertion failed: ${message || ""} - value is null or undefined`,
			);
		}
	},

	assertTrue: (value: boolean, message?: string): void => {
		if (value !== true) {
			throw new Error(`Assertion failed: ${message || ""} - value is not true`);
		}
	},

	assertFalse: (value: boolean, message?: string): void => {
		if (value !== false) {
			throw new Error(
				`Assertion failed: ${message || ""} - value is not false`,
			);
		}
	},

	assertGreaterThan: (
		actual: number,
		expected: number,
		message?: string,
	): void => {
		if (actual <= expected) {
			throw new Error(
				`Assertion failed: ${message || ""}\n${actual} > ${expected}`,
			);
		}
	},

	assertThrows: async (
		fn: () => Promise<void>,
		message?: string,
	): Promise<void> => {
		try {
			await fn();
			throw new Error(
				`Assertion failed: ${message || ""} - no error was thrown`,
			);
		} catch (error) {
			// Expected
		}
	},
};
