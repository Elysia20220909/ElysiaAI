import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export type ArtifactKind =
	| "markdown"
	| "code"
	| "mermaid"
	| "json"
	| "checklist";
export type ArtifactStatus = "draft" | "review" | "final" | "archived";

export type ArtifactRecord = {
	id: string;
	ownerKey: string;
	projectId?: string;
	authorId?: string;
	title: string;
	kind: ArtifactKind;
	status: ArtifactStatus;
	content: string;
	metadataJson: string;
	sourceTraceJson: string;
	createdAt: string;
	updatedAt: string;
	revisionCount?: number;
};

export type ArtifactRevisionRecord = {
	id: string;
	artifactId: string;
	content: string;
	summary?: string;
	metadataJson: string;
	createdAt: string;
};

type ArtifactRow = ArtifactRecord & {
	projectId?: string | null;
	authorId?: string | null;
	revisionCount?: number;
};
type RevisionRow = Omit<ArtifactRevisionRecord, "summary"> & {
	summary?: string | null;
};

const dbCache = new Map<string, Database>();
const MAX_TITLE_LENGTH = 160;
const MAX_CONTENT_LENGTH = 200_000;
const validKinds = new Set<ArtifactKind>([
	"markdown",
	"code",
	"mermaid",
	"json",
	"checklist",
]);
const validStatuses = new Set<ArtifactStatus>([
	"draft",
	"review",
	"final",
	"archived",
]);

function makeId(prefix: string) {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
	return new Date().toISOString();
}

function dbPathForRoot(root: string) {
	const dbUrl = process.env.DATABASE_URL?.startsWith("file:")
		? process.env.DATABASE_URL
		: `file:${join(root, "prisma", "dev.db")}`;
	const rawPath = dbUrl.slice("file:".length);
	return isAbsolute(rawPath) ? rawPath : resolve(root, rawPath);
}

function ensureColumn(
	db: Database,
	table: string,
	column: string,
	ddl: string,
) {
	const columns = db.query(`PRAGMA table_info("${table}")`).all() as Array<{
		name: string;
	}>;
	if (columns.some((candidate) => candidate.name === column)) return;
	db.exec(`ALTER TABLE "${table}" ADD COLUMN ${ddl}`);
}

