import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export type TesterEventType =
	| "session"
	| "feature"
	| "friction"
	| "feedback"
	| "milestone";
export type TesterEventOutcome =
	| "started"
	| "success"
	| "attention"
	| "blocked"
	| "skipped"
	| "error"
	| "neutral";
export type TesterEventSeverity = "info" | "low" | "medium" | "high";

export type TesterEventRecord = {
	id: string;
	ownerKey: string;
	userId?: string;
	projectId?: string;
	testerHash?: string;
	sessionId?: string;
	eventType: TesterEventType;
	area: string;
	action: string;
	outcome: TesterEventOutcome;
	severity: TesterEventSeverity;
	durationMs?: number;
	payloadHash?: string;
	metadataJson: string;
	createdAt: string;
};

export type TesterAnalyticsReport = {
	generatedAt: string;
	summary: {
		totalEvents: number;
		activeDays: number;
		sessions: number;
		successes: number;
		frictions: number;
		feedback: number;
		avgDurationMs?: number;
	};
	featureUsage: Array<{
		area: string;
		events: number;
		successes: number;
		frictions: number;
	}>;
	outcomes: Record<string, number>;
	frictionAreas: Array<{ area: string; count: number; highSeverity: number }>;
	recent: TesterEventRecord[];
	recommendations: string[];
};

type TesterEventRow = Omit<TesterEventRecord, "durationMs"> & {
	durationMs?: number | null;
};

