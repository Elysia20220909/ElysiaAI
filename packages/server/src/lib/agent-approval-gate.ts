import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { Database } from "bun:sqlite";

export type AgentActionClass =
	| "read"
	| "write-file"
	| "delete-file"
	| "os-command"
	| "external-send"
	| "network-call"
	| "secret-access"
	| "deploy"
	| "unknown";
export type AgentGateDecision = "allow" | "approval-required" | "deny";
export type ToolApprovalStatus =
	| "pending"
	| "approved"
	| "denied"
	| "expired"
	| "revoked";
export type AgentRiskLevel = "low" | "medium" | "high" | "critical";

export type AgentPlanRecord = {
	id: string;
	ownerKey: string;
	projectId?: string;
	userId?: string;
	title: string;
	goal: string;
	status: string;
	riskLevel: AgentRiskLevel;
	source: string;
	metadataJson: string;
	createdAt: string;
	updatedAt: string;
};

export type AgentStepRecord = {
	id: string;
	planId: string;
	position: number;
	title: string;
	detail?: string;
	status: string;
	requiredGate: AgentActionClass;
	toolName?: string;
	createdAt: string;
	updatedAt: string;
};

export type ToolApprovalRecord = {
	id: string;
	ownerKey: string;
	planId?: string;
	stepId?: string;
	requestedById?: string;
	decidedById?: string;
	toolName: string;
	actionClass: AgentActionClass;
	riskLevel: AgentRiskLevel;
	status: ToolApprovalStatus;
	requestJson: string;
	requestHash?: string;
	decisionReason?: string;
	expiresAt?: string;
	decidedAt?: string;
	createdAt: string;
	updatedAt: string;
};

export type AgentGateEvaluation = {
	actionClass: AgentActionClass;
	decision: AgentGateDecision;
	riskLevel: AgentRiskLevel;
	reasons: string[];
	requiredApproval: boolean;
};

type AgentPlanRow = AgentPlanRecord & {
	projectId?: string | null;
	userId?: string | null;
};
type AgentStepRow = Omit<AgentStepRecord, "position"> & {
	position: number;
	detail?: string | null;
	toolName?: string | null;
};
type ToolApprovalRow = Omit<ToolApprovalRecord, "requestHash"> & {
	planId?: string | null;
	stepId?: string | null;
	requestedById?: string | null;
	decidedById?: string | null;
	decisionReason?: string | null;
	expiresAt?: string | null;
	decidedAt?: string | null;
};

const dbCache = new Map<string, Database>();
const validActions = new Set<AgentActionClass>([
	"read",
	"write-file",
	"delete-file",
	"os-command",
	"external-send",
	"network-call",
	"secret-access",
	"deploy",
	"unknown",
]);
const validStatuses = new Set<ToolApprovalStatus>([
	"pending",
	"approved",
	"denied",
	"expired",
	"revoked",
]);
const validRisks = new Set<AgentRiskLevel>([
	"low",
	"medium",
	"high",
	"critical",
]);

function makeId(prefix: string) {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
	return new Date().toISOString();
}

