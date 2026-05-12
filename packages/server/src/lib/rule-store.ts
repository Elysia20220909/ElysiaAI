import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const ruleScopes = [
	"engineering",
	"legal",
	"security",
	"operations",
] as const;

export const ruleSeverities = ["info", "warning", "critical"] as const;
export const ruleStatuses = ["active", "disabled"] as const;

export type RuleScope = (typeof ruleScopes)[number];
export type RuleSeverity = (typeof ruleSeverities)[number];
export type RuleStatus = (typeof ruleStatuses)[number];
export type RuleSetSource = "default" | "file";

export interface GovernanceRule {
	id: string;
	title: string;
	body: string;
	scope: RuleScope;
	severity: RuleSeverity;
	status: RuleStatus;
	createdAt: string;
	updatedAt: string;
	version: number;
}

export interface RuleCreateInput {
	title: string;
	body: string;
	scope: RuleScope;
	severity: RuleSeverity;
	status?: RuleStatus;
}

export type RuleUpdateInput = Partial<RuleCreateInput>;

export interface RuleListResult {
	rules: GovernanceRule[];
	source: RuleSetSource;
	total: number;
	active: number;
	updatedAt: string;
}

export interface RuleSummary {
	total: number;
	active: number;
	disabled: number;
	critical: number;
	byScope: Record<RuleScope, number>;
}

export interface RuleStore {
	list(): Promise<RuleListResult>;
	get(id: string): Promise<GovernanceRule>;
	create(input: RuleCreateInput): Promise<GovernanceRule>;
	update(id: string, input: RuleUpdateInput): Promise<GovernanceRule>;
	delete(id: string): Promise<boolean>;
	summary(): Promise<RuleSummary>;
}

type PersistedRuleFile = {
	version: 1;
	updatedAt: string;
	rules: GovernanceRule[];
};

type LoadedRules = {
	rules: GovernanceRule[];
	source: RuleSetSource;
	updatedAt: string;
};

const DEFAULT_RULE_STORE_PATH = "data/rules-management.json";
const DEFAULT_RULE_TIMESTAMP = "2026-05-10T00:00:00.000Z";
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 4000;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/;

export class RuleStoreError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: string,
	) {
		super(message);
		this.name = "RuleStoreError";
	}
}

export const defaultGovernanceRules: readonly GovernanceRule[] = [
	{
		id: "local-first-privacy",
		title: "Local-first privacy",
		body: "Keep user data, memory, logs, and runtime state local unless the user explicitly requests an external integration.",
		scope: "security",
		severity: "critical",
		status: "active",
		createdAt: DEFAULT_RULE_TIMESTAMP,
		updatedAt: DEFAULT_RULE_TIMESTAMP,
		version: 1,
	},
	{
		id: "strict-readable-code",
		title: "Strict readable code",
		body: "Use strict types, clear names, small functions, and explicit validation before data crosses a module or API boundary.",
		scope: "engineering",
		severity: "critical",
		status: "active",
		createdAt: DEFAULT_RULE_TIMESTAMP,
		updatedAt: DEFAULT_RULE_TIMESTAMP,
		version: 1,
	},
	{
		id: "manual-automation-only",
		title: "Manual automation only",
		body: "Generate desktop or game automation helpers only as opt-in tools. Never auto-run input automation.",
		scope: "operations",
		severity: "critical",
		status: "active",
		createdAt: DEFAULT_RULE_TIMESTAMP,
		updatedAt: DEFAULT_RULE_TIMESTAMP,
		version: 1,
	},
	{
		id: "legal-and-ai-caution",
		title: "Legal and AI caution",
		body: "Show clear terms for user-facing surfaces and remind operators that AI output needs human review for important decisions.",
		scope: "legal",
		severity: "warning",
		status: "active",
		createdAt: DEFAULT_RULE_TIMESTAMP,
		updatedAt: DEFAULT_RULE_TIMESTAMP,
		version: 1,
	},
];

function cloneRule(rule: GovernanceRule): GovernanceRule {
	return { ...rule };
}

