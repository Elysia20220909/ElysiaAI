import { PrismaClient } from "@prisma/client";

// Prisma 7: 設定ファイルから自動読み込み
const prisma = new PrismaClient({});

async function checkDatabase() {
	try {
		console.log("🔍 Checking database tables...\n");

		// Get all tables
		const tables = await prisma.$queryRaw<
			Array<{ name: string }>
		>`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`;

		console.log("📊 Tables:", tables.map((t) => t.name).join(", "));
		console.log(`\n✅ Total: ${tables.length} tables\n`);

		// Count records in each table
		const userCount = await prisma.user.count();
		const sessionCount = await prisma.chatSession.count();
		const messageCount = await prisma.message.count();
		const feedbackCount = await prisma.feedback.count();
		const knowledgeCount = await prisma.knowledgeBase.count();
		const voiceCount = await prisma.voiceLog.count();

		console.log("📈 Record counts:");
		console.log(`  Users: ${userCount}`);
		console.log(`  Chat Sessions: ${sessionCount}`);
		console.log(`  Messages: ${messageCount}`);
		console.log(`  Feedbacks: ${feedbackCount}`);
		console.log(`  Knowledge Base: ${knowledgeCount}`);
		console.log(`  Voice Logs: ${voiceCount}`);

		await prisma.$disconnect();
	} catch (error) {
		console.error("❌ Error:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
}

checkDatabase();
