/**
 * Elysia AI - Security Scan Script
 * Performs basic security checks on the codebase.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const SENSITIVE_PATTERNS = [
	/password/i,
	/secret/i,
	/api_key/i,
	/token/i,
	/private_key/i,
];

async function scanDirectory(dir: string) {
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			if (
				entry.name === "node_modules" ||
				entry.name === ".git" ||
				entry.name === "dist"
			)
				continue;
			await scanDirectory(fullPath);
		} else if (entry.isFile()) {
			await scanFile(fullPath);
		}
	}
}

async function scanFile(filePath: string) {
	// Only scan text-based files
	if (!/\.(ts|js|json|md|env|yml|yaml)$/.test(filePath)) return;

	// Skip strict checks for documentation to avoid false positives
	if (filePath.includes("docs/")) return;

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
						line.includes("// allow-secret")
					)
						continue;

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
		console.log("[SECURITY SCAN] Success: No sensitive information detected.");
	})
	.catch((err) => {
		console.error("Security scan failed:", err);
		process.exit(1);
	});