function ensureArtifactSchema(db: Database) {
	db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "artifacts" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"ownerKey" TEXT NOT NULL,
	"projectId" TEXT,
	"authorId" TEXT,
	"title" TEXT NOT NULL,
	"kind" TEXT NOT NULL DEFAULT 'markdown',
	"status" TEXT NOT NULL DEFAULT 'draft',
	"content" TEXT NOT NULL,
	"metadataJson" TEXT NOT NULL DEFAULT '{}',
	"sourceTraceJson" TEXT NOT NULL DEFAULT '{}',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "artifact_revisions" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"artifactId" TEXT NOT NULL,
	"content" TEXT NOT NULL,
	"summary" TEXT,
	"metadataJson" TEXT NOT NULL DEFAULT '{}',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("artifactId") REFERENCES "artifacts" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "artifacts_ownerKey_idx" ON "artifacts"("ownerKey");
CREATE INDEX IF NOT EXISTS "artifacts_projectId_idx" ON "artifacts"("projectId");
CREATE INDEX IF NOT EXISTS "artifacts_authorId_idx" ON "artifacts"("authorId");
CREATE INDEX IF NOT EXISTS "artifacts_kind_idx" ON "artifacts"("kind");
CREATE INDEX IF NOT EXISTS "artifacts_status_idx" ON "artifacts"("status");
CREATE INDEX IF NOT EXISTS "artifacts_updatedAt_idx" ON "artifacts"("updatedAt");
CREATE INDEX IF NOT EXISTS "artifact_revisions_artifactId_idx" ON "artifact_revisions"("artifactId");
CREATE INDEX IF NOT EXISTS "artifact_revisions_createdAt_idx" ON "artifact_revisions"("createdAt");
`);
	ensureColumn(db, "artifacts", "ownerKey", `"ownerKey" TEXT`);
}

function getArtifactDb(root: string) {
	const path = dbPathForRoot(root);
	const existing = dbCache.get(path);
	if (existing) return existing;

	mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	ensureArtifactSchema(db);
	dbCache.set(path, db);
	return db;
}

export function closeArtifactDatabases(root?: string) {
	if (root) {
		const path = dbPathForRoot(root);
		const db = dbCache.get(path);
		if (!db) return;
		try {
			db.exec("PRAGMA optimize; PRAGMA wal_checkpoint(TRUNCATE);");
		} catch {
			// Best effort for Windows test cleanup.
		}
		db.close();
		dbCache.delete(path);
		return;
	}

	for (const [path, db] of dbCache) {
		try {
			db.exec("PRAGMA optimize; PRAGMA wal_checkpoint(TRUNCATE);");
		} catch {
			// Best effort for Windows test cleanup.
		}
		db.close();
		dbCache.delete(path);
	}
}

function safeJson(value: unknown, fallback: string) {
	if (value === undefined) return fallback;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return fallback;
		try {
			JSON.parse(trimmed);
			return trimmed;
		} catch {
			return JSON.stringify({ value: trimmed });
		}
	}
	return JSON.stringify(value ?? {});
}

function normalizeKind(kind?: string): ArtifactKind {
	const candidate = (kind || "markdown").trim().toLowerCase() as ArtifactKind;
	if (!validKinds.has(candidate)) {
		throw new Error(
			"Artifact kind must be markdown, code, mermaid, json, or checklist",
		);
	}
	return candidate;
}

function normalizeStatus(status?: string): ArtifactStatus {
	const candidate = (status || "draft").trim().toLowerCase() as ArtifactStatus;
	if (!validStatuses.has(candidate)) {
		throw new Error(
			"Artifact status must be draft, review, final, or archived",
		);
	}
	return candidate;
}

function cleanTitle(title: string) {
	const clean = title.trim().slice(0, MAX_TITLE_LENGTH);
	if (!clean) throw new Error("Artifact title is required");
	return clean;
}

function cleanContent(content: string) {
	const clean = content.trim();
	if (!clean) throw new Error("Artifact content is required");
	if (clean.length > MAX_CONTENT_LENGTH) {
		throw new Error("Artifact content is too large");
	}
	return clean;
}

function artifactFromRow(row: ArtifactRow): ArtifactRecord {
	return {
		id: row.id,
		ownerKey: row.ownerKey,
		projectId: row.projectId || undefined,
		authorId: row.authorId || undefined,
		title: row.title,
		kind: normalizeKind(row.kind),
		status: normalizeStatus(row.status),
		content: row.content,
		metadataJson: row.metadataJson || "{}",
		sourceTraceJson: row.sourceTraceJson || "{}",
		createdAt: String(row.createdAt),
		updatedAt: String(row.updatedAt),
		revisionCount: Number(row.revisionCount || 0),
	};
}

function revisionFromRow(row: RevisionRow): ArtifactRevisionRecord {
	return {
		id: row.id,
		artifactId: row.artifactId,
		content: row.content,
		summary: row.summary || undefined,
		metadataJson: row.metadataJson || "{}",
		createdAt: String(row.createdAt),
	};
}

function assertProjectAccess({
	db,
	ownerKey,
	projectId,
}: {
	db: Database;
	ownerKey: string;
	projectId?: string;
}) {
	if (!projectId) return;
	const row = db
		.query('SELECT "id" FROM "projects" WHERE "id" = ? AND "ownerKey" = ?')
		.get(projectId, ownerKey) as { id: string } | undefined;
	if (!row) throw new Error("Project not found");
}

export async function createArtifact({
	root,
	ownerKey,
	projectId,
	title,
	kind = "markdown",
	status = "draft",
	content,
	metadata,
	sourceTrace,
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
	title: string;
	kind?: string;
	status?: string;
	content: string;
	metadata?: unknown;
	sourceTrace?: unknown;
}): Promise<ArtifactRecord> {
	const db = getArtifactDb(root);
	assertProjectAccess({ db, ownerKey, projectId });

	const now = nowIso();
	const artifact: ArtifactRecord = {
		id: makeId("art"),
		ownerKey,
		projectId: projectId || undefined,
		title: cleanTitle(title),
		kind: normalizeKind(kind),
		status: normalizeStatus(status),
		content: cleanContent(content),
		metadataJson: safeJson(metadata, "{}"),
		sourceTraceJson: safeJson(sourceTrace, "{}"),
		createdAt: now,
		updatedAt: now,
		revisionCount: 1,
	};

	const save = db.transaction(() => {
		db.prepare(`
INSERT INTO "artifacts"
("id", "ownerKey", "projectId", "authorId", "title", "kind", "status", "content", "metadataJson", "sourceTraceJson", "createdAt", "updatedAt")
VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
			artifact.id,
			artifact.ownerKey,
			artifact.projectId || null,
			artifact.title,
			artifact.kind,
			artifact.status,
			artifact.content,
			artifact.metadataJson,
			artifact.sourceTraceJson,
			artifact.createdAt,
			artifact.updatedAt,
		);
		db.prepare(`
INSERT INTO "artifact_revisions"
("id", "artifactId", "content", "summary", "metadataJson", "createdAt")
VALUES (?, ?, ?, ?, ?, ?)
`).run(
			makeId("arev"),
			artifact.id,
			artifact.content,
			"Initial artifact",
			artifact.metadataJson,
			now,
		);
	});
	save();
	return artifact;
}