const dbCache = new Map<string, Database>();
const VALID_EVENT_TYPES = new Set<TesterEventType>([
	"session",
	"feature",
	"friction",
	"feedback",
	"milestone",
]);
const VALID_OUTCOMES = new Set<TesterEventOutcome>([
	"started",
	"success",
	"attention",
	"blocked",
	"skipped",
	"error",
	"neutral",
]);
const VALID_SEVERITIES = new Set<TesterEventSeverity>([
	"info",
	"low",
	"medium",
	"high",
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

function ensureTesterAnalyticsSchema(db: Database) {
	db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "tester_events" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"ownerKey" TEXT NOT NULL,
	"userId" TEXT,
	"projectId" TEXT,
	"testerHash" TEXT,
	"sessionId" TEXT,
	"eventType" TEXT NOT NULL,
	"area" TEXT NOT NULL,
	"action" TEXT NOT NULL,
	"outcome" TEXT NOT NULL DEFAULT 'neutral',
	"severity" TEXT NOT NULL DEFAULT 'info',
	"durationMs" INTEGER,
	"payloadHash" TEXT,
	"metadataJson" TEXT NOT NULL DEFAULT '{}',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "tester_events_ownerKey_idx" ON "tester_events"("ownerKey");
CREATE INDEX IF NOT EXISTS "tester_events_userId_idx" ON "tester_events"("userId");
CREATE INDEX IF NOT EXISTS "tester_events_projectId_idx" ON "tester_events"("projectId");
CREATE INDEX IF NOT EXISTS "tester_events_sessionId_idx" ON "tester_events"("sessionId");
CREATE INDEX IF NOT EXISTS "tester_events_eventType_idx" ON "tester_events"("eventType");
CREATE INDEX IF NOT EXISTS "tester_events_area_idx" ON "tester_events"("area");
CREATE INDEX IF NOT EXISTS "tester_events_outcome_idx" ON "tester_events"("outcome");
CREATE INDEX IF NOT EXISTS "tester_events_createdAt_idx" ON "tester_events"("createdAt");
`);
	ensureColumn(db, "tester_events", "ownerKey", `"ownerKey" TEXT`);
}

function getTesterDb(root: string) {
	const path = dbPathForRoot(root);
	const existing = dbCache.get(path);
	if (existing) return existing;

	mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	ensureTesterAnalyticsSchema(db);
	dbCache.set(path, db);
	return db;
}

export function closeTesterAnalyticsDatabases(root?: string) {
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

function safeJson(value: unknown) {
	try {
		return JSON.stringify(value || {});
	} catch {
		return "{}";
	}
}

function hashPayload(value: unknown) {
	if (value === undefined || value === null) return undefined;
	const normalized = typeof value === "string" ? value : JSON.stringify(value);
	return createHash("sha256").update(normalized).digest("hex");
}

function normalizeToken(value: unknown, fallback: string, max = 80) {
	return (
		String(value || fallback)
			.trim()
			.toLowerCase()
			.replace(/[^\p{L}\p{N}_-]+/gu, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, max) || fallback
	);
}

function normalizeEventType(value?: string): TesterEventType {
	const normalized = normalizeToken(value, "feature") as TesterEventType;
	return VALID_EVENT_TYPES.has(normalized) ? normalized : "feature";
}

function normalizeOutcome(value?: string): TesterEventOutcome {
	const normalized = normalizeToken(value, "neutral") as TesterEventOutcome;
	return VALID_OUTCOMES.has(normalized) ? normalized : "neutral";
}

function normalizeSeverity(value?: string): TesterEventSeverity {
	const normalized = normalizeToken(value, "info") as TesterEventSeverity;
	return VALID_SEVERITIES.has(normalized) ? normalized : "info";
}

function eventFromRow(row: TesterEventRow): TesterEventRecord {
	return {
		id: row.id,
		ownerKey: row.ownerKey,
		userId: row.userId || undefined,
		projectId: row.projectId || undefined,
		testerHash: row.testerHash || undefined,
		sessionId: row.sessionId || undefined,
		eventType: normalizeEventType(row.eventType),
		area: row.area,
		action: row.action,
		outcome: normalizeOutcome(row.outcome),
		severity: normalizeSeverity(row.severity),
		durationMs:
			row.durationMs === null || row.durationMs === undefined
				? undefined
				: Number(row.durationMs),
		payloadHash: row.payloadHash || undefined,
		metadataJson: row.metadataJson || "{}",
		createdAt: String(row.createdAt),
	};
}

function clampLimit(value: number | undefined, fallback: number, max: number) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return fallback;
	return Math.max(1, Math.min(Math.trunc(numeric), max));
}

function countBy<T extends string>(
	items: TesterEventRecord[],
	pick: (item: TesterEventRecord) => T,
) {
	return items.reduce<Record<string, number>>((counts, item) => {
		const key = pick(item);
		counts[key] = (counts[key] || 0) + 1;
		return counts;
	}, {});
}

function isFriction(event: TesterEventRecord) {
	return (
		event.eventType === "friction" ||
		["attention", "blocked", "error"].includes(event.outcome) ||
		event.severity === "high"
	);
}

function buildFeatureUsage(events: TesterEventRecord[]) {
	const areas = [...new Set(events.map((event) => event.area))].sort();
	return areas
		.map((area) => {
			const areaEvents = events.filter((event) => event.area === area);
			return {
				area,
				events: areaEvents.length,
				successes: areaEvents.filter((event) => event.outcome === "success")
					.length,
				frictions: areaEvents.filter(isFriction).length,
			};
		})
		.sort(
			(left, right) =>
				right.events - left.events || left.area.localeCompare(right.area),
		);
}

function buildFrictionAreas(events: TesterEventRecord[]) {
	return buildFeatureUsage(events.filter(isFriction))
		.map((item) => {
			const areaEvents = events.filter(
				(event) => event.area === item.area && isFriction(event),
			);
			return {
				area: item.area,
				count: areaEvents.length,
				highSeverity: areaEvents.filter((event) => event.severity === "high")
					.length,
			};
		})
		.sort(
			(left, right) =>
				right.count - left.count || right.highSeverity - left.highSeverity,
		);
}

function buildRecommendations(events: TesterEventRecord[]) {
	const recommendations: string[] = [];
	const featureUsage = buildFeatureUsage(events);
	const frictionAreas = buildFrictionAreas(events);
	const hasChatSuccess = events.some(
		(event) => event.area === "chat" && event.outcome === "success",
	);
	const hasSetupBlocked = events.some(
		(event) =>
			event.area === "setup" && ["blocked", "error"].includes(event.outcome),
	);
	const hasRagUsage = events.some((event) => event.area === "knowledge");

	if (events.length === 0) {
		recommendations.push(
			"まずSetup Wizard、チャット、Knowledge Importを1回ずつ触ってもらう",
		);
		return recommendations;
	}
	if (hasSetupBlocked) {
		recommendations.push(
			"初回起動の詰まりを最優先で直す。Setup Wizardの表示文と復帰導線を確認する",
		);
	}
	if (!hasChatSuccess) {
		recommendations.push(
			"チャット成功までの導線を確認する。local-ollama表示と失敗時メッセージを短くする",
		);
	}
	if (!hasRagUsage) {
		recommendations.push(
			"Knowledge Importへの入口を目立たせ、PDF投入後の成功状態を明確にする",
		);
	}
	if (frictionAreas[0]) {
		recommendations.push(
			`${frictionAreas[0].area}で摩擦が多い。直近イベントを見て文言とボタン配置を調整する`,
		);
	}
	if (featureUsage.length > 0 && recommendations.length < 4) {
		recommendations.push(
			`${featureUsage[0].area}はよく触られている。ここをBeta 0.1のデモ導線に据える`,
		);
	}
	return recommendations.slice(0, 5);
}

export async function recordTesterEvent({
	root,
	ownerKey,
	userId,
	projectId,
	testerId,
	sessionId,
	eventType,
	area,
	action,
	outcome,
	severity,
	durationMs,
	metadata,
	payload,
}: {
	root: string;
	ownerKey: string;
	userId?: string;
	projectId?: string;
	testerId?: string;
	sessionId?: string;
	eventType?: string;
	area?: string;
	action?: string;
	outcome?: string;
	severity?: string;
	durationMs?: number;
	metadata?: unknown;
	payload?: unknown;
}): Promise<TesterEventRecord> {
	const event: TesterEventRecord = {
		id: makeId("tevt"),
		ownerKey,
		userId,
		projectId,
		testerHash: testerId ? hashPayload(testerId) : undefined,
		sessionId: sessionId?.trim().slice(0, 120) || undefined,
		eventType: normalizeEventType(eventType),
		area: normalizeToken(area, "unknown"),
		action: normalizeToken(action, "event", 120),
		outcome: normalizeOutcome(outcome),
		severity: normalizeSeverity(severity),
		durationMs: Number.isFinite(Number(durationMs))
			? Math.max(0, Math.trunc(Number(durationMs)))
			: undefined,
		payloadHash: hashPayload(payload),
		metadataJson: safeJson(metadata),
		createdAt: nowIso(),
	};
	const db = getTesterDb(root);
	db.prepare(`
INSERT INTO "tester_events"
("id", "ownerKey", "userId", "projectId", "testerHash", "sessionId", "eventType", "area", "action", "outcome", "severity", "durationMs", "payloadHash", "metadataJson", "createdAt")
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
		event.id,
		event.ownerKey,
		event.userId || null,
		event.projectId || null,
		event.testerHash || null,
		event.sessionId || null,
		event.eventType,
		event.area,
		event.action,
		event.outcome,
		event.severity,
		event.durationMs ?? null,
		event.payloadHash || null,
		event.metadataJson,
		event.createdAt,
	);
	return event;
}

export async function listTesterEvents({
	root,
	ownerKey,
	projectId,
	area,
	limit = 100,
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
	area?: string;
	limit?: number;
}): Promise<TesterEventRecord[]> {
	const db = getTesterDb(root);
	const rows = db
		.query(`
SELECT * FROM "tester_events"
WHERE "ownerKey" = ?
AND (? IS NULL OR "projectId" = ?)
AND (? IS NULL OR "area" = ?)
ORDER BY "createdAt" DESC
LIMIT ?
`)
		.all(
			ownerKey,
			projectId || null,
			projectId || null,
			area ? normalizeToken(area, "unknown") : null,
			area ? normalizeToken(area, "unknown") : null,
			clampLimit(limit, 100, 500),
		) as TesterEventRow[];
	return rows.map(eventFromRow);
}

export async function buildTesterAnalyticsReport({
	root,
	ownerKey,
	projectId,
	limit = 240,
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
	limit?: number;
}): Promise<TesterAnalyticsReport> {
	const events = await listTesterEvents({
		root,
		ownerKey,
		projectId,
		limit,
	});
	const durations = events
		.map((event) => event.durationMs)
		.filter((duration): duration is number => Number.isFinite(duration));
	const activeDays = new Set(
		events.map((event) => event.createdAt.slice(0, 10)),
	).size;
	return {
		generatedAt: nowIso(),
		summary: {
			totalEvents: events.length,
			activeDays,
			sessions: new Set(events.map((event) => event.sessionId).filter(Boolean))
				.size,
			successes: events.filter((event) => event.outcome === "success").length,
			frictions: events.filter(isFriction).length,
			feedback: events.filter((event) => event.eventType === "feedback").length,
			avgDurationMs:
				durations.length > 0
					? Math.round(
							durations.reduce((sum, value) => sum + value, 0) /
								durations.length,
						)
					: undefined,
		},
		featureUsage: buildFeatureUsage(events).slice(0, 12),
		outcomes: countBy(events, (event) => event.outcome),
		frictionAreas: buildFrictionAreas(events).slice(0, 8),
		recent: events.slice(0, 16),
		recommendations: buildRecommendations(events),
	};
}
