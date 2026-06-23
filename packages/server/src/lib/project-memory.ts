import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { Database } from "bun:sqlite";

export type ProjectStatus = "active" | "archived";
export type ProjectMemoryStatus = "active" | "disabled" | "forgotten";
export type GardenState = "sprout" | "rooted" | "withered" | "compost";

export type ProjectRecord = {
	id: string;
	ownerKey: string;
	name: string;
	slug: string;
	description?: string;
	status: ProjectStatus;
	localScope: string;
	memoryPolicyJson: string;
	createdAt: string;
	updatedAt: string;
};

export type ProjectMemoryRecord = {
	id: string;
	projectId: string;
	ownerKey: string;
	title?: string;
	content: string;
	source: string;
	status: ProjectMemoryStatus;
	gardenState: GardenState;
	strength: number;
	confidence: number;
	useCount: number;
	pinned: boolean;
	expiresAt?: string;
	lastUsedAt?: string;
	metadataJson: string;
	sourceTraceJson: string;
	createdAt: string;
	updatedAt: string;
};

export type ProjectMemoryContext = {
	context: string;
	memories: ProjectMemoryRecord[];
};

type ProjectRow = ProjectRecord & { ownerId?: string | null };
type MemoryRow = Omit<ProjectMemoryRecord, "pinned"> & {
	pinned: number | boolean;
};

const dbCache = new Map<string, Database>();
const MAX_PROJECT_NAME = 120;
const MAX_MEMORY_CONTENT = 2400;

function makeId(prefix: string) {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
	return new Date().toISOString();
}

function normalize(value: string) {
	return value.toLowerCase().normalize("NFKC");
}

function slugify(value: string) {
	const slug = normalize(value)
		.replace(/[^\p{L}\p{N}]+/gu, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64);
	return slug || `project-${Date.now().toString(36)}`;
}

function hash(value: string) {
	return createHash("sha256").update(value).digest("hex");
}

function safeJson(value: unknown) {
	try {
		return JSON.stringify(value || {});
	} catch {
		return "{}";
	}
}

function dbPathForRoot(root: string) {
	const dbUrl =
		process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:")
			? process.env.DATABASE_URL
			: `file:${join(root, "prisma", "dev.db")}`;
	const rawPath = dbUrl.slice("file:".length);
	return isAbsolute(rawPath) ? rawPath : resolve(root, rawPath);
}

function ensureColumn(db: Database, table: string, column: string, ddl: string) {
	const columns = db.query(`PRAGMA table_info("${table}")`).all() as Array<{
		name: string;
	}>;
	if (columns.some((candidate) => candidate.name === column)) return;
	db.exec(`ALTER TABLE "${table}" ADD COLUMN ${ddl}`);
}

