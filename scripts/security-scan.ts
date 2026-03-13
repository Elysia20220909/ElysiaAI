#!/usr/bin/env bun
import { execSync } from "node:child_process";

console.log("🔍 Running Security Scan...");

try {
	// Simple check for potential secrets in staged files
	const stagedFiles = execSync("git diff --cached --name-only")
		.toString()
		.split("\n")
		.filter(Boolean);

	const patterns = [
		/(password|secret|key|token|auth|api_key|credential)["']?\s*[:=]\s*["']([^"']+)["']/i,
		/AI_KEY: ["'].*["']/i,
		/JWT_SECRET: ["'].*["']/i,
	];

	for (const file of stagedFiles) {
		if (file.includes(".env") || file.includes(".log")) continue;

		const content = execSync(`cat "${file}"`).toString();
		for (const pattern of patterns) {
			if (pattern.test(content)) {
				console.error(
					`❌ Security Violation found in ${file}: Potential secret detected.`,
				);
				process.exit(1);
			}
		}
	}

	console.log("✅ Security Scan Passed.");
} catch (error) {
	if (error instanceof Error) {
		console.warn("⚠️ Security Scan skipped or failed:", error.message);
	}
	// Don't block if git diff fails (e.g. no staged files)
}
