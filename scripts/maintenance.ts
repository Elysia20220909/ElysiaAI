import fs from "node:fs";
import path from "node:path";
import { spawn } from "bun";

// --- CONFIGURATION ---
const TARGET_DIRECTORIES = [
	"__pycache__",
	".mypy_cache",
	".ruff_cache",
	".pytest_cache",
	".tsbuildinfo",
	"dist",
	"target",
	"out",
	"build",
	"playwright-report",
	"test-results",
];
const TARGET_FILE_EXTENSIONS = [
	".log",
	".tmp",
	".vmem",
	".nvram",
	".vmsd",
	".vmxf",
	".scoreboard",
];
const PROTECTED_PARENT_DIRS = [
	"src",
	"packages",
	"kernel",
	"python",
	"usr",
	"lib",
];
const PROTECTED_FILES = [
	"build.rs",
	"build.ps1",
	"build.ts",
	"build.sh",
	"Makefile",
	"Dockerfile",
	"Kbuild",
];
const EXCLUDE_WALK = ["node_modules", ".git"];

// --- LOGGING ---
const log = (msg: string, color = "\x1b[0m") =>
	console.log(`${color}${msg}\x1b[0m`);
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GRAY = "\x1b[90m";

// --- ENGINE ---
let totalFreed = 0;
let fileCount = 0;

async function runVacuum(dir: string, depth = 0) {
	try {
		const files = fs.readdirSync(dir);
		for (const file of files) {
			const fullPath = path.join(dir, file);
			let stats: fs.Stats;
			try {
				stats = fs.statSync(fullPath);
			} catch (e) {
				continue;
			}

			if (stats.isDirectory()) {
				if (EXCLUDE_WALK.includes(file)) continue;
				if (
					TARGET_DIRECTORIES.includes(file) &&
					!(PROTECTED_PARENT_DIRS.includes(file) && depth === 0)
				) {
					const size = getDirSize(fullPath);
					fs.rmSync(fullPath, { recursive: true, force: true });
					log(` [ PURGE ] : ${fullPath} (${formatSize(size)})`, GRAY);
					totalFreed += size;
					fileCount++;
				} else {
					await runVacuum(fullPath, depth + 1);
				}
			} else {
				if (PROTECTED_FILES.includes(file)) continue;
				const shouldPurge = TARGET_FILE_EXTENSIONS.some((ext) =>
					file.endsWith(ext),
				);
				if (shouldPurge) {
					const size = stats.size;
					fs.unlinkSync(fullPath);
					log(` [ PURGE ] : ${fullPath} (${formatSize(size)})`, GRAY);
					totalFreed += size;
					fileCount++;
				}
			}
		}
	} catch (e) {}
}

function getDirSize(dir: string): number {
	let size = 0;
	try {
		const files = fs.readdirSync(dir);
		for (const file of files) {
			const fullPath = path.join(dir, file);
			const stats = fs.statSync(fullPath);
			size += stats.isDirectory() ? getDirSize(fullPath) : stats.size;
		}
	} catch (e) {}
	return size;
}

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// --- MAIN PROTOCOL ---
async function startMaintenance() {
	console.clear();
	log(
		`
 ███████╗██╗     ██╗   ██╗███████╗██╗ █████╗ 
 ██╔════╝██║     ╚██╗ ██╔╝██╔════╝██║██╔══██╗
 █████╗  ██║      ╚████╔╝ ███████╗██║███████║
 ██╔══╝  ██║       ╚██╔╝  ╚════██║██║██╔══██║
 ███████╗███████╗   ██║   ███████║██║██╔══██║
 ╚══════╝╚══════╝   ╚═╝   ╚══════╝╚═╝╚═╝  ╚═╝`,
		CYAN,
	);

	log("\n >>> ELYSIA SOVEREIGN MAINTENANCE PROTOCOL ACTIVE <<<", GREEN);
	log(" ----------------------------------------------------", GRAY);

	// Phase 1: Vacuum
	log("\n [ PHASE 1 ] : NEURAL VACUUM PURGE", YELLOW);
	await runVacuum(".");
	log(
		` [ RESULT  ] : ${fileCount} units purged // ${formatSize(totalFreed)} freed`,
		GREEN,
	);

	// Phase 2: Security Audit
	log("\n [ PHASE 2 ] : SECURITY SHIELD SCAN", YELLOW);
	const audit = spawn(["bun", "audit"]);
	const auditOutput = await new Response(audit.stdout).text();

	if (auditOutput.includes("vulnerabilities")) {
		log(" [ WARNING ] : Security vulnerabilities detected!", RED);
		console.log(auditOutput.trim());
		log(" [ ACTION  ] : Recommending 'bun update' for mitigation.", YELLOW);
	} else {
		log(
			" [ SUCCESS ] : No critical vulnerabilities found in neural link.",
			GREEN,
		);
	}

	// Phase 3: Integrity Check
	log("\n [ PHASE 3 ] : SYSTEM INTEGRITY VERIFICATION", YELLOW);
	const criticalPaths = [
		"packages/server/src/routes",
		"kernel/build_os.ps1",
		".env",
		"kernel/SENTINEL.KEY",
	];
	for (const p of criticalPaths) {
		if (fs.existsSync(p)) {
			if (p === "kernel/SENTINEL.KEY") {
				const key = fs.readFileSync(p, "utf-8").trim();
				if (key === "AEGIS-SVR-777") {
					log(` [ OK ] : Silicon Key Verified [${key}]`, GREEN);
				} else {
					log(" [ FAIL ] : UNKNOWN SILICON KEY DETECTED", RED);
				}
			} else {
				log(` [ OK ] : ${p} verified`, GRAY);
			}
		} else {
			log(` [ ERROR ] : CRITICAL RESOURCE MISSING: ${p}`, RED);
		}
	}

	log("\n ----------------------------------------------------", GRAY);
	log(" [ STATUS  ] : MAINTENANCE COMPLETE // SYSTEM OPTIMIZED", GREEN);
	console.log("");
}

startMaintenance();
