import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	archiveArtifact,
	closeArtifactDatabases,
	createArtifact,
	getArtifact,
	listArtifactRevisions,
	listArtifacts,
	updateArtifact,
} from "./artifact-workbench";
import { closeProjectMemoryDatabases, createProject } from "./project-memory";

const tempDirs: string[] = [];

async function makeRoot() {
	const root = await mkdtemp(join(tmpdir(), "elysia-artifact-workbench-"));
	tempDirs.push(root);
	return root;
}

afterEach(async () => {
	closeArtifactDatabases();
	closeProjectMemoryDatabases();
	(Bun as any).gc?.(true);
	await new Promise((resolve) => setTimeout(resolve, 20));
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("artifact workbench store", () => {
	test("creates an artifact with an initial revision", async () => {
		const root = await makeRoot();
		const artifact = await createArtifact({
			root,
			ownerKey: "operator",
			title: "Launch checklist",
			kind: "checklist",
			content: "- [ ] Import PDF\n- [ ] Reindex source",
			sourceTrace: { sources: ["knowledge/import.md"] },
		});
		const revisions = await listArtifactRevisions({
			root,
			ownerKey: "operator",
			artifactId: artifact.id,
		});

		expect(artifact.kind).toBe("checklist");
		expect(JSON.parse(artifact.sourceTraceJson).sources).toContain(
			"knowledge/import.md",
		);
		expect(revisions).toHaveLength(1);
		expect(revisions[0]?.summary).toBe("Initial artifact");
	});

	test("updates content and records a new revision", async () => {
		const root = await makeRoot();
		const artifact = await createArtifact({
			root,
			ownerKey: "operator",
			title: "Architecture note",
			content: "Initial artifact draft",
		});

		const updated = await updateArtifact({
			root,
			ownerKey: "operator",
			artifactId: artifact.id,
			content: "Initial artifact draft\n\nAdd project memory boundary.",
			summary: "Added memory boundary",
			status: "review",
		});
		const revisions = await listArtifactRevisions({
			root,
			ownerKey: "operator",
			artifactId: artifact.id,
		});

		expect(updated.artifact?.status).toBe("review");
		expect(updated.revision?.summary).toBe("Added memory boundary");
		expect(revisions).toHaveLength(2);
		expect(revisions[0]?.content).toContain("project memory boundary");
	});

	test("keeps artifacts isolated by owner and project", async () => {
		const root = await makeRoot();
		const project = await createProject({
			root,
			ownerKey: "operator",
			name: "Workbench Project",
		});
		await createArtifact({
			root,
			ownerKey: "operator",
			projectId: project.id,
			title: "Project artifact",
			content: "Project scoped workbench note",
		});

		const operatorArtifacts = await listArtifacts({
			root,
			ownerKey: "operator",
			projectId: project.id,
		});
		const otherArtifacts = await listArtifacts({
			root,
			ownerKey: "other",
		});

		expect(operatorArtifacts).toHaveLength(1);
		expect(otherArtifacts).toHaveLength(0);
	});

	test("archives artifacts without deleting revisions", async () => {
		const root = await makeRoot();
		const artifact = await createArtifact({
			root,
			ownerKey: "operator",
			title: "Temporary draft",
			content: "This draft should leave the active list.",
		});

		const archived = await archiveArtifact({
			root,
			ownerKey: "operator",
			artifactId: artifact.id,
		});
		const active = await listArtifacts({ root, ownerKey: "operator" });
		const all = await listArtifacts({
			root,
			ownerKey: "operator",
			includeArchived: true,
		});
		const restoredLookup = await getArtifact({
			root,
			ownerKey: "operator",
			artifactId: artifact.id,
		});
		const revisions = await listArtifactRevisions({
			root,
			ownerKey: "operator",
			artifactId: artifact.id,
		});

		expect(archived.artifact?.status).toBe("archived");
		expect(active).toHaveLength(0);
		expect(all).toHaveLength(1);
		expect(restoredLookup?.status).toBe("archived");
		expect(revisions).toHaveLength(1);
	});
});
