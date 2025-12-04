/**
 * データベース初期化スクリプト
 * Prisma スキーマに基づいてテーブルを作成
 */
import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";

const prisma = new PrismaClient({
	log: ["query", "error", "warn"],
	// @ts-ignore - Prisma 7 datasourceUrl オプション
	datasourceUrl: dbUrl,
});

async function main() {
	console.log("🔧 データベース初期化中...");

	try {
		// テーブル作成（Prisma Client の $executeRaw を使用）
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
        token TEXT UNIQUE NOT NULL,
        userId TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        revoked INTEGER DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

		await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        mode TEXT DEFAULT 'normal',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
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
        userId TEXT,
        query TEXT NOT NULL,
        answer TEXT NOT NULL,
        rating TEXT NOT NULL,
        reason TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

		await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id TEXT PRIMARY KEY,
        userId TEXT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        source TEXT,
        verified INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

		await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS voice_logs (
        id TEXT PRIMARY KEY,
        username TEXT,
        text TEXT NOT NULL,
        emotion TEXT NOT NULL,
        audioUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

		// インデックス作成
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId ON refresh_tokens(userId);`,
		);
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);`,
		);
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_chat_sessions_userId ON chat_sessions(userId);`,
		);
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_messages_sessionId ON messages(sessionId);`,
		);
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_feedbacks_userId ON feedbacks(userId);`,
		);
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON feedbacks(rating);`,
		);
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_feedbacks_createdAt ON feedbacks(createdAt);`,
		);
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_knowledge_base_userId ON knowledge_base(userId);`,
		);
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_knowledge_base_verified ON knowledge_base(verified);`,
		);
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_voice_logs_username ON voice_logs(username);`,
		);
		await prisma.$executeRawUnsafe(
			`CREATE INDEX IF NOT EXISTS idx_voice_logs_createdAt ON voice_logs(createdAt);`,
		);

		console.log("✅ データベース初期化完了");
		console.log("📊 作成されたテーブル:");
		console.log("  - users");
		console.log("  - refresh_tokens");
		console.log("  - chat_sessions");
		console.log("  - messages");
		console.log("  - feedbacks");
		console.log("  - knowledge_base");
		console.log("  - voice_logs");
	} catch (error) {
		console.error("❌ データベース初期化エラー:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
