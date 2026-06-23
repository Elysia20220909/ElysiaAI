import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	closeKnowledgeDatabases,
	deleteKnowledgeSource,
	importKnowledgeDocument,
	listKnowledgeSources,
	reindexKnowledgeSource,
	searchImportedKnowledge,
	setKnowledgeSourceStatus,
} from "./knowledge-import";

const tempDirs: string[] = [];

async function makeRoot() {
	const root = await mkdtemp(join(tmpdir(), "elysia-knowledge-import-"));
	tempDirs.push(root);
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

describe("knowledge import store", () => {
	test("imports Markdown and searches generated chunks", async () => {
		const root = await makeRoot();
		const imported = await importKnowledgeDocument({
			root,
			userId: "operator",
			name: "daily-notes.md",
			mimeType: "text/markdown",
			content: "# RAG Import\n\nElysiaAI should remember local project notes.",
		});

		const sources = await listKnowledgeSources({ root, userId: "operator" });
		const results = await searchImportedKnowledge("project notes", {
			root,
			userId: "operator",
			limit: 3,
		});

		expect(imported.source.chunkCount).toBe(1);
		expect(sources).toHaveLength(1);
		expect(results).toHaveLength(1);
		expect(results[0]?.path).toBe("knowledge/daily-notes.md");
		expect(results[0]?.snippet).toContain("local project notes");
	});

	test("keeps user knowledge isolated", async () => {
		const root = await makeRoot();
		await importKnowledgeDocument({
			root,
			userId: "alice",
			name: "alice.txt",
			content: "Alice private launch checklist",
		});

		const aliceResults = await searchImportedKnowledge("launch checklist", {
			root,
			userId: "alice",
		});
		const bobResults = await searchImportedKnowledge("launch checklist", {
			root,
			userId: "bob",
		});

		expect(aliceResults).toHaveLength(1);
		expect(bobResults).toHaveLength(0);
	});

	test("imports text-based PDF content without external dependencies", async () => {
		const root = await makeRoot();
		const pdf = Buffer.from(
			[
				"%PDF-1.4",
				"1 0 obj",
				"<< /Length 63 >>",
				"stream",
				"BT /F1 12 Tf 72 720 Td (Elysia PDF memory garden) Tj ET",
				"endstream",
				"endobj",
				"%%EOF",
			].join("\n"),
			"latin1",
		);

		const imported = await importKnowledgeDocument({
			root,
			userId: "operator",
			name: "memory-garden.pdf",
			mimeType: "application/pdf",
			content: pdf,
		});
		const results = await searchImportedKnowledge("memory garden", {
			root,
			userId: "operator",
		});

		expect(imported.source.extractor).toBe("pdf-text");
		expect(results).toHaveLength(1);
		expect(results[0]?.path).toBe("knowledge/memory-garden.pdf");
	});

	test("toggles a knowledge source on and off", async () => {
		const root = await makeRoot();
		const imported = await importKnowledgeDocument({
			root,
			userId: "operator",
			name: "toggle.md",
			content: "Sovereign source map reference",
		});

		const disabled = await setKnowledgeSourceStatus({
			root,
			userId: "operator",
			sourceId: imported.source.id,
			status: "disabled",
		});
		const hiddenResults = await searchImportedKnowledge("source map", {
			root,
			userId: "operator",
		});
		const enabled = await setKnowledgeSourceStatus({
			root,
			userId: "operator",
			sourceId: imported.source.id,
			status: "ready",
		});
		const visibleResults = await searchImportedKnowledge("source map", {
			root,
			userId: "operator",
		});

		expect(disabled.source?.status).toBe("disabled");
		expect(hiddenResults).toHaveLength(0);
		expect(enabled.source?.status).toBe("ready");
		expect(visibleResults).toHaveLength(1);
	});

	test("reindexes a stored knowledge source", async () => {
		const root = await makeRoot();
		const imported = await importKnowledgeDocument({
			root,
			userId: "operator",
			name: "reindex.txt",
			content: "Daily desk brief startup note",
		});

		const reindexed = await reindexKnowledgeSource({
			root,
			userId: "operator",
			sourceId: imported.source.id,
		});
		const results = await searchImportedKnowledge("startup note", {
			root,
			userId: "operator",
		});

		expect(reindexed.reindexed).toBe(true);
		expect(reindexed.source?.chunkCount).toBe(1);
		expect(results).toHaveLength(1);
	});

	test("deletes a knowledge source and its chunks", async () => {
		const root = await makeRoot();
		const imported = await importKnowledgeDocument({
			root,
			userId: "operator",
			name: "delete-me.txt",
			content: "Temporary knowledge shard",
		});

		const deleted = await deleteKnowledgeSource({
			root,
			userId: "operator",
			sourceId: imported.source.id,
		});
		const results = await searchImportedKnowledge("temporary knowledge", {
			root,
			userId: "operator",
		});

		expect(deleted.deleted).toBe(true);
		expect(results).toHaveLength(0);
	});
});
