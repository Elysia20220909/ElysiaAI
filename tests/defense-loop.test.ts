import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defenseManager } from "../packages/server/src/lib/defense-manager";

describe("🛡️ Alpha Protocol Feedback Loop", () => {
	const TEST_RULES_DIR = join(import.meta.dir, "../config/defense");
	const TEST_RULES_FILE = join(TEST_RULES_DIR, "rules.json");

	beforeAll(() => {
		process.env.DEFENSE_RULES_FILE = TEST_RULES_FILE;
		if (!existsSync(TEST_RULES_DIR)) {
			mkdirSync(TEST_RULES_DIR, { recursive: true });
		}
	});

	test("DefenseManager should identify blocked IPs", () => {
		// Create a mock rules file
		const mockRules = {
			blocked_ips: ["1.2.3.4", "9.9.9.9"],
			last_updated: Date.now(),
		};
		writeFileSync(TEST_RULES_FILE, JSON.stringify(mockRules));

		// Force reload
		defenseManager.loadRules();

		expect(defenseManager.isBlocked("1.2.3.4")).toBe(true);
		expect(defenseManager.isBlocked("8.8.8.8")).toBe(false);
	});

	test("DefenseManager should handle IPv6 prefix normalization", () => {
		const mockRules = {
			blocked_ips: ["127.0.0.1"],
			last_updated: Date.now(),
		};
		writeFileSync(TEST_RULES_FILE, JSON.stringify(mockRules));
		defenseManager.loadRules();

		// ::ffff:127.0.0.1 should be blocked because it normalizes to 127.0.0.1
		expect(defenseManager.isBlocked("::ffff:127.0.0.1")).toBe(true);
	});

	afterAll(() => {
		if (existsSync(TEST_RULES_FILE)) {
			unlinkSync(TEST_RULES_FILE);
		}
	});
});
