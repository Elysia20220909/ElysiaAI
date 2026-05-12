import { describe, expect, test } from "bun:test";
import {
	buildDefaultBranchName,
	formatDateStamp,
	isProtectedBranch,
	nextAvailableBranchName,
	parseAutoBranchArgs,
	sanitizeBranchName,
	sanitizeBranchSegment,
	withBranchPrefix,
} from "./auto-branch";

describe("auto branch helpers", () => {
	test("sanitizes branch parts for git-safe names", () => {
		expect(sanitizeBranchSegment(" 自動 ブランチ!! ")).toBe("work");
		expect(sanitizeBranchSegment("Fix: Login Cookie/Auth")).toBe(
			"fix-login-cookie-auth",
		);
		expect(sanitizeBranchName("refs/heads/Feature/Login Cookie")).toBe(
			"feature/login-cookie",
		);
	});

	test("adds the configured prefix only once", () => {
		expect(withBranchPrefix("login-cookie", "codex")).toBe(
			"codex/login-cookie",
		);
		expect(withBranchPrefix("codex/login-cookie", "codex")).toBe(
			"codex/login-cookie",
		);
	});

	test("creates deterministic default branch names", () => {
		const date = new Date(2026, 4, 11, 1, 23, 0);
		expect(formatDateStamp(date)).toBe("20260511-0123");
		expect(buildDefaultBranchName("codex", date, "abc1234")).toBe(
			"codex/work-20260511-0123-abc1234",
		);
	});

	test("finds the next available duplicate branch suffix", () => {
		const existing = new Set(["codex/work", "codex/work-2"]);
		expect(
			nextAvailableBranchName("codex/work", (name) => existing.has(name)),
		).toBe("codex/work-3");
	});

	test("parses cli options and protected branch list", () => {
		const options = parseAutoBranchArgs([
			"login-cookie",
			"--prefix",
			"work",
			"--protected",
			"master,main,trunk",
			"--dry-run",
		]);

		expect(options.name).toBe("login-cookie");
		expect(options.prefix).toBe("work");
		expect(options.dryRun).toBe(true);
		expect(options.protectedBranches).toEqual(["master", "main", "trunk"]);
		expect(isProtectedBranch("trunk", options.protectedBranches)).toBe(true);
	});
});
