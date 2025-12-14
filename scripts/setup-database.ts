#!/usr/bin/env bun
/**
 * SQLite Database Setup Script
 * Direct SQLite initialization without Prisma dependency
 */

import "dotenv/config";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || "./prisma/dev.db";

console.log("SQLite database setup started...\n");
console.log(`Database path: ${DB_PATH}\n`);

try {
	// Check directory
	const dbDir = dirname(DB_PATH);
	if (!existsSync(dbDir)) {
		console.log(`Creating directory: ${dbDir}`);
		mkdirSync(dbDir, { recursive: true });
	}

	// Connect to SQLite database
	const db = new Database(DB_PATH);

	console.log("Database connected successfully\n");
	console.log("Initializing tables...");

	// テーブル作成
	const tables = [
		{
			name: "users",
			sql: `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME
      )`,
		},
		{
			name: "refresh_tokens",
			sql: `CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`,
		},
		{
			name: "chat_sessions",
			sql: `CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        mode TEXT DEFAULT 'normal',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )`,
		},
		{
			name: "messages",
			sql: `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )`,
		},
		{
			name: "feedbacks",
			sql: `CREATE TABLE IF NOT EXISTS feedbacks (
        id TEXT PRIMARY KEY,
        userId TEXT,
        query TEXT NOT NULL,
        answer TEXT NOT NULL,
        rating TEXT NOT NULL,
        reason TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )`,
		},
		{
			name: "knowledge_base",
			sql: `CREATE TABLE IF NOT EXISTS knowledge_base (
        id TEXT PRIMARY KEY,
        userId TEXT,
        content TEXT NOT NULL,
        topic TEXT,
        verified BOOLEAN DEFAULT false,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )`,
		},
		{
			name: "voice_logs",
			sql: `CREATE TABLE IF NOT EXISTS voice_logs (
        id TEXT PRIMARY KEY,
        username TEXT,
        voiceText TEXT NOT NULL,
        language TEXT DEFAULT 'ja',
        synthesisType TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
		},
	];

	for (const table of tables) {
		db.exec(table.sql);
		console.log(`  Created: ${table.name}`);
	}

	console.log("\nTable creation completed\n");

	// Table statistics
	console.log("Table statistics:\n");
	for (const table of tables) {
		const query = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`);
		const result = query.get() as { count: number };
		console.log(`  ${table.name}: ${result.count} records`);
	}

	db.close();

	console.log("\nSetup completed!");
	console.log("SQLite database is ready to use.\n");
} catch (error: unknown) {
	console.error("Error:", error instanceof Error ? error.message : error);
	process.exit(1);
}
