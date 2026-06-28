import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	closeKnowledgeDatabases,
	importKnowledgeDocument,
} from "./knowledge-import";
import {
	appendMvpMemory,
	buildLocalRagContext,
	clearMvpMemory,
	deleteMvpMemoryRecord,
	getMvpMemoryStats,
	readRecentMvpMemory,
	searchLocalKnowledge,
	searchLocalWorkspace,
} from "./mvp-local-ai";

const tempDirs: string[] = [];

async function makeWorkspace() {
	const root = await mkdtemp(join(tmpdir(), "elysia-mvp-local-ai-"));
	tempDirs.push(root);
	await writeFile(
		join(root, "README.md"),
		"ElysiaAI MVP uses Ollama for local-first chat.\n",
		"utf8",
	);
	await writeFile(
		join(root, "README.ja.md"),
		"ローカルAI OSとして、RAGとファイル検索を日常導線にします。\n",
		"utf8",
	);
	return root;
}

afterEach(async () => {
	closeKnowledgeDatabases();
	(Bun as any).gc?.(true);
	await new Promise((resolve) => setTimeout(resolve, 20));
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("MVP local AI helpers", () => {
	test("searches local workspace files without external services", async () => {
		const root = await makeWorkspace();
		const results = await searchLocalWorkspace("Ollama local chat", {
			root,
			limit: 3,
		});

		expect(results.length).toBeGreaterThan(0);
		expect(results[0]?.path).toBe("README.md");
		expect(results[0]?.snippet).toContain("Ollama");
	});

	test("builds a compact RAG context from local files", async () => {
		const root = await makeWorkspace();
		const rag = await buildLocalRagContext("RAG ファイル検索", {
			root,
			limit: 3,
		});

		expect(rag.sources.length).toBeGreaterThan(0);
		expect(rag.context).toContain("README.ja.md");
	});

	test("includes imported knowledge in local RAG search", async () => {
		const root = await makeWorkspace();
		await importKnowledgeDocument({
			root,
			userId: "operator",
			name: "project-memory.md",
			content: "ElysiaAI uses imported knowledge for daily project memory.",
		});

		const results = await searchLocalKnowledge("daily project memory", {
			root,
			userId: "operator",
			limit: 3,
		});
		const rag = await buildLocalRagContext("daily project memory", {
			root,
			userId: "operator",
			limit: 3,
		});

		expect(results[0]?.path).toBe("knowledge/project-memory.md");
		expect(rag.context).toContain("imported knowledge");
	});

	test("expands Japanese queries for daily RAG/file search terms", async () => {
		const root = await makeWorkspace();
		const results = await searchLocalWorkspace("毎日使うファイル探し", {
			root,
			limit: 3,
		});

		expect(results.some((result) => result.path === "README.ja.md")).toBe(true);
	});

	test("persists and reads runtime memory records", async () => {
		const root = await makeWorkspace();
		await appendMvpMemory(
			{
				sessionId: "mvp-test",
				role: "user",
				content: "今日のMVP状況を覚えて",
			},
			{ root },
		);

		const recent = await readRecentMvpMemory("mvp-test", { root });
		const stats = await getMvpMemoryStats({ root });

		expect(recent).toHaveLength(1);
		expect(recent[0]?.content).toContain("MVP");
		expect(stats.exists).toBe(true);
		expect(stats.records).toBe(1);
	});

	test("deletes and clears memory records by session", async () => {
		const root = await makeWorkspace();
		const first = await appendMvpMemory(
			{
				sessionId: "mvp-test",
				role: "user",
				content: "削除対象の記憶",
			},
			{ root },
		);
		await appendMvpMemory(
			{
				sessionId: "mvp-test",
				role: "assistant",
				content: "クリア対象の記憶",
			},
			{ root },
		);
		await appendMvpMemory(
			{
				sessionId: "other-session",
				role: "user",
				content: "残す記憶",
			},
			{ root },
		);

		const deleted = await deleteMvpMemoryRecord("mvp-test", first.id, { root });
		const cleared = await clearMvpMemory("mvp-test", { root });
		const ownRecords = await readRecentMvpMemory("mvp-test", { root });
		const otherRecords = await readRecentMvpMemory("other-session", { root });

		expect(deleted.deleted).toBe(true);
		expect(cleared.deleted).toBe(1);
		expect(ownRecords).toHaveLength(0);
		expect(otherRecords).toHaveLength(1);
	});
});