function ensureProjectMemorySchema(db: Database) {
	db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "projects" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"ownerKey" TEXT NOT NULL,
	"ownerId" TEXT,
	"name" TEXT NOT NULL,
	"slug" TEXT NOT NULL,
	"description" TEXT,
	"status" TEXT NOT NULL DEFAULT 'active',
	"localScope" TEXT NOT NULL DEFAULT 'workspace',
	"memoryPolicyJson" TEXT NOT NULL DEFAULT '{}',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "project_members" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"projectId" TEXT NOT NULL,
	"ownerKey" TEXT NOT NULL,
	"userId" TEXT,
	"role" TEXT NOT NULL DEFAULT 'owner',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "project_memories" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"projectId" TEXT NOT NULL,
	"ownerKey" TEXT NOT NULL,
	"userId" TEXT,
	"title" TEXT,
	"content" TEXT NOT NULL,
	"source" TEXT NOT NULL DEFAULT 'manual',
	"status" TEXT NOT NULL DEFAULT 'active',
	"gardenState" TEXT NOT NULL DEFAULT 'sprout',
	"strength" REAL NOT NULL DEFAULT 0.5,
	"confidence" REAL NOT NULL DEFAULT 0.5,
	"useCount" INTEGER NOT NULL DEFAULT 0,
	"pinned" BOOLEAN NOT NULL DEFAULT false,
	"expiresAt" DATETIME,
	"lastUsedAt" DATETIME,
	"embeddingKey" TEXT,
	"metadataJson" TEXT NOT NULL DEFAULT '{}',
	"sourceTraceJson" TEXT NOT NULL DEFAULT '{}',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "memory_events" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"memoryId" TEXT NOT NULL,
	"ownerKey" TEXT NOT NULL,
	"userId" TEXT,
	"eventType" TEXT NOT NULL,
	"delta" REAL,
	"reason" TEXT,
	"payloadJson" TEXT NOT NULL DEFAULT '{}',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("memoryId") REFERENCES "project_memories" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "projects_ownerKey_slug_key" ON "projects"("ownerKey", "slug");
CREATE INDEX IF NOT EXISTS "projects_ownerKey_idx" ON "projects"("ownerKey");
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "project_members_projectId_ownerKey_key" ON "project_members"("projectId", "ownerKey");
CREATE INDEX IF NOT EXISTS "project_members_ownerKey_idx" ON "project_members"("ownerKey");
CREATE INDEX IF NOT EXISTS "project_memories_projectId_idx" ON "project_memories"("projectId");
CREATE INDEX IF NOT EXISTS "project_memories_ownerKey_idx" ON "project_memories"("ownerKey");
CREATE INDEX IF NOT EXISTS "project_memories_status_idx" ON "project_memories"("status");
CREATE INDEX IF NOT EXISTS "project_memories_gardenState_idx" ON "project_memories"("gardenState");
CREATE INDEX IF NOT EXISTS "project_memories_pinned_idx" ON "project_memories"("pinned");
CREATE INDEX IF NOT EXISTS "memory_events_memoryId_idx" ON "memory_events"("memoryId");
CREATE INDEX IF NOT EXISTS "memory_events_ownerKey_idx" ON "memory_events"("ownerKey");
CREATE INDEX IF NOT EXISTS "memory_events_eventType_idx" ON "memory_events"("eventType");
`);
	ensureColumn(db, "projects", "ownerKey", `"ownerKey" TEXT`);
	ensureColumn(db, "project_members", "ownerKey", `"ownerKey" TEXT`);
	ensureColumn(db, "project_memories", "ownerKey", `"ownerKey" TEXT`);
	ensureColumn(
		db,
		"project_memories",
		"metadataJson",
		`"metadataJson" TEXT NOT NULL DEFAULT '{}'`,
	);
	ensureColumn(db, "memory_events", "ownerKey", `"ownerKey" TEXT`);
}

function getProjectDb(root: string) {
	const path = dbPathForRoot(root);
	const existing = dbCache.get(path);
	if (existing) return existing;

	mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	ensureProjectMemorySchema(db);
	dbCache.set(path, db);
	return db;
}

export function closeProjectMemoryDatabases(root?: string) {
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

function projectFromRow(row: ProjectRow): ProjectRecord {
	return {
		id: row.id,
		ownerKey: row.ownerKey,
		name: row.name,
		slug: row.slug,
		description: row.description || undefined,
		status: row.status,
		localScope: row.localScope,
		memoryPolicyJson: row.memoryPolicyJson || "{}",
		createdAt: String(row.createdAt),
		updatedAt: String(row.updatedAt),
	};
}

function memoryFromRow(row: MemoryRow): ProjectMemoryRecord {
	return {
		id: row.id,
		projectId: row.projectId,
		ownerKey: row.ownerKey,
		title: row.title || undefined,
		content: row.content,
		source: row.source,
		status: row.status,
		gardenState: row.gardenState,
		strength: Number(row.strength),
		confidence: Number(row.confidence),
		useCount: Number(row.useCount),
		pinned: Boolean(row.pinned),
		expiresAt: row.expiresAt || undefined,
		lastUsedAt: row.lastUsedAt || undefined,
		metadataJson: row.metadataJson || "{}",
		sourceTraceJson: row.sourceTraceJson || "{}",
		createdAt: String(row.createdAt),
		updatedAt: String(row.updatedAt),
	};
}

function scoreMemory(memory: ProjectMemoryRecord, query: string) {
	const normalized = normalize(`${memory.title || ""}\n${memory.content}`);
	const terms = normalize(query)
		.replace(/[^\p{L}\p{N}_-]+/gu, " ")
		.split(/\s+/)
		.filter((term) => term.length >= 2);
	let score = memory.pinned ? 12 : 0;
	score += memory.strength * 8 + memory.confidence * 4;
	for (const term of new Set(terms)) {
		if (normalized.includes(term)) score += term.length + 3;
	}
	if (memory.gardenState === "rooted") score += 4;
	if (memory.gardenState === "withered") score -= 4;
	return score;
}

function nextGardenState(memory: ProjectMemoryRecord): GardenState {
	if (memory.pinned || memory.useCount >= 4 || memory.strength >= 0.78) {
		return "rooted";
	}
	if (memory.status === "forgotten") return "compost";
	if (memory.strength < 0.24) return "withered";
	return "sprout";
}

async function assertProjectAccess(root: string, ownerKey: string, projectId: string) {
	const db = getProjectDb(root);
	const row = db
		.query('SELECT * FROM "projects" WHERE "id" = ? AND "ownerKey" = ?')
		.get(projectId, ownerKey) as ProjectRow | undefined;
	return row ? projectFromRow(row) : null;
}

export async function createProject({
	root,
	ownerKey,
	name,
	description,
}: {
	root: string;
	ownerKey: string;
	name: string;
	description?: string;
}): Promise<ProjectRecord> {
	const db = getProjectDb(root);
	const cleanName = name.trim().slice(0, MAX_PROJECT_NAME);
	if (!cleanName) throw new Error("Project name is required");

	const baseSlug = slugify(cleanName);
	let slug = baseSlug;
	let suffix = 2;
	while (
		db
			.query('SELECT "id" FROM "projects" WHERE "ownerKey" = ? AND "slug" = ?')
			.get(ownerKey, slug)
	) {
		slug = `${baseSlug}-${suffix++}`;
	}

	const now = nowIso();
	const project: ProjectRecord = {
		id: makeId("proj"),
		ownerKey,
		name: cleanName,
		slug,
		description: description?.trim() || undefined,
		status: "active",
		localScope: "workspace",
		memoryPolicyJson: JSON.stringify({
			autoDecay: true,
			defaultGardenState: "sprout",
		}),
		createdAt: now,
		updatedAt: now,
	};

	const save = db.transaction(() => {
		db.prepare(`
INSERT INTO "projects"
("id", "ownerKey", "ownerId", "name", "slug", "description", "status", "localScope", "memoryPolicyJson", "createdAt", "updatedAt")
VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
			project.id,
			project.ownerKey,
			project.name,
			project.slug,
			project.description || null,
			project.status,
			project.localScope,
			project.memoryPolicyJson,
			project.createdAt,
			project.updatedAt,
		);
		db.prepare(`
INSERT INTO "project_members"
("id", "projectId", "ownerKey", "userId", "role", "createdAt")
VALUES (?, ?, ?, NULL, 'owner', ?)
`).run(makeId("pmem"), project.id, ownerKey, now);
	});
	save();
	return project;
}

