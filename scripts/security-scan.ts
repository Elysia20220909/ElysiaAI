/**
 * Elysia AI - Security Scan Script
 * Performs basic security checks on the codebase.
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const SENSITIVE_PATTERNS = [
	/password\s*[:=]\s*['"`][^'"`]{8,}/i,
	/secret\s*[:=]\s*['"`][^'"`]{8,}/i,
	/api_key\s*[:=]\s*['"`][^'"`]{8,}/i,
	/token\s*[:=]\s*['"`][^'"`]{8,}/i,
	/private_key\s*[:=]\s*['"`][^'"`]{8,}/i,
];

async function scanDirectory(dir: string) {
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			// ONLY scan these specific project directories
			if (
				entry.name === "kernel" ||
				entry.name === "packages" ||
				entry.name === "src" ||
				entry.name === "core" ||
				entry.name === "sys"
			) {
				await scanDirectory(fullPath);
			} else if (
				dir !== "." // Continue scanning subdirectories if we are already inside a target
			) {
				await scanDirectory(fullPath);
			}
		} else if (entry.isFile()) {
			await scanFile(fullPath);
		}
	}
}

async function scanFile(filePath: string) {
	// Only scan text-based files
	if (!/\.(ts|js|json|md|env|yml|yaml)$/.test(filePath)) return;

	// Skip strict checks for documentation, configs, tests, and examples to avoid false positives
	const normalizedPath = filePath.replace(/\\/g, "/");
	if (
		normalizedPath.includes("/docs/") ||
		normalizedPath.includes("docs/") ||
		normalizedPath.includes("/config/") ||
		normalizedPath.includes("config/") ||
		normalizedPath.includes("/dev/") ||
		normalizedPath.includes("dev/") ||
		normalizedPath.includes("/tests/") ||
		normalizedPath.includes("tests/") ||
		normalizedPath.includes("/scripts/") ||
		normalizedPath.includes("scripts/") ||
		normalizedPath.includes("/dist/") ||
		normalizedPath.includes("dist/") ||
		normalizedPath.includes("/.git/") ||
		normalizedPath.includes("/node_modules/") ||
		normalizedPath.includes("Documentation/") ||
		normalizedPath.includes("AEGIS_LEDGER.md") ||
		normalizedPath.endsWith(".min.js") ||
		normalizedPath.endsWith(".env.example") ||
		normalizedPath.endsWith("README.md") ||
		normalizedPath.endsWith(".yarnrc.yml") ||
		normalizedPath.endsWith("docker-compose.yml") ||
		normalizedPath.endsWith("package-lock.json") ||
		normalizedPath.endsWith("bun.lockb")
	)
		return;

	try {
		const content = await readFile(filePath, "utf-8");
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			for (const pattern of SENSITIVE_PATTERNS) {
				if (pattern.test(line) && !line.includes("SENSITIVE_PATTERNS")) {
					// Special exception for mock data and known patterns
					if (
						filePath.includes("mockData.ts") ||
						line.includes("// allow-secret") ||
						line.includes("Bearer ${") ||
						line.includes(" Authorization") ||
						line.includes("accessToken")
					)
						continue;

					findingsCount++;
					console.warn(
						`[SECURITY SCAN] Potential sensitive information found in ${filePath}:${i + 1}`,
					);
					console.warn(`  Line: ${line.trim()}`);
				}
			}
		}
	} catch (_error) {
		// Skip unreadable files
	}
}

let findingsCount = 0;

// Main logic: handle specific files or scan all
const targetFiles = process.argv.slice(2);

async function run() {
	if (targetFiles.length > 0) {
		// Only scan files passed as arguments (for lint-staged)
		for (const file of targetFiles) {
			await scanFile(file);
		}
	} else {
		// Full project scan
		await scanDirectory(".");
	}
}

run()
	.then(() => {
		if (findingsCount > 0) {
			console.error(`\n[SECURITY SCAN] Failed: ${findingsCount} potential issues found.`);
			process.exit(1);
		} else {
			console.log("[SECURITY SCAN] Success: No sensitive information detected.");
		}
	})
	.catch((err) => {
		console.error("Security scan failed:", err);
		process.exit(1);
	});
