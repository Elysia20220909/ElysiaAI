#!/usr/bin/env bun
/**
 * Development Comprehensive Test Script
 * Full feature test execution
 */

import "dotenv/config";
import { debug, devLogger } from "../src/dev/dev-logger";
import { assert, testDataGenerator } from "../src/dev/test-helpers";
import * as db from "../src/lib/database-utils";

async function runTests() {
	devLogger.info("Development comprehensive test started\n");

	try {
		// Test 1: User operations
		devLogger.info("Test 1: User operations");
		const user = await testDataGenerator.createTestUser();
		assert.assertNotNull(user.id, "User ID generated");
		devLogger.debug(`  User created: ${user.username}`);

		// Test 2: Chat session
		devLogger.info("Test 2: Chat session operations");
		const session = await testDataGenerator.createTestSession(user.id);
		assert.assertNotNull(session.id, "Session ID generated");
		devLogger.debug(`  Session created: ${session.id}`);

		// Test 3: Message save
		devLogger.info("Test 3: Message save");
		await testDataGenerator.createTestMessages(session.id, 5);
		devLogger.debug("  5 test messages saved");

		// Test 4: Session retrieval
		devLogger.info("Test 4: Session retrieval");
		const retrievedSession = await db.getChatSession(session.id);
		assert.assertNotNull(retrievedSession, "Session retrieved");

		// Test 5: Feedback operations
		devLogger.info("Test 5: Feedback operations");
		await db.saveFeedback("Test query", "Test answer", "up", user.id, "Good");
		const stats = await db.getFeedbackStats();
		devLogger.debug(
			`  Feedback stats - Total: ${stats.total}, Positive rate: ${stats.upRate.toFixed(1)}%`,
		);

		// Test 6: Knowledge base
		devLogger.info("Test 6: Knowledge base operations");
		await db.addKnowledgeBase("Test content", "test-topic", user.id);
		const knowledge = await db.getVerifiedKnowledgeBase();
		assert.assertTrue(knowledge.length > 0, "Knowledge retrieved");

		// Test 7: Voice log
		devLogger.info("Test 7: Voice log operations");
		await db.saveVoiceLog(user.username, "Test voice text", "en");
		const voiceLogs = await db.getUserVoiceLogs(user.username);
		assert.assertTrue(voiceLogs.length > 0, "Voice logs retrieved");

		// Test 8: User authentication
		devLogger.info("Test 8: User authentication");
		const authenticated = await db.authenticateUser(user.username, "test123456");
		assert.assertTrue(authenticated !== null, "Authentication succeeded");

		// Test 9: Get all users
		devLogger.info("Test 9: Get all users");
		const users = await db.getAllUsers();
		assert.assertTrue(users.length > 0, "Users retrieved");

		// Test 10: Data cleanup
		devLogger.info("Test 10: Data cleanup");
		await db.clearTestData();
		devLogger.debug("  Test data cleared");

		devLogger.info("\nAll tests completed successfully!");

		// Test summary display
		console.log("\n=== Test Results ===");
		console.log("Passed: 10/10");
		console.log("Failed: 0/10");
		console.log("\nAll tests passed successfully!");
	} catch (error) {
		devLogger.error("Test error", {
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

// Execute tests
runTests()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.error("Test execution failed:", error);
		process.exit(1);
	});