export async function ensureDefaultProject(root: string, ownerKey: string) {
	const db = getProjectDb(root);
	const row = db
		.query(`
SELECT * FROM "projects"
WHERE "ownerKey" = ? AND "status" = 'active'
ORDER BY "createdAt" ASC
LIMIT 1
`)
		.get(ownerKey) as ProjectRow | undefined;
	if (row) return projectFromRow(row);

	return await createProject({
		root,
		ownerKey,
		name: "Daily Desk",
		description: "ElysiaAI local project memory",
	});
}

export async function listProjects({
	root,
	ownerKey,
	includeArchived = false,
}: {
	root: string;
	ownerKey: string;
	includeArchived?: boolean;
}): Promise<ProjectRecord[]> {
	await ensureDefaultProject(root, ownerKey);
	const db = getProjectDb(root);
	const rows = db
		.query(`
SELECT * FROM "projects"
WHERE "ownerKey" = ?
AND (? = 1 OR "status" != 'archived')
ORDER BY "updatedAt" DESC, "createdAt" DESC
`)
		.all(ownerKey, includeArchived ? 1 : 0) as ProjectRow[];
	return rows.map(projectFromRow);
}

export async function addProjectMemory({
	root,
	ownerKey,
	projectId,
	title,
	content,
	source = "manual",
	pinned = false,
	confidence = 0.7,
	metadata,
	sourceTrace,
}: {
	root: string;
	ownerKey: string;
	projectId: string;
	title?: string;
	content: string;
	source?: string;
	pinned?: boolean;
	confidence?: number;
	metadata?: unknown;
	sourceTrace?: unknown;
}): Promise<ProjectMemoryRecord> {
	const project = await assertProjectAccess(root, ownerKey, projectId);
	if (!project) throw new Error("Project not found");

	const cleanContent = content.trim().slice(0, MAX_MEMORY_CONTENT);
	if (!cleanContent) throw new Error("Project memory content is required");

	const now = nowIso();
	const memory: ProjectMemoryRecord = {
		id: makeId("pmry"),
		projectId,
		ownerKey,
		title: title?.trim().slice(0, 160) || undefined,
		content: cleanContent,
		source,
		status: "active",
		gardenState: pinned ? "rooted" : "sprout",
		strength: pinned ? 0.85 : 0.55,
		confidence: Math.max(0, Math.min(confidence, 1)),
		useCount: 0,
		pinned,
		metadataJson: safeJson(metadata),
		sourceTraceJson: JSON.stringify(sourceTrace || {}),
		createdAt: now,
		updatedAt: now,
	};

	const db = getProjectDb(root);
	const save = db.transaction(() => {
		db.prepare(`
INSERT INTO "project_memories"
("id", "projectId", "ownerKey", "userId", "title", "content", "source", "status", "gardenState", "strength", "confidence", "useCount", "pinned", "expiresAt", "lastUsedAt", "embeddingKey", "metadataJson", "sourceTraceJson", "createdAt", "updatedAt")
VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)
`).run(
			memory.id,
			memory.projectId,
			memory.ownerKey,
			memory.title || null,
			memory.content,
			memory.source,
			memory.status,
			memory.gardenState,
			memory.strength,
			memory.confidence,
			memory.useCount,
			memory.pinned ? 1 : 0,
			`memory:${hash(memory.content)}`,
			memory.metadataJson,
			memory.sourceTraceJson,
			memory.createdAt,
			memory.updatedAt,
		);
		db.prepare(`
INSERT INTO "memory_events"
("id", "memoryId", "ownerKey", "userId", "eventType", "delta", "reason", "payloadJson", "createdAt")
VALUES (?, ?, ?, NULL, 'created', ?, ?, ?, ?)
`).run(
			makeId("mevt"),
			memory.id,
			ownerKey,
			memory.strength,
			source,
			JSON.stringify({ pinned: memory.pinned, metadata }),
			now,
		);
	});
	save();
	return memory;
}