function cloneRules(rules: readonly GovernanceRule[]): GovernanceRule[] {
	return rules.map(cloneRule);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRuleScope(value: unknown): value is RuleScope {
	return typeof value === "string" && ruleScopes.includes(value as RuleScope);
}

function isRuleSeverity(value: unknown): value is RuleSeverity {
	return (
		typeof value === "string" && ruleSeverities.includes(value as RuleSeverity)
	);
}

function isRuleStatus(value: unknown): value is RuleStatus {
	return (
		typeof value === "string" && ruleStatuses.includes(value as RuleStatus)
	);
}

function normalizeText(
	value: unknown,
	field: "title" | "body",
	maxLength: number,
): string {
	if (typeof value !== "string") {
		throw new RuleStoreError(`${field} must be a string`, 400, "RULE_INVALID");
	}

	const normalized = value.replaceAll(String.fromCharCode(0), "").trim();
	if (!normalized) {
		throw new RuleStoreError(`${field} is required`, 400, "RULE_REQUIRED");
	}
	if (normalized.length > maxLength) {
		throw new RuleStoreError(`${field} is too long`, 400, "RULE_TOO_LONG");
	}

	return normalized;
}

function normalizeCreateInput(
	input: RuleCreateInput,
): Required<RuleCreateInput> {
	const title = normalizeText(input.title, "title", MAX_TITLE_LENGTH);
	const body = normalizeText(input.body, "body", MAX_BODY_LENGTH);

	if (!isRuleScope(input.scope)) {
		throw new RuleStoreError("scope is invalid", 400, "RULE_SCOPE_INVALID");
	}
	if (!isRuleSeverity(input.severity)) {
		throw new RuleStoreError(
			"severity is invalid",
			400,
			"RULE_SEVERITY_INVALID",
		);
	}
	if (input.status !== undefined && !isRuleStatus(input.status)) {
		throw new RuleStoreError("status is invalid", 400, "RULE_STATUS_INVALID");
	}

	return {
		title,
		body,
		scope: input.scope,
		severity: input.severity,
		status: input.status ?? "active",
	};
}

function normalizeUpdateInput(input: RuleUpdateInput): RuleUpdateInput {
	if (Object.keys(input).length === 0) {
		throw new RuleStoreError(
			"No rule fields provided",
			400,
			"RULE_EMPTY_UPDATE",
		);
	}

	const normalized: RuleUpdateInput = {};
	if (input.title !== undefined) {
		normalized.title = normalizeText(input.title, "title", MAX_TITLE_LENGTH);
	}
	if (input.body !== undefined) {
		normalized.body = normalizeText(input.body, "body", MAX_BODY_LENGTH);
	}
	if (input.scope !== undefined) {
		if (!isRuleScope(input.scope)) {
			throw new RuleStoreError("scope is invalid", 400, "RULE_SCOPE_INVALID");
		}
		normalized.scope = input.scope;
	}
	if (input.severity !== undefined) {
		if (!isRuleSeverity(input.severity)) {
			throw new RuleStoreError(
				"severity is invalid",
				400,
				"RULE_SEVERITY_INVALID",
			);
		}
		normalized.severity = input.severity;
	}
	if (input.status !== undefined) {
		if (!isRuleStatus(input.status)) {
			throw new RuleStoreError("status is invalid", 400, "RULE_STATUS_INVALID");
		}
		normalized.status = input.status;
	}

	return normalized;
}

function normalizeId(id: string): string {
	const normalized = id.trim();
	if (!ID_PATTERN.test(normalized)) {
		throw new RuleStoreError("Rule id is invalid", 400, "RULE_ID_INVALID");
	}
	return normalized;
}

function createRuleId(title: string): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	const suffix = randomUUID().slice(0, 8);
	return `${slug || "rule"}-${suffix}`;
}

function validateRule(value: unknown): GovernanceRule {
	if (!isRecord(value)) {
		throw new RuleStoreError(
			"Rule record is invalid",
			500,
			"RULE_STORE_INVALID",
		);
	}

	const id = typeof value.id === "string" ? normalizeId(value.id) : "";
	if (!id) {
		throw new RuleStoreError("Rule id is missing", 500, "RULE_STORE_INVALID");
	}

	const createdAt =
		typeof value.createdAt === "string" ? value.createdAt : undefined;
	const updatedAt =
		typeof value.updatedAt === "string" ? value.updatedAt : undefined;
	const version = typeof value.version === "number" ? value.version : undefined;

	if (!createdAt || !updatedAt || !version || version < 1) {
		throw new RuleStoreError(
			"Rule metadata is invalid",
			500,
			"RULE_STORE_INVALID",
		);
	}

	const scope = value.scope;
	const severity = value.severity;
	const status = value.status;
	if (
		!isRuleScope(scope) ||
		!isRuleSeverity(severity) ||
		!isRuleStatus(status)
	) {
		throw new RuleStoreError(
			"Rule classification is invalid",
			500,
			"RULE_STORE_INVALID",
		);
	}

	return {
		id,
		title: normalizeText(value.title, "title", MAX_TITLE_LENGTH),
		body: normalizeText(value.body, "body", MAX_BODY_LENGTH),
		scope,
		severity,
		status,
		createdAt,
		updatedAt,
		version,
	};
}

function parsePersistedRuleFile(raw: unknown): PersistedRuleFile {
	if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.rules)) {
		throw new RuleStoreError(
			"Rule store file is invalid",
			500,
			"RULE_STORE_INVALID",
		);
	}

	const updatedAt =
		typeof raw.updatedAt === "string" ? raw.updatedAt : DEFAULT_RULE_TIMESTAMP;

	return {
		version: 1,
		updatedAt,
		rules: raw.rules.map(validateRule),
	};
}

function summarize(rules: GovernanceRule[]): RuleSummary {
	const byScope = Object.fromEntries(
		ruleScopes.map((scope) => [scope, 0]),
	) as Record<RuleScope, number>;

	for (const rule of rules) {
		byScope[rule.scope] += 1;
	}

	return {
		total: rules.length,
		active: rules.filter((rule) => rule.status === "active").length,
		disabled: rules.filter((rule) => rule.status === "disabled").length,
		critical: rules.filter((rule) => rule.severity === "critical").length,
		byScope,
	};
}

