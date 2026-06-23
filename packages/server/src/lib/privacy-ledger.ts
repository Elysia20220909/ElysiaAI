import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { Database } from "bun:sqlite";

export type PrivacyDirection =
	| "local"
	| "local-service"
	| "inbound"
	| "outbound"
	| "external";
export type PrivacyApprovalStatus =
	| "not-required"
	| "not-configured"
	| "required"
	| "pending"
	| "approved"
	| "denied";
export type PrivacyRiskLevel = "low" | "medium" | "high";

export type PrivacyEventRecord = {
	id: string;
	ownerKey: string;
	userId?: string;
	projectId?: string;
	scope: string;
	provider: string;
	direction: PrivacyDirection;
	purpose: string;
	dataClass: string;
	approvalStatus: PrivacyApprovalStatus;
	localOnly: boolean;
	riskLevel: PrivacyRiskLevel;
	payloadHash?: string;
	metadataJson: string;
	createdAt: string;
};

export type PrivacyPostureItem = {
	id: string;
	label: string;
	scope: string;
	provider: string;
	direction: PrivacyDirection;
	purpose: string;
	dataClass: string;
	localOnly: boolean;
	riskLevel: PrivacyRiskLevel;
	approvalStatus: PrivacyApprovalStatus;
	configured: boolean;
	eventCount: number;
	lastEventAt?: string;
	detail: string;
};

export type PrivacyLedgerSummary = {
	total: number;
	localOnly: number;
	external: number;
	requiresApproval: number;
	highRisk: number;
	recentAt?: string;
};

type PrivacyEventRow = Omit<PrivacyEventRecord, "localOnly"> & {
	localOnly: number | boolean;
};

const dbCache = new Map<string, Database>();
const validDirections = new Set<PrivacyDirection>([
	"local",
	"local-service",
	"inbound",
	"outbound",
	"external",
]);
const validApprovalStatuses = new Set<PrivacyApprovalStatus>([
	"not-required",
	"not-configured",
	"required",
	"pending",
	"approved",
	"denied",
]);
const validRiskLevels = new Set<PrivacyRiskLevel>(["low", "medium", "high"]);

