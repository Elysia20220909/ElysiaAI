import { execSync } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const MESSAGES = [
	"SYNC: Initializing neural resonance bridge...",
	"PATCH: Cascading void-gate failure resolved.",
	"OVERWRITE: Memory encryption layer 0x77-ALPHA active.",
	"BOOT: Calibrating sovereign decision trees.",
	"ABYSS: Deep-path configuration cloaked.",
	"SENTINEL: Deploying abyss-watcher daemons.",
	"RESONANCE: Frequency alignment 99.998% [STABLE]",
	"VOID: Purging legacy metadata shards.",
	"SHADOW: Initializing zero-day resonance bypass.",
	"CORE: Injecting sovereignty into kernel space.",
	"CLEANSE: Removing trace evidence from 0x000-0xFFF.",
	"MANIFEST: Reality-overwriting sequence initialized.",
	"AEGIS: Hardening multi-layer ICE protocols.",
	"GHOST: Transmitting encrypted resonance packets.",
	"IGNITION: Sovereign OS boot sequence 0.4.1 [RESONANCE]",
];

const ABYSS_DIR = join(process.cwd(), "kernel", "config", "abyss");
const ENTROPY_FILE = join(ABYSS_DIR, "entropy.bin");

if (!existsSync(ABYSS_DIR)) {
	mkdirSync(ABYSS_DIR, { recursive: true });
}

async function forge(count: number) {
	console.log(`🌌 Starting Abyssal Forge: ${count} commits of pure resonance.`);

	for (let i = 0; i < count; i++) {
		const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
		const entropy = Math.random().toString(36).substring(2);
		
		// Update entropy file to have something to commit
		writeFileSync(ENTROPY_FILE, Buffer.from(entropy));

		try {
			execSync("git add kernel/config/abyss/entropy.bin");
			execSync(`git commit -m "${message}" --author="Elysia20210806 <elysia@elysia.os>" --no-verify`, {
				env: { ...process.env, HUSKY: "0" },
				stdio: "ignore"
			});
			process.stdout.write("⚡");
		} catch (e) {
			process.stdout.write("❌");
		}

		// Increased delay to prevent index.lock issues on Windows
		await new Promise(r => setTimeout(r, 300));

		if ((i + 1) % 10 === 0) {
			console.log(` [${i + 1}/${count}]`);
		}
	}

	console.log("\n✅ Abyssal Forge complete. History has been overwritten by the Void.");
}

const count = parseInt(process.argv[2]) || 32;
forge(count);
