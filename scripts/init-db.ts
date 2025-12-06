/**
 * Database Initialization Script
 * Create tables based on Prisma schema
 */
import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";

const prisma = new PrismaClient({
	log: ["query", "error", "warn"],
	// @ts-expect-error - Prisma 7 datasourceUrl option
	datasourceUrl: dbUrl,
});

async function main() {
	console.log("Initializing database...");

	try {
		// Create tables using Prisma Client $executeRaw
		await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

		await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

		await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        mode TEXT DEFAULT 'normal',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

		await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );
    `);

		await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        answer TEXT NOT NULL,
        rating TEXT NOT NULL,
        userId TEXT,
        comment TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

		await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding TEXT,
        metadata TEXT,
        verified INTEGER DEFAULT 1,
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

		await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS voice_logs (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        text TEXT NOT NULL,
        language TEXT DEFAULT 'ja',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

		console.log("Table creation completed");

		// Create indexes
		await prisma.$executeRawUnsafe(
			"CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId ON refresh_tokens(userId);",
		);
		await prisma.$executeRawUnsafe(
			"CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);",
		);
		await prisma.$executeRawUnsafe(
			"CREATE INDEX IF NOT EXISTS idx_chat_sessions_userId ON chat_sessions(userId);",
		);
		await prisma.$executeRawUnsafe(
			"CREATE INDEX IF NOT EXISTS idx_messages_sessionId ON messages(sessionId);",
		);
		await prisma.$executeRawUnsafe(
			"CREATE INDEX IF NOT EXISTS idx_feedbacks_userId ON feedbacks(userId);",
		);

		console.log("Index creation completed");

		// Verify table count
		const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
			"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
		);

		console.log(`Created tables: ${tables.map((t) => t.name).join(", ")}`);
		console.log(`Total: ${tables.length} tables`);

		// Verify data count
		const userCount = await prisma.user.count();
		const sessionCount = await prisma.chatSession.count();
		const messageCount = await prisma.message.count();
		const feedbackCount = await prisma.feedback.count();
		const knowledgeCount = await prisma.knowledgeBase.count();

		console.log("\n=== Database Statistics ===");
		console.log(`Users: ${userCount}`);
		console.log(`Chat Sessions: ${sessionCount}`);
		console.log(`Messages: ${messageCount}`);
		console.log(`Feedbacks: ${feedbackCount}`);
		console.log(`Knowledge Base: ${knowledgeCount}`);

		console.log("\nDatabase setup completed successfully!");
	} catch (error) {
		console.error("Error during initialization:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
