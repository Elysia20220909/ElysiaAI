#!/usr/bin/env bun

/**
 * Prisma SQLite Initialization Script
 * Database creation, table creation, migration execution
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function log(level: string, message: string): void {
	const timestamp = new Date().toISOString().substring(11, 19);
	console.log(`[${timestamp}] ${level} ${message}`);
}

async function main(): Promise<void> {
	try {
		log("INFO", "Prisma SQLite initialization started");

		// Check environment variables
		const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
		log("INFO", `Database: ${dbUrl}`);

		// Check Prisma directory
		const prismaDir = path.join(process.cwd(), "prisma");
		if (!existsSync(prismaDir)) {
			log("WARN", "Prisma directory not found, creating...");
			mkdirSync(prismaDir, { recursive: true });
		}

		// Check database file
		const dbPath = dbUrl.replace("file:", "");
		if (existsSync(dbPath)) {
			log("INFO", "Database file exists, skipping creation");
		} else {
			log("INFO", "Database file does not exist, creating...");
		}

		// Generate Prisma Client
		log("INFO", "Generating Prisma Client...");
		execSync("bun prisma generate", { stdio: "inherit" });

		// Create/update database schema
		log("INFO", "Applying database schema...");
		execSync("bun prisma db push --skip-generate", { stdio: "inherit" });

		// Connection test
		log("INFO", "Testing database connection...");
		await prisma.$connect();
		log("INFO", "Database connection succeeded");

		// Check tables
		const tables = await prisma.$queryRaw<
			Array<{ name: string }>
		>`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`;
		log("INFO", `Tables: ${tables.map((t) => t.name).join(", ")}`);

		// Verify record counts
		const userCount = await prisma.user.count();
		const sessionCount = await prisma.chatSession.count();
		const messageCount = await prisma.message.count();

		log("INFO", "=== Database Statistics ===");
		log("INFO", `Users: ${userCount}`);
		log("INFO", `Sessions: ${sessionCount}`);
		log("INFO", `Messages: ${messageCount}`);

		log("INFO", "Prisma SQLite initialization completed");
		process.exit(0);
	} catch (error) {
		log("ERROR", `Initialization failed: ${String(error)}`);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
