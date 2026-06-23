import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	addProjectMemory,
	buildProjectMemoryContext,
	closeProjectMemoryDatabases,
	createProject,
	ensureDefaultProject,
	listProjectMemories,
	listProjects,
	setProjectMemoryState,
} from "./project-memory";

const tempDirs: string[] = [];

async function makeRoot() {
	const root = await mkdtemp(join(tmpdir(), "elysia-project-memory-"));
	tempDirs.push(root);
	return root;
}

afterEach(async () => {
	closeProjectMemoryDatabases();
	(Bun as any).gc?.(true);
	await new Promise((resolve) => setTimeout(resolve, 20));
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("project memory store", () => {
	test("creates a default project per owner", async () => {
		const root = await makeRoot();
		const project = await ensureDefaultProject(root, "operator");
		const projects = await listProjects({ root, ownerKey: "operator" });
		const otherProjects = await listProjects({ root, ownerKey: "other" });

		expect(project.name).toBe("Daily Desk");
		expect(projects).toHaveLength(1);
		expect(otherProjects).toHaveLength(1);
		expect(projects[0]?.ownerKey).toBe("operator");
		expect(otherProjects[0]?.ownerKey).toBe("other");
	});

	test("keeps project memories isolated by project and owner", async () => {
		const root = await makeRoot();
		const first = await createProject({
			root,
			ownerKey: "operator",
			name: "RAG Work",
		});
		const second = await createProject({
			root,
			ownerKey: "operator",
			name: "Voice Work",
		});
		await addProjectMemory({
			root,
			ownerKey: "operator",
			projectId: first.id,
			content: "RAG import uses DB backed document chunks.",
			metadata: { emotion: "focused" },
		});

		const firstMemories = await listProjectMemories({
			root,
			ownerKey: "operator",
			projectId: first.id,
		});
		const secondMemories = await listProjectMemories({
			root,
			ownerKey: "operator",
			projectId: second.id,
		});
		const otherContext = await buildProjectMemoryContext({
			root,
			ownerKey: "other",
			projectId: first.id,
			query: "document chunks",
		});

		expect(firstMemories).toHaveLength(1);
		expect(firstMemories[0]?.metadataJson).toContain("focused");
		expect(secondMemories).toHaveLength(0);
		expect(otherContext.memories).toHaveLength(0);
	});

	test("builds context and strengthens used memories", async () => {
		const root = await makeRoot();
		const project = await createProject({
			root,
			ownerKey: "operator",
			name: "Memory Garden",
		});
		const memory = await addProjectMemory({
			root,
			ownerKey: "operator",
			projectId: project.id,
			title: "Source map",
			content: "Sovereign Source Map shows documents and models used.",
			pinned: true,
		});

		const context = await buildProjectMemoryContext({
			root,
			ownerKey: "operator",
			projectId: project.id,
			query: "source map documents",
		});
		const memories = await listProjectMemories({
			root,
			ownerKey: "operator",
			projectId: project.id,
		});

		expect(context.context).toContain("Sovereign Source Map");
		expect(context.memories[0]?.id).toBe(memory.id);
		expect(memories[0]?.useCount).toBe(1);
		expect(memories[0]?.gardenState).toBe("rooted");
	});

	test("disables and forgets project memories", async () => {
		const root = await makeRoot();
		const project = await createProject({
			root,
			ownerKey: "operator",
			name: "Forget Test",
		});
		const memory = await addProjectMemory({
			root,
			ownerKey: "operator",
			projectId: project.id,
			content: "Temporary memory should not be used.",
		});

		const disabled = await setProjectMemoryState({
			root,
			ownerKey: "operator",
			projectId: project.id,
			memoryId: memory.id,
			status: "disabled",
		});
		const hiddenContext = await buildProjectMemoryContext({
			root,
			ownerKey: "operator",
			projectId: project.id,
			query: "temporary memory",
		});
		const forgotten = await setProjectMemoryState({
			root,
			ownerKey: "operator",
			projectId: project.id,
			memoryId: memory.id,
			status: "forgotten",
		});

		expect(disabled.memory?.status).toBe("disabled");
		expect(hiddenContext.memories).toHaveLength(0);
		expect(forgotten.memory?.gardenState).toBe("compost");
	});
});
