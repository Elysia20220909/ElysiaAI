import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	bytesToMiB,
	collectNativeLiteSnapshot,
	summarizeNativeLiteScore,
} from "./native-lite";

describe("native lite snapshot", () => {
	test("formats byte weights as MiB", () => {
		expect(bytesToMiB(1024 * 1024)).toBe(1);
		expect(bytesToMiB(1536 * 1024)).toBe(1.5);
	});

	test("builds a deterministic lightweight manifest", () => {
		const root = mkdtempSync(join(tmpdir(), "elysia-native-lite-"));
		try {
			mkdirSync(join(root, ".tmp"));
			mkdirSync(join(root, "logs"));
			writeFileSync(join(root, ".tmp", "boot.log"), "lite");
			writeFileSync(join(root, "logs", "run.log"), "native");

			const snapshot = collectNativeLiteSnapshot({
				cwd: root,
				now: "2026-05-03T00:00:00.000Z",
				detectToolchains: false,
				maxFilesPerBudget: 10,
			});

			expect(snapshot.codename).toBe("NativeLiteLab");
			expect(snapshot.mode).toBe("rust-swift-bun-hybrid");
			expect(snapshot.links.lab).toBe("/native-lite.html");
			expect(snapshot.lanes.map((lane) => lane.id)).toEqual([
				"rust",
				"swift",
				"bun",
			]);
			expect(snapshot.budgets.some((budget) => budget.id === "tmp")).toBe(true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("keeps the score bounded", () => {
		const score = summarizeNativeLiteScore(
			[
				{ bytes: 50 * 1024 * 1024, truncated: false },
				{ bytes: 2_000 * 1024 * 1024, truncated: true },
			],
			[{ status: "ready" }, { status: "fallback" }],
		);

		expect(score).toBeGreaterThanOrEqual(25);
		expect(score).toBeLessThanOrEqual(100);
	});
});