export async function listProjectMemories({
	root,
	ownerKey,
	projectId,
	includeInactive = true,
	limit = 50,
}: {
	root: string;
	ownerKey: string;
	projectId: string;
	includeInactive?: boolean;
	limit?: number;
}): Promise<ProjectMemoryRecord[]> {
	const project = await assertProjectAccess(root, ownerKey, projectId);
	if (!project) return [];
	const db = getProjectDb(root);
	const rows = db
		.query(`
SELECT * FROM "project_memories"
WHERE "projectId" = ? AND "ownerKey" = ?
AND (? = 1 OR "status" = 'active')
ORDER BY "pinned" DESC, "updatedAt" DESC, "createdAt" DESC
LIMIT ?
`)
		.all(
			projectId,
			ownerKey,
			includeInactive ? 1 : 0,
			Math.max(1, Math.min(limit, 200)),
		) as MemoryRow[];
	return rows.map(memoryFromRow);
}

export async function setProjectMemoryState({
	root,
	ownerKey,
	projectId,
	memoryId,
	status,
	pinned,
}: {
	root: string;
	ownerKey: string;
	projectId: string;
	memoryId: string;
	status?: ProjectMemoryStatus;
	pinned?: boolean;
}): Promise<{ updated: boolean; memory?: ProjectMemoryRecord }> {
	const project = await assertProjectAccess(root, ownerKey, projectId);
	if (!project) return { updated: false };
	const db = getProjectDb(root);
	const row = db
		.query('SELECT * FROM "project_memories" WHERE "id" = ? AND "projectId" = ? AND "ownerKey" = ?')
		.get(memoryId, projectId, ownerKey) as MemoryRow | undefined;
	if (!row) return { updated: false };

	const current = memoryFromRow(row);
	const nextStatus = status || current.status;
	const nextPinned = pinned === undefined ? current.pinned : pinned;
	const nextMemory: ProjectMemoryRecord = {
		...current,
		status: nextStatus,
		pinned: nextPinned,
		strength:
			nextStatus === "disabled"
				? Math.min(current.strength, 0.2)
				: nextStatus === "forgotten"
					? 0
					: nextPinned
						? Math.max(current.strength, 0.85)
						: Math.max(current.strength, 0.45),
		updatedAt: nowIso(),
	};
	nextMemory.gardenState = nextGardenState(nextMemory);

	const update = db.transaction(() => {
		db.prepare(`
UPDATE "project_memories"
SET "status" = ?, "pinned" = ?, "gardenState" = ?, "strength" = ?, "updatedAt" = ?
WHERE "id" = ?
`).run(
			nextMemory.status,
			nextMemory.pinned ? 1 : 0,
			nextMemory.gardenState,
			nextMemory.strength,
			nextMemory.updatedAt,
			memoryId,
		);
		db.prepare(`
INSERT INTO "memory_events"
("id", "memoryId", "ownerKey", "userId", "eventType", "delta", "reason", "payloadJson", "createdAt")
VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)
`).run(
			makeId("mevt"),
			memoryId,
			ownerKey,
			nextStatus === "forgotten" ? "forgotten" : "updated",
			nextMemory.strength - current.strength,
			"manual",
			JSON.stringify({ status: nextMemory.status, pinned: nextMemory.pinned }),
			nextMemory.updatedAt,
		);
	});
	update();
	return { updated: true, memory: nextMemory };
}