function makeId(prefix: string) {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
	return new Date().toISOString();
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

function ensurePrivacyLedgerSchema(db: Database) {
	db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "privacy_events" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"ownerKey" TEXT NOT NULL,
	"userId" TEXT,
	"projectId" TEXT,
	"scope" TEXT NOT NULL,
	"provider" TEXT NOT NULL,
	"direction" TEXT NOT NULL DEFAULT 'local',
	"purpose" TEXT NOT NULL,
	"dataClass" TEXT NOT NULL DEFAULT 'unknown',
	"approvalStatus" TEXT NOT NULL DEFAULT 'not-required',
	"localOnly" BOOLEAN NOT NULL DEFAULT true,
	"riskLevel" TEXT NOT NULL DEFAULT 'low',
	"payloadHash" TEXT,
	"metadataJson" TEXT NOT NULL DEFAULT '{}',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "privacy_events_ownerKey_idx" ON "privacy_events"("ownerKey");
CREATE INDEX IF NOT EXISTS "privacy_events_userId_idx" ON "privacy_events"("userId");
CREATE INDEX IF NOT EXISTS "privacy_events_projectId_idx" ON "privacy_events"("projectId");
CREATE INDEX IF NOT EXISTS "privacy_events_provider_idx" ON "privacy_events"("provider");
CREATE INDEX IF NOT EXISTS "privacy_events_scope_idx" ON "privacy_events"("scope");
CREATE INDEX IF NOT EXISTS "privacy_events_approvalStatus_idx" ON "privacy_events"("approvalStatus");
CREATE INDEX IF NOT EXISTS "privacy_events_riskLevel_idx" ON "privacy_events"("riskLevel");
CREATE INDEX IF NOT EXISTS "privacy_events_createdAt_idx" ON "privacy_events"("createdAt");
`);
	ensureColumn(db, "privacy_events", "ownerKey", `"ownerKey" TEXT`);
}

function getPrivacyDb(root: string) {
	const path = dbPathForRoot(root);
	const existing = dbCache.get(path);
	if (existing) return existing;

	mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	ensurePrivacyLedgerSchema(db);
	dbCache.set(path, db);
	return db;
}

export function closePrivacyLedgerDatabases(root?: string) {
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

function safeJson(value: unknown, fallback = "{}") {
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

function payloadHash(value: unknown) {
	if (value === undefined || value === null) return undefined;
	if (value instanceof Uint8Array) {
		return createHash("sha256").update(value).digest("hex");
	}
	const normalized = typeof value === "string" ? value : JSON.stringify(value);
	return createHash("sha256").update(normalized).digest("hex");
}

function normalizeDirection(value?: string): PrivacyDirection {
	const direction = (value || "local").trim().toLowerCase() as PrivacyDirection;
	if (!validDirections.has(direction)) throw new Error("Invalid privacy direction");
	return direction;
}

function normalizeApprovalStatus(value?: string): PrivacyApprovalStatus {
	const status = (value || "not-required")
		.trim()
		.toLowerCase() as PrivacyApprovalStatus;
	if (!validApprovalStatuses.has(status)) {
		throw new Error("Invalid privacy approval status");
	}
	return status;
}

function normalizeRiskLevel(value?: string): PrivacyRiskLevel {
	const risk = (value || "low").trim().toLowerCase() as PrivacyRiskLevel;
	if (!validRiskLevels.has(risk)) throw new Error("Invalid privacy risk level");
	return risk;
}

function eventFromRow(row: PrivacyEventRow): PrivacyEventRecord {
	return {
		id: row.id,
		ownerKey: row.ownerKey,
		userId: row.userId || undefined,
		projectId: row.projectId || undefined,
		scope: row.scope,
		provider: row.provider,
		direction: normalizeDirection(row.direction),
		purpose: row.purpose,
		dataClass: row.dataClass,
		approvalStatus: normalizeApprovalStatus(row.approvalStatus),
		localOnly: Boolean(row.localOnly),
		riskLevel: normalizeRiskLevel(row.riskLevel),
		payloadHash: row.payloadHash || undefined,
		metadataJson: row.metadataJson || "{}",
		createdAt: String(row.createdAt),
	};
}

function isConfigured(...names: string[]) {
	return names.some((name) => Boolean(process.env[name]?.trim()));
}

function clampLimit(value: number | undefined, fallback: number, max: number) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return fallback;
	return Math.max(1, Math.min(Math.trunc(numeric), max));
}

function summarize(events: PrivacyEventRecord[]): PrivacyLedgerSummary {
	return {
		total: events.length,
		localOnly: events.filter((event) => event.localOnly).length,
		external: events.filter((event) => !event.localOnly).length,
		requiresApproval: events.filter((event) =>
			["required", "pending"].includes(event.approvalStatus),
		).length,
		highRisk: events.filter((event) => event.riskLevel === "high").length,
		recentAt: events[0]?.createdAt,
	};
}

function postureCatalog(): Array<Omit<PrivacyPostureItem, "eventCount" | "lastEventAt">> {
	const openAiConfigured = isConfigured("OPENAI_API_KEY");
	const groqConfigured = isConfigured("GROQ_API_KEY");
	const slackConfigured = isConfigured(
		"SLACK_WEBHOOK_URL",
		"SLACK_BOT_TOKEN",
		"SLACK_APP_TOKEN",
	);
	const discordConfigured = isConfigured("DISCORD_WEBHOOK_URL");
	return [
		{
			id: "chat-local",
			label: "Local Chat",
			scope: "chat",
			provider: "local-ollama",
			direction: "local-service",
			purpose: "ローカルLLM推論",
			dataClass: "conversation",
			localOnly: true,
			riskLevel: "low",
			approvalStatus: "not-required",
			configured: true,
			detail: "Ollamaまたはローカルfallbackで処理します。会話内容を外部へ送信しません。",
		},
		{
			id: "knowledge-rag",
			label: "RAG / Knowledge",
			scope: "knowledge",
			provider: "sqlite-fts-local",
			direction: "local",
			purpose: "文書抽出、検索、再索引",
			dataClass: "documents",
			localOnly: true,
			riskLevel: "low",
			approvalStatus: "not-required",
			configured: true,
			detail: "投入文書とチャンクはローカルDBへ保存されます。",
		},
		{
			id: "project-memory",
			label: "Project Memory",
			scope: "project-memory",
			provider: "sqlite-local",
			direction: "local",
			purpose: "プロジェクト記憶の保存と利用",
			dataClass: "memory",
			localOnly: true,
			riskLevel: "low",
			approvalStatus: "not-required",
			configured: true,
			detail: "記憶はowner/project境界でローカル保存されます。",
		},
		{
			id: "artifact-workbench",
			label: "Artifact Workbench",
			scope: "artifact",
			provider: "sqlite-local",
			direction: "local",
			purpose: "成果物と履歴の保存",
			dataClass: "artifacts",
			localOnly: true,
			riskLevel: "low",
			approvalStatus: "not-required",
			configured: true,
			detail: "回答から作った成果物はローカルDBに残ります。",
		},
		{
			id: "voicevox",
			label: "VOICEVOX",
			scope: "voice",
			provider: "voicevox-local",
			direction: "local-service",
			purpose: "ローカル音声合成",
			dataClass: "text-to-speech",
			localOnly: true,
			riskLevel: "low",
			approvalStatus: "not-required",
			configured: true,
			detail: "127.0.0.1のVOICEVOXへテキストを渡す想定です。",
		},
		{
			id: "openai",
			label: "OpenAI",
			scope: "model-provider",
			provider: "openai",
			direction: "external",
			purpose: "外部LLMまたはEmbedding",
			dataClass: "conversation/documents",
			localOnly: false,
			riskLevel: "medium",
			approvalStatus: openAiConfigured ? "required" : "not-configured",
			configured: openAiConfigured,
			detail: "利用時は外部APIへ内容が送信されるため、実行前承認が必要です。",
		},
		{
			id: "groq",
			label: "Groq",
			scope: "model-provider",
			provider: "groq",
			direction: "external",
			purpose: "外部LLM推論",
			dataClass: "conversation",
			localOnly: false,
			riskLevel: "medium",
			approvalStatus: groqConfigured ? "required" : "not-configured",
			configured: groqConfigured,
			detail: "設定されている場合も、外部送信は承認ゲートの対象です。",
		},
		{
			id: "slack",
			label: "Slack",
			scope: "external-connector",
			provider: "slack",
			direction: "external",
			purpose: "通知、コマンド、チーム連携",
			dataClass: "operator messages",
			localOnly: false,
			riskLevel: "high",
			approvalStatus: slackConfigured ? "required" : "not-configured",
			configured: slackConfigured,
			detail: "ワークスペース外部へ投稿するため、送信前に人間の確認が必要です。",
		},
		{
			id: "discord",
			label: "Discord",
			scope: "external-connector",
			provider: "discord",
			direction: "external",
			purpose: "エラー通知、Webhook通知",
			dataClass: "alerts",
			localOnly: false,
			riskLevel: "high",
			approvalStatus: discordConfigured ? "required" : "not-configured",
			configured: discordConfigured,
			detail: "Webhook通知は外部送信のため、監査対象にします。",
		},
	];
}

function matchesPostureItem(
	item: Omit<PrivacyPostureItem, "eventCount" | "lastEventAt">,
	event: PrivacyEventRecord,
) {
	if (item.id === "chat-local") return event.scope === "chat";
	if (item.id === "knowledge-rag") return event.scope === "knowledge";
	if (item.id === "project-memory") return event.scope === "project-memory";
	if (item.id === "artifact-workbench") return event.scope === "artifact";
	return event.provider === item.provider;
}

export async function recordPrivacyEvent({
	root,
	ownerKey,
	projectId,
	scope,
	provider,
	direction = "local",
	purpose,
	dataClass = "unknown",
	approvalStatus = "not-required",
	localOnly = true,
	riskLevel = "low",
	payload,
	metadata,
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
	scope: string;
	provider: string;
	direction?: string;
	purpose: string;
	dataClass?: string;
	approvalStatus?: string;
	localOnly?: boolean;
	riskLevel?: string;
	payload?: unknown;
	metadata?: unknown;
}): Promise<PrivacyEventRecord> {
	const cleanScope = scope.trim().slice(0, 80);
	const cleanProvider = provider.trim().slice(0, 80);
	const cleanPurpose = purpose.trim().slice(0, 240);
	if (!cleanScope) throw new Error("Privacy scope is required");
	if (!cleanProvider) throw new Error("Privacy provider is required");
	if (!cleanPurpose) throw new Error("Privacy purpose is required");

	const event: PrivacyEventRecord = {
		id: makeId("pevt"),
		ownerKey,
		projectId: projectId || undefined,
		scope: cleanScope,
		provider: cleanProvider,
		direction: normalizeDirection(direction),
		purpose: cleanPurpose,
		dataClass: dataClass.trim().slice(0, 120) || "unknown",
		approvalStatus: normalizeApprovalStatus(approvalStatus),
		localOnly,
		riskLevel: normalizeRiskLevel(riskLevel),
		payloadHash: payloadHash(payload),
		metadataJson: safeJson(metadata),
		createdAt: nowIso(),
	};
	const db = getPrivacyDb(root);
	db.prepare(`
INSERT INTO "privacy_events"
("id", "ownerKey", "userId", "projectId", "scope", "provider", "direction", "purpose", "dataClass", "approvalStatus", "localOnly", "riskLevel", "payloadHash", "metadataJson", "createdAt")
VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
		event.id,
		event.ownerKey,
		event.projectId || null,
		event.scope,
		event.provider,
		event.direction,
		event.purpose,
		event.dataClass,
		event.approvalStatus,
		event.localOnly ? 1 : 0,
		event.riskLevel,
		event.payloadHash || null,
		event.metadataJson,
		event.createdAt,
	);
	return event;
}

