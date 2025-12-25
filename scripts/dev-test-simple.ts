#!/usr/bin/env bun
/**
 * Personal Development Integration Test (Simple Version)
 * Full feature test execution - Character encoding fixed
 */

import "dotenv/config";
import { devLogger } from "../src/dev/dev-logger";
import { assert, testDataGenerator } from "../src/dev/test-helpers";
import * as db from "../src/lib/database-utils";

async function runTests() {
	devLogger.info("Development integration test started\n");

	let passed = 0;
	let failed = 0;

	try {
		// Test 1: User operations
		try {
			devLogger.info("Test 1: User operations");
			const user = await testDataGenerator.createTestUser();
			assert.assertNotNull(user.id);
			devLogger.info("Test 1 PASSED");
			passed++;
		} catch (e) {
			devLogger.error("Test 1 FAILED", { error: String(e) });
			failed++;
		}

		// Test 2: Chat session
		try {
			devLogger.info("Test 2: Chat session");
			const session = await testDataGenerator.createTestSession();
			assert.assertNotNull(session.id);
			devLogger.info("Test 2 PASSED");
			passed++;
		} catch (e) {
			devLogger.error("Test 2 FAILED", { error: String(e) });
			failed++;
		}

		// Test 3: Message save
		try {
			devLogger.info("Test 3: Message save");
			const session = await testDataGenerator.createTestSession();
			await testDataGenerator.createTestMessages(session.id, 3);
			devLogger.info("Test 3 PASSED");
			passed++;
		} catch (e) {
			devLogger.error("Test 3 FAILED", { error: String(e) });
			failed++;
		}

		// Test 4: Feedback
		try {
			devLogger.info("Test 4: Feedback");
			await testDataGenerator.createTestFeedback(5);
			const stats = await db.getFeedbackStats();
			assert.assertGreaterThan(stats.total, 0);
			devLogger.info("Test 4 PASSED");
			passed++;
		} catch (e) {
			devLogger.error("Test 4 FAILED", { error: String(e) });
			failed++;
		}

		// Test 5: Knowledge base
		try {
			devLogger.info("Test 5: Knowledge base");
			await testDataGenerator.createTestKnowledge(3);
			const knowledge = await db.getVerifiedKnowledgeBase(10);
			assert.assertGreaterThan(knowledge.length, 0);
			devLogger.info("Test 5 PASSED");
			passed++;
		} catch (e) {
			devLogger.error("Test 5 FAILED", { error: String(e) });
			failed++;
		}

		// Test 6: User authentication
		try {
			devLogger.info("Test 6: User authentication");
			const user = await testDataGenerator.createTestUser(
				`auth_test_${Date.now()}`,
			);
			const auth = await db.authenticateUser(user.username, "test123456");
			assert.assertNotNull(auth);
			devLogger.info("Test 6 PASSED");
			passed++;
		} catch (e) {
			devLogger.error("Test 6 FAILED", { error: String(e) });
			failed++;
		}

		// Test 7: Get all users
		try {
			devLogger.info("Test 7: Get all users");
			const users = await db.getAllUsers();
			assert.assertGreaterThan(users.length, 0);
			devLogger.info("Test 7 PASSED");
			passed++;
		} catch (e) {
			devLogger.error("Test 7 FAILED", { error: String(e) });
			failed++;
		}

		// Test 8: Data cleanup
		try {
			devLogger.info("Test 8: Data cleanup");
			await db.clearTestData();
			devLogger.info("Test 8 PASSED");
			passed++;
		} catch (e) {
			devLogger.error("Test 8 FAILED", { error: String(e) });
			failed++;
		}

		// Display results
		console.log("\n=== Test Results ===");
		console.log(`Passed: ${passed}/${passed + failed}`);
		console.log(`Failed: ${failed}/${passed + failed}`);

		if (failed === 0) {
			console.log("\nAll tests passed successfully!");
		} else {
			console.log(`\n${failed} test(s) failed`);
			process.exit(1);
		}
	} catch (error) {
		devLogger.error("Fatal error", { error: String(error) });
		process.exit(1);
	}
}

// Run tests
runTests();
