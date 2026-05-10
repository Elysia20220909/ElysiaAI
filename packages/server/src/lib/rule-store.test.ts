import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultGovernanceRules, FileRuleStore } from "./rule-store";

const tempDirs: string[] = [];

async function createStore(): Promise<FileRuleStore> {
	const dir = await mkdtemp(join(tmpdir(), "elysia-rule-store-"));
	tempDirs.push(dir);
	return new FileRuleStore(join(dir, "rules.json"));
}

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("FileRuleStore", () => {
	test("returns default rules before a local store file exists", async () => {
		const store = await createStore();
		const result = await store.list();

		expect(result.source).toBe("default");
		expect(result.total).toBe(defaultGovernanceRules.length);
		expect(result.active).toBe(defaultGovernanceRules.length);
	});

	test("creates and persists a new governance rule", async () => {
		const store = await createStore();
		const created = await store.create({
			title: "Review dependency changes",
			body: "Run dependency alignment and audit checks after package edits.",
			scope: "security",
			severity: "warning",
		});

		const result = await store.list();
		const loaded = await store.get(created.id);

		expect(result.source).toBe("file");
		expect(result.total).toBe(defaultGovernanceRules.length + 1);
		expect(loaded.title).toBe("Review dependency changes");
		expect(loaded.status).toBe("active");
	});

	test("updates an existing rule with version tracking", async () => {
		const store = await createStore();
		const created = await store.create({
			title: "Draft rule",
			body: "Initial body",
			scope: "engineering",
			severity: "info",
		});

		const updated = await store.update(created.id, {
			body: "Updated body",
			status: "disabled",
		});

		expect(updated.version).toBe(2);
		expect(updated.body).toBe("Updated body");
		expect(updated.status).toBe("disabled");
	});

	test("rejects invalid rule input", async () => {
		const store = await createStore();

		await expect(
			store.create({
				title: "",
				body: "Missing title",
				scope: "engineering",
				severity: "info",
			}),
		).rejects.toThrow("title is required");
	});
});