export async function listArtifacts({
	root,
	ownerKey,
	projectId,
	includeArchived = false,
	limit = 50,
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
	includeArchived?: boolean;
	limit?: number;
}): Promise<ArtifactRecord[]> {
	const db = getArtifactDb(root);
	if (projectId) assertProjectAccess({ db, ownerKey, projectId });
	const rows = db
		.query(`
SELECT "artifacts".*, COUNT("artifact_revisions"."id") AS "revisionCount"
FROM "artifacts"
LEFT JOIN "artifact_revisions" ON "artifact_revisions"."artifactId" = "artifacts"."id"
WHERE "artifacts"."ownerKey" = ?
AND (? IS NULL OR "artifacts"."projectId" = ?)
AND (? = 1 OR "artifacts"."status" != 'archived')
GROUP BY "artifacts"."id"
ORDER BY "artifacts"."updatedAt" DESC, "artifacts"."createdAt" DESC
LIMIT ?
`)
		.all(
			ownerKey,
			projectId || null,
			projectId || null,
			includeArchived ? 1 : 0,
			Math.max(1, Math.min(limit, 200)),
		) as ArtifactRow[];
	return rows.map(artifactFromRow);
}

export async function getArtifact({
	root,
	ownerKey,
	artifactId,
}: {
	root: string;
	ownerKey: string;
	artifactId: string;
}): Promise<ArtifactRecord | null> {
	const db = getArtifactDb(root);
	const row = db
		.query(`
SELECT "artifacts".*, COUNT("artifact_revisions"."id") AS "revisionCount"
FROM "artifacts"
LEFT JOIN "artifact_revisions" ON "artifact_revisions"."artifactId" = "artifacts"."id"
WHERE "artifacts"."id" = ? AND "artifacts"."ownerKey" = ?
GROUP BY "artifacts"."id"
`)
		.get(artifactId, ownerKey) as ArtifactRow | undefined;
	return row ? artifactFromRow(row) : null;
}

export async function updateArtifact({
	root,
	ownerKey,
	artifactId,
	title,
	kind,
	status,
	content,
	summary,
	metadata,
	sourceTrace,
}: {
	root: string;
	ownerKey: string;
	artifactId: string;
	title?: string;
	kind?: string;
	status?: string;
	content?: string;
	summary?: string;
	metadata?: unknown;
	sourceTrace?: unknown;
}): Promise<{
	updated: boolean;
	artifact?: ArtifactRecord;
	revision?: ArtifactRevisionRecord;
}> {
	const current = await getArtifact({ root, ownerKey, artifactId });
	if (!current) return { updated: false };

	const db = getArtifactDb(root);
	const next: ArtifactRecord = {
		...current,
		title: title === undefined ? current.title : cleanTitle(title),
		kind: kind === undefined ? current.kind : normalizeKind(kind),
		status: status === undefined ? current.status : normalizeStatus(status),
		content: content === undefined ? current.content : cleanContent(content),
		metadataJson:
			metadata === undefined ? current.metadataJson : safeJson(metadata, "{}"),
		sourceTraceJson:
			sourceTrace === undefined
				? current.sourceTraceJson
				: safeJson(sourceTrace, "{}"),
		updatedAt: nowIso(),
	};
	const contentChanged = next.content !== current.content;
	let revision: ArtifactRevisionRecord | undefined;

	const save = db.transaction(() => {
		db.prepare(`
UPDATE "artifacts"
SET "title" = ?, "kind" = ?, "status" = ?, "content" = ?, "metadataJson" = ?, "sourceTraceJson" = ?, "updatedAt" = ?
WHERE "id" = ? AND "ownerKey" = ?
`).run(
			next.title,
			next.kind,
			next.status,
			next.content,
			next.metadataJson,
			next.sourceTraceJson,
			next.updatedAt,
			artifactId,
			ownerKey,
		);
		if (contentChanged) {
			revision = {
				id: makeId("arev"),
				artifactId,
				content: next.content,
				summary: summary?.trim().slice(0, 240) || "Updated artifact",
				metadataJson: next.metadataJson,
				createdAt: next.updatedAt,
			};
			db.prepare(`
INSERT INTO "artifact_revisions"
("id", "artifactId", "content", "summary", "metadataJson", "createdAt")
VALUES (?, ?, ?, ?, ?, ?)
`).run(
				revision.id,
				revision.artifactId,
				revision.content,
				revision.summary || null,
				revision.metadataJson,
				revision.createdAt,
			);
		}
	});
	save();

	const saved = await getArtifact({ root, ownerKey, artifactId });
	return {
		updated: true,
		artifact: saved || next,
		revision,
	};
}

export async function archiveArtifact({
	root,
	ownerKey,
	artifactId,
}: {
	root: string;
	ownerKey: string;
	artifactId: string;
}) {
	return await updateArtifact({
		root,
		ownerKey,
		artifactId,
		status: "archived",
	});
}

export async function listArtifactRevisions({
	root,
	ownerKey,
	artifactId,
	limit = 20,
}: {
	root: string;
	ownerKey: string;
	artifactId: string;
	limit?: number;
}): Promise<ArtifactRevisionRecord[]> {
	const artifact = await getArtifact({ root, ownerKey, artifactId });
	if (!artifact) return [];
	const db = getArtifactDb(root);
	const rows = db
		.query(`
SELECT * FROM "artifact_revisions"
WHERE "artifactId" = ?
ORDER BY "createdAt" DESC
LIMIT ?
`)
		.all(artifactId, Math.max(1, Math.min(limit, 100))) as RevisionRow[];
	return rows.map(revisionFromRow);
}