function latestUpdatedAt(rules: GovernanceRule[]): string {
	return (
		rules
			.map((rule) => rule.updatedAt)
			.sort()
			.at(-1) ?? DEFAULT_RULE_TIMESTAMP
	);
}

function resolveStorePath(storePath?: string): string {
	return resolve(
		process.cwd(),
		storePath || process.env.ELYSIA_RULE_STORE_PATH || DEFAULT_RULE_STORE_PATH,
	);
}

export class FileRuleStore implements RuleStore {
	readonly storePath: string;

	constructor(storePath?: string) {
		this.storePath = resolveStorePath(storePath);
	}

	async list(): Promise<RuleListResult> {
		const loaded = await this.load();
		const active = loaded.rules.filter(
			(rule) => rule.status === "active",
		).length;

		return {
			rules: cloneRules(loaded.rules),
			source: loaded.source,
			total: loaded.rules.length,
			active,
			updatedAt: loaded.updatedAt,
		};
	}

	async get(id: string): Promise<GovernanceRule> {
		const normalizedId = normalizeId(id);
		const loaded = await this.load();
		const rule = loaded.rules.find((item) => item.id === normalizedId);
		if (!rule) {
			throw new RuleStoreError("Rule not found", 404, "RULE_NOT_FOUND");
		}
		return cloneRule(rule);
	}

	async create(input: RuleCreateInput): Promise<GovernanceRule> {
		const normalized = normalizeCreateInput(input);
		const loaded = await this.load();
		const now = new Date().toISOString();
		let id = createRuleId(normalized.title);

		while (loaded.rules.some((rule) => rule.id === id)) {
			id = createRuleId(normalized.title);
		}

		const rule: GovernanceRule = {
			id,
			...normalized,
			createdAt: now,
			updatedAt: now,
			version: 1,
		};
		await this.save([...loaded.rules, rule]);
		return cloneRule(rule);
	}

	async update(id: string, input: RuleUpdateInput): Promise<GovernanceRule> {
		const normalizedId = normalizeId(id);
		const normalized = normalizeUpdateInput(input);
		const loaded = await this.load();
		const index = loaded.rules.findIndex((rule) => rule.id === normalizedId);

		if (index < 0) {
			throw new RuleStoreError("Rule not found", 404, "RULE_NOT_FOUND");
		}

		const current = loaded.rules[index];
		const updated: GovernanceRule = {
			...current,
			...normalized,
			updatedAt: new Date().toISOString(),
			version: current.version + 1,
		};
		const rules = [...loaded.rules];
		rules[index] = updated;

		await this.save(rules);
		return cloneRule(updated);
	}

	async delete(id: string): Promise<boolean> {
		const normalizedId = normalizeId(id);
		const loaded = await this.load();
		const nextRules = loaded.rules.filter((rule) => rule.id !== normalizedId);

		if (nextRules.length === loaded.rules.length) {
			throw new RuleStoreError("Rule not found", 404, "RULE_NOT_FOUND");
		}

		await this.save(nextRules);
		return true;
	}

	async summary(): Promise<RuleSummary> {
		const loaded = await this.load();
		return summarize(loaded.rules);
	}

	private async load(): Promise<LoadedRules> {
		try {
			const text = await readFile(this.storePath, "utf8");
			const parsed = parsePersistedRuleFile(JSON.parse(text));
			return {
				rules: parsed.rules,
				source: "file",
				updatedAt: parsed.updatedAt,
			};
		} catch (error) {
			if (error instanceof RuleStoreError) throw error;
			if (isMissingFileError(error)) {
				const rules = cloneRules(defaultGovernanceRules);
				return {
					rules,
					source: "default",
					updatedAt: latestUpdatedAt(rules),
				};
			}
			if (error instanceof SyntaxError) {
				throw new RuleStoreError(
					"Rule store JSON is invalid",
					500,
					"RULE_STORE_INVALID_JSON",
				);
			}
			throw new RuleStoreError(
				"Failed to read rule store",
				500,
				"RULE_STORE_READ_FAILED",
			);
		}
	}

	private async save(rules: GovernanceRule[]): Promise<void> {
		const payload: PersistedRuleFile = {
			version: 1,
			updatedAt: new Date().toISOString(),
			rules: cloneRules(rules),
		};
		const directory = dirname(this.storePath);
		const temporaryPath = `${this.storePath}.${process.pid}.${Date.now()}.tmp`;

		try {
			await mkdir(directory, { recursive: true });
			await writeFile(
				temporaryPath,
				`${JSON.stringify(payload, null, 2)}\n`,
				"utf8",
			);
			await rename(temporaryPath, this.storePath);
		} catch {
			throw new RuleStoreError(
				"Failed to write rule store",
				500,
				"RULE_STORE_WRITE_FAILED",
			);
		}
	}
}

function isMissingFileError(error: unknown): boolean {
	return (
		isRecord(error) && typeof error.code === "string" && error.code === "ENOENT"
	);
}

export const defaultRuleStore = new FileRuleStore();