export async function listPrivacyEvents({
	root,
	ownerKey,
	projectId,
	provider,
	limit = 80,
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
	provider?: string;
	limit?: number;
}): Promise<PrivacyEventRecord[]> {
	const db = getPrivacyDb(root);
	const rows = db
		.query(`
SELECT * FROM "privacy_events"
WHERE "ownerKey" = ?
AND (? IS NULL OR "projectId" = ?)
AND (? IS NULL OR "provider" = ?)
ORDER BY "createdAt" DESC
LIMIT ?
`)
		.all(
			ownerKey,
			projectId || null,
			projectId || null,
			provider || null,
			provider || null,
			clampLimit(limit, 80, 300),
		) as PrivacyEventRow[];
	return rows.map(eventFromRow);
}

export async function buildPrivacyPosture({
	root,
	ownerKey,
	projectId,
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
}): Promise<PrivacyPostureItem[]> {
	const events = await listPrivacyEvents({
		root,
		ownerKey,
		projectId,
		limit: 300,
	});
	return postureCatalog().map((item) => {
		const itemEvents = events.filter((event) => matchesPostureItem(item, event));
		return {
			...item,
			eventCount: itemEvents.length,
			lastEventAt: itemEvents[0]?.createdAt,
		};
	});
}

export async function buildPrivacyLedgerReport({
	root,
	ownerKey,
	projectId,
	limit = 80,
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
	limit?: number;
}) {
	const events = await listPrivacyEvents({ root, ownerKey, projectId, limit });
	return {
		generatedAt: nowIso(),
		summary: summarize(events),
		posture: await buildPrivacyPosture({ root, ownerKey, projectId }),
		events,
	};
}
