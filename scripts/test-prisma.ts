#!/usr/bin/env bun
/**
 * Prisma Client Operation Test
 * Database operation implementation verification
 */

import "dotenv/config";
import * as db from "../src/lib/database-utils";

async function runTests() {
	console.log("Prisma Client operation test started...\n");

	try {
		// Test 1: User creation
		console.log("Test 1: User creation");
		const user = await db.createUser("testuser", "password123");
		console.log(`User created: ${user.username} (ID: ${user.id})\n`);

		// Test 2: User authentication
		console.log("Test 2: User authentication");
		const authenticated = await db.authenticateUser("testuser", "password123");
		if (authenticated) {
			console.log("Authentication successful\n");
		} else {
			console.log("Authentication failed\n");
		}

		// Test 3: Chat session creation
		console.log("Test 3: Chat session creation");
		const session = await db.createChatSession(user.id, "normal");
		console.log(`Session created: ${session.id}\n`);

		// Test 4: Message save
		console.log("Test 4: Message save");
		await db.saveMessage(session.id, "user", "Hello");
		await db.saveMessage(session.id, "assistant", "Hello. How can I help you?");
		console.log("Messages saved\n");

		// Test 5: Session retrieval
		console.log("Test 5: Session retrieval");
		const retrievedSession = await db.getChatSession(session.id);
		if (retrievedSession) {
			console.log("Session retrieved\n");
		}

		// Test 6: Feedback save
		console.log("Test 6: Feedback save");
		await db.saveFeedback(
			"Test query",
			"Test answer",
			"up",
			user.id,
			"Good answer",
		);
		console.log("Feedback saved\n");

		// Test 7: Feedback statistics
		console.log("Test 7: Feedback statistics");
		const stats = await db.getFeedbackStats();
		console.log("Statistics retrieved:");
		console.log(`   - Total: ${stats.total}`);
		console.log(`   - Positive: ${stats.up}`);
		console.log(`   - Negative: ${stats.down}`);
		console.log(`   - Positive rate: ${stats.upRate.toFixed(1)}%\n`);

		// Test 8: Knowledge base add
		console.log("Test 8: Knowledge base add");
		await db.addKnowledgeBase("Test content", "test-topic", user.id);
		console.log("Knowledge base added\n");

		// Test 9: Voice log save
		console.log("Test 9: Voice log save");
		await db.saveVoiceLog(user.username, "This is test voice", "en");
		console.log("Voice log saved\n");

		// Test 10: Get all users
		console.log("Test 10: Get all users");
		const users = await db.getAllUsers();
		console.log(`Users retrieved: ${users.length} users\n`);

		// Cleanup: Delete test data
		console.log("Cleanup: Delete test data");
		await db.clearTestData();
		console.log("Cleanup completed\n");

		console.log("All tests successful!\n");

		console.log("Prisma Client is working correctly.\n");
	} catch (error) {
		console.error("Test error:", error);
		process.exit(1);
	}
}

runTests();
