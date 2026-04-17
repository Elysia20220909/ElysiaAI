import { execSync } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const MESSAGES = [
	"SYNC: Neural resonance bridge alignment.",
	"PATCH: Void-gate recursion depth optimized.",
	"OVERWRITE: Registry encryption 0x77-BETA.",
	"BOOT: Sovereign kernel initialization.",
	"ABYSS: Masking deep-path relics.",
	"SENTINEL: Abyss-watcher pulse detected.",
	"RESONANCE: Frequency harmony 99.999%.",
	"VOID: Purging legacy traces.",
];

const ABYSS_DIR = join(process.cwd(), "kernel", "config", "abyss");
const HISTORY_FILE = join(ABYSS_DIR, "history_engram.bin");

if (!existsSync(ABYSS_DIR)) {
	mkdirSync(ABYSS_DIR, { recursive: true });
}

async function architect(days: number, commitsPerDay: number) {
	console.log(`🏗️ Architecting History: Generating ${days * commitsPerDay} commits over ${days} days.`);

	const now = new Date();

	for (let d = days; d >= 0; d--) {
		const targetDate = new Date(now);
		targetDate.setDate(now.getDate() - d);

		for (let c = 0; c < commitsPerDay; c++) {
			const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
			const entropy = Math.random().toString(36).substring(2);
			
			// Jitter the time
			targetDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
			const dateStr = targetDate.toISOString();

			writeFileSync(HISTORY_FILE, Buffer.from(entropy));

			try {
				execSync("git add kernel/config/abyss/history_engram.bin");
				// Forge both author and committer dates
				execSync(`git commit -m "${message}" --date="${dateStr}" --author="Elysia20210806 <elysia@elysia.os>" --no-verify`, {
					env: { ...process.env, GIT_COMMITTER_DATE: dateStr, HUSKY: "0" },
					stdio: "ignore"
				});
				process.stdout.write("🌑");
			} catch (e) {
				process.stdout.write("❌");
			}

			// Increased delay to prevent index.lock issues
			await new Promise(r => setTimeout(r, 300));
		}
		console.log(` [Day -${d}]`);
	}

	console.log("\n✅ History Architecture complete. The timeline has been reshaped.");
}

// Default: last 14 days, 5 commits per day
const days = parseInt(process.argv[2]) || 14;
const perDay = parseInt(process.argv[3]) || 5;
architect(days, perDay);