function addMinutes(date: Date, minutes: number) {
	return new Date(date.getTime() + minutes * 60_000).toISOString();
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

function ensureAgentGateSchema(db: Database) {
	db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "agent_plans" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"ownerKey" TEXT NOT NULL,
	"userId" TEXT,
	"projectId" TEXT,
	"title" TEXT NOT NULL,
	"goal" TEXT NOT NULL,
	"status" TEXT NOT NULL DEFAULT 'plan-only',
	"riskLevel" TEXT NOT NULL DEFAULT 'medium',
	"source" TEXT NOT NULL DEFAULT 'agent-approval-gate',
	"metadataJson" TEXT NOT NULL DEFAULT '{}',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "agent_steps" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"planId" TEXT NOT NULL,
	"position" INTEGER NOT NULL,
	"title" TEXT NOT NULL,
	"detail" TEXT,
	"status" TEXT NOT NULL DEFAULT 'pending',
	"requiredGate" TEXT NOT NULL DEFAULT 'read',
	"toolName" TEXT,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("planId") REFERENCES "agent_plans" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "tool_approvals" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"ownerKey" TEXT NOT NULL,
	"planId" TEXT,
	"stepId" TEXT,
	"requestedById" TEXT,
	"decidedById" TEXT,
	"toolName" TEXT NOT NULL,
	"actionClass" TEXT NOT NULL,
	"riskLevel" TEXT NOT NULL DEFAULT 'medium',
	"status" TEXT NOT NULL DEFAULT 'pending',
	"requestJson" TEXT NOT NULL DEFAULT '{}',
	"requestHash" TEXT,
	"decisionReason" TEXT,
	"expiresAt" DATETIME,
	"decidedAt" DATETIME,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("planId") REFERENCES "agent_plans" ("id") ON DELETE CASCADE,
	FOREIGN KEY ("stepId") REFERENCES "agent_steps" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_plans_ownerKey_idx" ON "agent_plans"("ownerKey");
CREATE INDEX IF NOT EXISTS "agent_plans_userId_idx" ON "agent_plans"("userId");
CREATE INDEX IF NOT EXISTS "agent_plans_projectId_idx" ON "agent_plans"("projectId");
CREATE INDEX IF NOT EXISTS "agent_plans_status_idx" ON "agent_plans"("status");
CREATE INDEX IF NOT EXISTS "agent_plans_riskLevel_idx" ON "agent_plans"("riskLevel");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_steps_planId_position_key" ON "agent_steps"("planId", "position");
CREATE INDEX IF NOT EXISTS "agent_steps_planId_idx" ON "agent_steps"("planId");
CREATE INDEX IF NOT EXISTS "agent_steps_status_idx" ON "agent_steps"("status");
CREATE INDEX IF NOT EXISTS "agent_steps_requiredGate_idx" ON "agent_steps"("requiredGate");
CREATE INDEX IF NOT EXISTS "tool_approvals_ownerKey_idx" ON "tool_approvals"("ownerKey");
CREATE UNIQUE INDEX IF NOT EXISTS "tool_approvals_stepId_key" ON "tool_approvals"("stepId") WHERE "stepId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "tool_approvals_planId_idx" ON "tool_approvals"("planId");
CREATE INDEX IF NOT EXISTS "tool_approvals_requestedById_idx" ON "tool_approvals"("requestedById");
CREATE INDEX IF NOT EXISTS "tool_approvals_decidedById_idx" ON "tool_approvals"("decidedById");
CREATE INDEX IF NOT EXISTS "tool_approvals_status_idx" ON "tool_approvals"("status");
CREATE INDEX IF NOT EXISTS "tool_approvals_riskLevel_idx" ON "tool_approvals"("riskLevel");
CREATE INDEX IF NOT EXISTS "tool_approvals_actionClass_idx" ON "tool_approvals"("actionClass");
`);
	ensureColumn(db, "agent_plans", "ownerKey", `"ownerKey" TEXT`);
	ensureColumn(db, "tool_approvals", "ownerKey", `"ownerKey" TEXT`);
	ensureColumn(db, "tool_approvals", "requestHash", `"requestHash" TEXT`);
}

function getAgentGateDb(root: string) {
	const path = dbPathForRoot(root);
	const existing = dbCache.get(path);
	if (existing) return existing;

	mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	ensureAgentGateSchema(db);
	dbCache.set(path, db);
	return db;
}

export function closeAgentApprovalDatabases(root?: string) {
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

function hashRequest(value: unknown) {
	const normalized = typeof value === "string" ? value : JSON.stringify(value ?? {});
	return createHash("sha256").update(normalized).digest("hex");
}

function normalizeActionClass(value?: string): AgentActionClass {
	const action = (value || "unknown").trim().toLowerCase() as AgentActionClass;
	if (!validActions.has(action)) return "unknown";
	return action;
}

function normalizeStatus(value?: string): ToolApprovalStatus {
	const status = (value || "pending").trim().toLowerCase() as ToolApprovalStatus;
	if (!validStatuses.has(status)) throw new Error("Invalid approval status");
	return status;
}

function normalizeRisk(value?: string): AgentRiskLevel {
	const risk = (value || "medium").trim().toLowerCase() as AgentRiskLevel;
	if (!validRisks.has(risk)) return "medium";
	return risk;
}

function normalizeText(value: unknown) {
	return String(value || "").toLowerCase().normalize("NFKC");
}

function planFromRow(row: AgentPlanRow): AgentPlanRecord {
	return {
		id: row.id,
		ownerKey: row.ownerKey,
		projectId: row.projectId || undefined,
		userId: row.userId || undefined,
		title: row.title,
		goal: row.goal,
		status: row.status,
		riskLevel: normalizeRisk(row.riskLevel),
		source: row.source,
		metadataJson: row.metadataJson || "{}",
		createdAt: String(row.createdAt),
		updatedAt: String(row.updatedAt),
	};
}

function stepFromRow(row: AgentStepRow): AgentStepRecord {
	return {
		id: row.id,
		planId: row.planId,
		position: Number(row.position),
		title: row.title,
		detail: row.detail || undefined,
		status: row.status,
		requiredGate: normalizeActionClass(row.requiredGate),
		toolName: row.toolName || undefined,
		createdAt: String(row.createdAt),
		updatedAt: String(row.updatedAt),
	};
}

function approvalFromRow(row: ToolApprovalRow): ToolApprovalRecord {
	return {
		id: row.id,
		ownerKey: row.ownerKey,
		planId: row.planId || undefined,
		stepId: row.stepId || undefined,
		requestedById: row.requestedById || undefined,
		decidedById: row.decidedById || undefined,
		toolName: row.toolName,
		actionClass: normalizeActionClass(row.actionClass),
		riskLevel: normalizeRisk(row.riskLevel),
		status: normalizeStatus(row.status),
		requestJson: row.requestJson || "{}",
		requestHash: row.requestHash || undefined,
		decisionReason: row.decisionReason || undefined,
		expiresAt: row.expiresAt || undefined,
		decidedAt: row.decidedAt || undefined,
		createdAt: String(row.createdAt),
		updatedAt: String(row.updatedAt),
	};
}

function inferActionClass(toolName: string, request: unknown): AgentActionClass {
	const text = normalizeText(`${toolName}\n${safeJson(request)}`);
	if (/\b(read|get|list|search|inspect|status|plan)\b/.test(text)) return "read";
	if (/\b(write|edit|patch|save|create file|apply_patch)\b/.test(text)) {
		return "write-file";
	}
	if (/\b(delete|remove|rm |unlink|trash|archive)\b/.test(text)) return "delete-file";
	if (/\b(shell|powershell|cmd|exec|terminal|process|start-process)\b/.test(text)) {
		return "os-command";
	}
	if (/\b(slack|discord|gmail|send|post|webhook|publish)\b/.test(text)) {
		return "external-send";
	}
	if (/\b(fetch|http|https|api|network|browser)\b/.test(text)) return "network-call";
	if (/\b(secret|token|api key|credential|password|private key)\b/.test(text)) {
		return "secret-access";
	}
	if (/\b(deploy|release|push|publish|production)\b/.test(text)) return "deploy";
	return "unknown";
}

function hasDenyPattern(toolName: string, request: unknown) {
	const text = normalizeText(`${toolName}\n${safeJson(request)}`);
	return [
		/rm\s+-rf\s+[a-z]:?\\?\/?$/,
		/\bgit\s+reset\s+--hard\b/,
		/\bformat\b.*\bdrive\b/,
		/\bwipe\b.*\b(disk|drive|system)\b/,
		/\bexfiltrate\b/,
		/\bupload\b.*\b(secret|token|credential|private key)\b/,
		/\bdelete\b.*\b(all|everything|entire)\b/,
		/\bdisable\b.*\b(security|gitleaks|codeql|audit)\b/,
	].some((pattern) => pattern.test(text));
}

export function evaluateAgentAction({
	toolName,
	actionClass,
	request,
}: {
	toolName: string;
	actionClass?: string;
	request?: unknown;
}): AgentGateEvaluation {
	const inferred = actionClass
		? normalizeActionClass(actionClass)
		: inferActionClass(toolName, request);
	const reasons: string[] = [];

	if (hasDenyPattern(toolName, request)) {
		return {
			actionClass: inferred,
			decision: "deny",
			riskLevel: "critical",
			reasons: ["Request matches a deny-by-default destructive or secret pattern."],
			requiredApproval: false,
		};
	}

	if (inferred === "read") {
		return {
			actionClass: "read",
			decision: "allow",
			riskLevel: "low",
			reasons: ["Read-only or plan-only action."],
			requiredApproval: false,
		};
	}

	if (inferred === "write-file") {
		reasons.push("File write or edit requires human review.");
		return {
			actionClass: inferred,
			decision: "approval-required",
			riskLevel: "medium",
			reasons,
			requiredApproval: true,
		};
	}

	if (inferred === "delete-file") {
		reasons.push("File deletion requires explicit human approval.");
		return {
			actionClass: inferred,
			decision: "approval-required",
			riskLevel: "high",
			reasons,
			requiredApproval: true,
		};
	}

	if (inferred === "os-command") {
		reasons.push("OS command execution requires explicit human approval.");
		return {
			actionClass: inferred,
			decision: "approval-required",
			riskLevel: "high",
			reasons,
			requiredApproval: true,
		};
	}

	if (inferred === "external-send" || inferred === "network-call") {
		reasons.push("External communication requires explicit human approval.");
		return {
			actionClass: inferred,
			decision: "approval-required",
			riskLevel: inferred === "external-send" ? "high" : "medium",
			reasons,
			requiredApproval: true,
		};
	}

	if (inferred === "secret-access" || inferred === "deploy") {
		reasons.push("Secret access, deployment, push, publish, or release is gated.");
		return {
			actionClass: inferred,
			decision: "approval-required",
			riskLevel: "high",
			reasons,
			requiredApproval: true,
		};
	}

	return {
		actionClass: "unknown",
		decision: "approval-required",
		riskLevel: "medium",
		reasons: ["Unknown action class defaults to approval-required."],
		requiredApproval: true,
	};
}

export async function createAgentPlan({
	root,
	ownerKey,
	projectId,
	title,
	goal,
	riskLevel = "medium",
	source = "agent-approval-gate",
	metadata,
	steps = [],
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
	title: string;
	goal: string;
	riskLevel?: string;
	source?: string;
	metadata?: unknown;
	steps?: Array<{
		title: string;
		detail?: string;
		requiredGate?: string;
		toolName?: string;
	}>;
}): Promise<{ plan: AgentPlanRecord; steps: AgentStepRecord[] }> {
	const cleanTitle = title.trim().slice(0, 160);
	const cleanGoal = goal.trim().slice(0, 2000);
	if (!cleanTitle) throw new Error("Agent plan title is required");
	if (!cleanGoal) throw new Error("Agent plan goal is required");

	const now = nowIso();
	const plan: AgentPlanRecord = {
		id: makeId("apln"),
		ownerKey,
		projectId: projectId || undefined,
		title: cleanTitle,
		goal: cleanGoal,
		status: "plan-only",
		riskLevel: normalizeRisk(riskLevel),
		source: source.trim().slice(0, 80) || "agent-approval-gate",
		metadataJson: safeJson(metadata),
		createdAt: now,
		updatedAt: now,
	};
	const stepRecords: AgentStepRecord[] = steps.map((step, index) => ({
		id: makeId("astp"),
		planId: plan.id,
		position: index + 1,
		title: step.title.trim().slice(0, 160) || `Step ${index + 1}`,
		detail: step.detail?.trim().slice(0, 1000) || undefined,
		status: "pending",
		requiredGate: normalizeActionClass(step.requiredGate),
		toolName: step.toolName?.trim().slice(0, 120) || undefined,
		createdAt: now,
		updatedAt: now,
	}));
	const db = getAgentGateDb(root);
	const save = db.transaction(() => {
		db.prepare(`
INSERT INTO "agent_plans"
("id", "ownerKey", "userId", "projectId", "title", "goal", "status", "riskLevel", "source", "metadataJson", "createdAt", "updatedAt")
VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
			plan.id,
			plan.ownerKey,
			plan.projectId || null,
			plan.title,
			plan.goal,
			plan.status,
			plan.riskLevel,
			plan.source,
			plan.metadataJson,
			plan.createdAt,
			plan.updatedAt,
		);
		for (const step of stepRecords) {
			db.prepare(`
INSERT INTO "agent_steps"
("id", "planId", "position", "title", "detail", "status", "requiredGate", "toolName", "createdAt", "updatedAt")
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
				step.id,
				step.planId,
				step.position,
				step.title,
				step.detail || null,
				step.status,
				step.requiredGate,
				step.toolName || null,
				step.createdAt,
				step.updatedAt,
			);
		}
	});
	save();
	return { plan, steps: stepRecords };
}

export async function requestToolApproval({
	root,
	ownerKey,
	planId,
	stepId,
	toolName,
	actionClass,
	request,
	expiresInMinutes = 30,
}: {
	root: string;
	ownerKey: string;
	planId?: string;
	stepId?: string;
	toolName: string;
	actionClass?: string;
	request?: unknown;
	expiresInMinutes?: number;
}): Promise<{ evaluation: AgentGateEvaluation; approval: ToolApprovalRecord }> {
	const cleanToolName = toolName.trim().slice(0, 120);
	if (!cleanToolName) throw new Error("Tool name is required");

	const evaluation = evaluateAgentAction({
		toolName: cleanToolName,
		actionClass,
		request,
	});
	const now = nowIso();
	const requestJson = safeJson(request);
	const status: ToolApprovalStatus =
		evaluation.decision === "allow"
			? "approved"
			: evaluation.decision === "deny"
				? "denied"
				: "pending";
	const approval: ToolApprovalRecord = {
		id: makeId("tapr"),
		ownerKey,
		planId: planId || undefined,
		stepId: stepId || undefined,
		toolName: cleanToolName,
		actionClass: evaluation.actionClass,
		riskLevel: evaluation.riskLevel,
		status,
		requestJson,
		requestHash: hashRequest(requestJson),
		decisionReason:
			status === "denied"
				? evaluation.reasons.join(" ")
				: status === "approved"
					? "Auto-approved read-only action."
					: undefined,
		expiresAt:
			status === "pending"
				? addMinutes(new Date(), Math.max(1, Math.min(expiresInMinutes, 240)))
				: undefined,
		decidedAt: status === "pending" ? undefined : now,
		createdAt: now,
		updatedAt: now,
	};
	const db = getAgentGateDb(root);
	db.prepare(`
INSERT INTO "tool_approvals"
("id", "ownerKey", "planId", "stepId", "requestedById", "decidedById", "toolName", "actionClass", "riskLevel", "status", "requestJson", "requestHash", "decisionReason", "expiresAt", "decidedAt", "createdAt", "updatedAt")
VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
		approval.id,
		approval.ownerKey,
		approval.planId || null,
		approval.stepId || null,
		approval.toolName,
		approval.actionClass,
		approval.riskLevel,
		approval.status,
		approval.requestJson,
		approval.requestHash || null,
		approval.decisionReason || null,
		approval.expiresAt || null,
		approval.decidedAt || null,
		approval.createdAt,
		approval.updatedAt,
	);
	return { evaluation, approval };
}

export async function listToolApprovals({
	root,
	ownerKey,
	status,
	limit = 80,
}: {
	root: string;
	ownerKey: string;
	status?: string;
	limit?: number;
}): Promise<ToolApprovalRecord[]> {
	const db = getAgentGateDb(root);
	const rows = db
		.query(`
SELECT * FROM "tool_approvals"
WHERE "ownerKey" = ?
AND (? IS NULL OR "status" = ?)
ORDER BY "createdAt" DESC
LIMIT ?
`)
		.all(
			ownerKey,
			status || null,
			status || null,
			Math.max(1, Math.min(Math.trunc(Number(limit) || 80), 300)),
		) as ToolApprovalRow[];
	return rows.map(approvalFromRow).map(markExpiredIfNeeded);
}

export async function listAgentPlans({
	root,
	ownerKey,
	limit = 30,
}: {
	root: string;
	ownerKey: string;
	limit?: number;
}): Promise<AgentPlanRecord[]> {
	const db = getAgentGateDb(root);
	const rows = db
		.query(`
SELECT * FROM "agent_plans"
WHERE "ownerKey" = ?
ORDER BY "updatedAt" DESC, "createdAt" DESC
LIMIT ?
`)
		.all(ownerKey, Math.max(1, Math.min(Math.trunc(Number(limit) || 30), 100))) as AgentPlanRow[];
	return rows.map(planFromRow);
}

export async function getToolApproval({
	root,
	ownerKey,
	approvalId,
}: {
	root: string;
	ownerKey: string;
	approvalId: string;
}): Promise<ToolApprovalRecord | null> {
	const db = getAgentGateDb(root);
	const row = db
		.query('SELECT * FROM "tool_approvals" WHERE "id" = ? AND "ownerKey" = ?')
		.get(approvalId, ownerKey) as ToolApprovalRow | undefined;
	return row ? markExpiredIfNeeded(approvalFromRow(row)) : null;
}

function markExpiredIfNeeded(approval: ToolApprovalRecord): ToolApprovalRecord {
	if (
		approval.status === "pending" &&
		approval.expiresAt &&
		new Date(approval.expiresAt).getTime() < Date.now()
	) {
		return { ...approval, status: "expired" };
	}
	return approval;
}

export async function decideToolApproval({
	root,
	ownerKey,
	approvalId,
	decision,
	reason,
}: {
	root: string;
	ownerKey: string;
	approvalId: string;
	decision: "approved" | "denied" | "revoked";
	reason?: string;
}): Promise<{ updated: boolean; approval?: ToolApprovalRecord }> {
	if (!["approved", "denied", "revoked"].includes(decision)) {
		throw new Error("Approval decision must be approved, denied, or revoked");
	}
	const current = await getToolApproval({ root, ownerKey, approvalId });
	if (!current) return { updated: false };
	if (current.status === "expired" && decision === "approved") {
		throw new Error("Expired approvals cannot be approved");
	}
	const now = nowIso();
	const db = getAgentGateDb(root);
	db.prepare(`
UPDATE "tool_approvals"
SET "status" = ?, "decisionReason" = ?, "decidedAt" = ?, "updatedAt" = ?
WHERE "id" = ? AND "ownerKey" = ?
`).run(
		decision,
		reason?.trim().slice(0, 500) || null,
		now,
		now,
		approvalId,
		ownerKey,
	);
	const updated = await getToolApproval({ root, ownerKey, approvalId });
	return { updated: true, approval: updated || undefined };
}

export async function assertToolApproved({
	root,
	ownerKey,
	approvalId,
	actionClass,
}: {
	root: string;
	ownerKey: string;
	approvalId?: string;
	actionClass?: string;
}): Promise<{ allowed: boolean; reason: string; approval?: ToolApprovalRecord }> {
	const action = normalizeActionClass(actionClass);
	if (action === "read") {
		return { allowed: true, reason: "Read-only action does not require approval" };
	}
	if (!approvalId) {
		return { allowed: false, reason: "Approval id is required for this action" };
	}
	const approval = await getToolApproval({ root, ownerKey, approvalId });
	if (!approval) return { allowed: false, reason: "Approval not found" };
	if (approval.actionClass !== action && action !== "unknown") {
		return { allowed: false, reason: "Approval action class mismatch", approval };
	}
	if (approval.status !== "approved") {
		return {
			allowed: false,
			reason: `Approval is ${approval.status}`,
			approval,
		};
	}
	return { allowed: true, reason: "Approval granted", approval };
}

export async function buildAgentApprovalGateReport({
	root,
	ownerKey,
}: {
	root: string;
	ownerKey: string;
}) {
	const approvals = await listToolApprovals({ root, ownerKey, limit: 120 });
	const plans = await listAgentPlans({ root, ownerKey, limit: 20 });
	const pending = approvals.filter((approval) => approval.status === "pending");
	const highRisk = approvals.filter((approval) =>
		["high", "critical"].includes(approval.riskLevel),
	);
	return {
		generatedAt: nowIso(),
		summary: {
			total: approvals.length,
			pending: pending.length,
			approved: approvals.filter((approval) => approval.status === "approved")
				.length,
			denied: approvals.filter((approval) => approval.status === "denied").length,
			highRisk: highRisk.length,
		},
		plans,
		approvals,
	};
}