export async function buildProjectMemoryContext({
	root,
	ownerKey,
	projectId,
	query,
	limit = 5,
	markUsed = true,
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
	query: string;
	limit?: number;
	markUsed?: boolean;
}): Promise<ProjectMemoryContext> {
	const project = projectId
		? await assertProjectAccess(root, ownerKey, projectId)
		: await ensureDefaultProject(root, ownerKey);
	if (!project) return { context: "", memories: [] };

	const memories = await listProjectMemories({
		root,
		ownerKey,
		projectId: project.id,
		includeInactive: false,
		limit: 100,
	});
	const selected = memories
		.map((memory) => ({ memory, score: scoreMemory(memory, query) }))
		.filter(({ score }) => score > 0)
		.sort(
			(left, right) =>
				right.score - left.score ||
				Number(right.memory.pinned) - Number(left.memory.pinned),
		)
		.slice(0, Math.max(1, Math.min(limit, 12)))
		.map(({ memory }) => memory);

	if (markUsed && selected.length > 0) {
		const db = getProjectDb(root);
		const now = nowIso();
		const touch = db.transaction((items: ProjectMemoryRecord[]) => {
			for (const memory of items) {
				const next: ProjectMemoryRecord = {
					...memory,
					useCount: memory.useCount + 1,
					strength: Math.min(1, memory.strength + 0.08),
					lastUsedAt: now,
					updatedAt: now,
				};
				next.gardenState = nextGardenState(next);
				db.prepare(`
UPDATE "project_memories"
SET "useCount" = ?, "strength" = ?, "gardenState" = ?, "lastUsedAt" = ?, "updatedAt" = ?
WHERE "id" = ?
`).run(next.useCount, next.strength, next.gardenState, now, now, next.id);
				db.prepare(`
INSERT INTO "memory_events"
("id", "memoryId", "ownerKey", "userId", "eventType", "delta", "reason", "payloadJson", "createdAt")
VALUES (?, ?, ?, NULL, 'used', ?, 'context-build', ?, ?)
`).run(
					makeId("mevt"),
					next.id,
					ownerKey,
					next.strength - memory.strength,
					JSON.stringify({ query: query.slice(0, 240) }),
					now,
				);
				Object.assign(memory, next);
			}
		});
		touch(selected);
	}

	const context = selected
		.map((memory) =>
			[
				`[project-memory:${project.name}:${memory.gardenState}${memory.pinned ? ":pinned" : ""}]`,
				memory.title ? `${memory.title}: ${memory.content}` : memory.content,
			].join("\n"),
		)
		.join("\n\n");

	return { context, memories: selected };
}
