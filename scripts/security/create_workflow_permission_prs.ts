#!/usr/bin/env bun
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import type { PermissionStatus } from "./inventory_workflow_permissions";

type CsvRecord = Record<string, string>;

type ScanFinding = {
	repo: string;
	workflowPath: string;
	status: PermissionStatus | "unknown";
	summary: string;
};

type PlannedEdit = ScanFinding & {
	reason: string;
};

type PlannedSkip = ScanFinding & {
	reason: string;
};

export type RepoPrPlan = {
	repo: string;
	edits: PlannedEdit[];
	skips: PlannedSkip[];
};

type Options = {
	csvPath: string;
	apply: boolean;
	branchPrefix: string;
	includeStatuses: Set<PermissionStatus>;
	sleepMs: number;
	maxRepos?: number;
};

const knownStatuses = new Set<PermissionStatus>([
	"missing_workflow_permissions",
	"job_level_permissions_present",
	"write_all",
	"write_scope",
	"oidc_review",
	"safe_readonly",
	"no_workflows",
	"fetch_error",
	"parse_error",
]);

const defaultEditableStatuses = new Set<PermissionStatus>([
	"missing_workflow_permissions",
	"job_level_permissions_present",
]);

const minimalWorkflowPermissionBlock = [
	"permissions:",
	"  contents: read",
	"  id-token: none",
].join("\n");

function normalizeHeader(header: string) {
	return header
		.replace(/^\uFEFF/, "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

export function parseCsvRecords(text: string): CsvRecord[] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;

	for (let index = 0; index < text.length; index++) {
		const char = text[index];
		const next = text[index + 1];

		if (quoted) {
			if (char === '"' && next === '"') {
				field += '"';
				index++;
			} else if (char === '"') {
				quoted = false;
			} else {
				field += char;
			}
			continue;
		}

		if (char === '"') {
			quoted = true;
		} else if (char === ",") {
			row.push(field);
			field = "";
		} else if (char === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else if (char !== "\r") {
			field += char;
		}
	}

	if (field !== "" || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	const [rawHeaders, ...rawRows] = rows.filter((cells) =>
		cells.some((cell) => cell.trim() !== ""),
	);
	if (!rawHeaders) return [];

	const headers = rawHeaders.map(normalizeHeader);
	return rawRows.map((cells) => {
		const record: CsvRecord = {};
		for (let index = 0; index < headers.length; index++) {
			record[headers[index]] = cells[index]?.trim() ?? "";
		}
		return record;
	});
}

function normalizeWorkflowPath(path: string) {
	return path.trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function isSafeWorkflowPath(path: string) {
	const normalized = normalizeWorkflowPath(path);
	return (
		normalized.startsWith(".github/workflows/") &&
		!normalized.split("/").includes("..") &&
		/\.(ya?ml)$/i.test(normalized)
	);
}

function normalizeStatus(row: CsvRecord): PermissionStatus | "unknown" {
	const explicitStatus = row.status?.trim() as PermissionStatus | undefined;
	if (explicitStatus && knownStatuses.has(explicitStatus))
		return explicitStatus;

	const hasPermissions = row.has_permissions?.trim().toLowerCase();
	const summary = (
		row.permissions_summary ??
		row.permission_summary ??
		row.summary ??
		""
	).toLowerCase();

	if (hasPermissions === "no" || /\bmissing\b/.test(summary)) {
		return "missing_workflow_permissions";
	}
	if (/\bwrite-all\b/.test(summary)) return "write_all";
	if (/\*/.test(summary) || hasNonOidcWrite(summary)) {
		return "write_scope";
	}
	if (/\bid-token:\s*write\b/.test(summary)) return "oidc_review";
	if (hasPermissions === "yes") return "safe_readonly";

	return "unknown";
}

function hasNonOidcWrite(summary: string) {
	return [...summary.matchAll(/([a-z0-9_-]+):\s*write\b/g)].some(
		(match) => match[1] !== "id-token",
	);
}

export function scanFindingFromCsvRecord(
	row: CsvRecord,
): ScanFinding | undefined {
	const repo = (row.repo ?? row.repository ?? row.namewithowner ?? "").trim();
	const workflowPath = normalizeWorkflowPath(
		row.workflow_path ?? row.path ?? row.workflow ?? "",
	);

	if (repo === "") return undefined;

	return {
		repo,
		workflowPath,
		status: normalizeStatus(row),
		summary: row.permissions_summary ?? row.summary ?? "",
	};
}

export function buildPrPlans(
	findings: ScanFinding[],
	includeStatuses: Set<PermissionStatus> = defaultEditableStatuses,
): RepoPrPlan[] {
	const plans = new Map<string, RepoPrPlan>();
	const seenEdits = new Set<string>();

	for (const finding of findings) {
		const plan =
			plans.get(finding.repo) ??
			({ repo: finding.repo, edits: [], skips: [] } satisfies RepoPrPlan);
		plans.set(finding.repo, plan);

		if (!isSafeWorkflowPath(finding.workflowPath)) {
			plan.skips.push({
				...finding,
				reason: "workflow path is empty or outside .github/workflows",
			});
			continue;
		}

		if (!knownStatuses.has(finding.status as PermissionStatus)) {
			plan.skips.push({
				...finding,
				reason: "unknown status; rerun inventory or review manually",
			});
			continue;
		}

		if (!includeStatuses.has(finding.status as PermissionStatus)) {
			plan.skips.push({
				...finding,
				reason: `${finding.status} requires manual review by default`,
			});
			continue;
		}

		const editKey = `${finding.repo}\n${finding.workflowPath}`;
		if (seenEdits.has(editKey)) continue;
		seenEdits.add(editKey);
		plan.edits.push({
			...finding,
			reason: "add top-level minimal GITHUB_TOKEN permissions",
		});
	}

	return [...plans.values()].filter(
		(plan) => plan.edits.length > 0 || plan.skips.length > 0,
	);
}

function indentation(line: string) {
	return line.match(/^[ ]*/)?.[0].length ?? 0;
}

function isTopLevelKey(line: string, key: string) {
	const trimmed = line.trim();
	return indentation(line) === 0 && trimmed.match(new RegExp(`^${key}\\s*:`));
}

export function addMinimalWorkflowPermissions(text: string) {
	const newline = text.includes("\r\n") ? "\r\n" : "\n";
	const hasFinalNewline = text.endsWith("\n");
	const lines = text.split(/\r?\n/);
	if (hasFinalNewline) lines.pop();

	if (lines.some((line) => isTopLevelKey(line, "permissions"))) {
		return {
			changed: false,
			text,
			reason: "top-level permissions already exist",
		};
	}

	const insertAt = lines.findIndex((line) => isTopLevelKey(line, "jobs"));
	const blockLines = minimalWorkflowPermissionBlock.split("\n");
	const nextLines =
		insertAt === -1
			? [...lines, "", ...blockLines]
			: [
					...lines.slice(0, insertAt),
					...blockLines,
					"",
					...lines.slice(insertAt),
				];
	const nextText = `${nextLines.join(newline)}${hasFinalNewline ? newline : ""}`;

	return {
		changed: true,
		text: nextText,
		reason: "inserted top-level permissions before jobs",
	};
}

function parseStatuses(value: string | undefined) {
	if (!value) return new Set(defaultEditableStatuses);
	const statuses = new Set<PermissionStatus>();
	for (const rawStatus of value.split(",")) {
		const status = rawStatus.trim() as PermissionStatus;
		if (!knownStatuses.has(status)) {
			throw new Error(`Unknown status in --include-status: ${rawStatus}`);
		}
		statuses.add(status);
	}
	return statuses;
}

function parseArgs(argv: string[]): Options {
	let csvPath = "./workflow-permissions.csv";
	let apply = process.env.DRY_RUN === "0" || process.env.APPLY === "1";
	let branchPrefix =
		process.env.BRANCH_PREFIX ?? "hardening/minimal-workflow-permissions";
	let includeStatuses = parseStatuses(process.env.INCLUDE_STATUSES);
	let sleepMs = Number.parseFloat(process.env.SLEEP ?? "1") * 1000;
	let maxRepos =
		process.env.MAX_REPOS === undefined
			? undefined
			: Number.parseInt(process.env.MAX_REPOS, 10);
	const positional: string[] = [];

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];
		if (arg === "--csv") {
			csvPath = argv[++index];
		} else if (arg === "--apply") {
			apply = true;
		} else if (arg === "--dry-run") {
			apply = false;
		} else if (arg === "--branch-prefix") {
			branchPrefix = argv[++index];
		} else if (arg === "--include-status") {
			includeStatuses = parseStatuses(argv[++index]);
		} else if (arg === "--sleep") {
			sleepMs = Number.parseFloat(argv[++index]) * 1000;
		} else if (arg === "--max-repos") {
			maxRepos = Number.parseInt(argv[++index], 10);
		} else if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		} else if (arg.startsWith("-")) {
			throw new Error(`Unknown argument: ${arg}`);
		} else {
			positional.push(arg);
		}
	}

	if (positional[0]) csvPath = positional[0];
	if (!Number.isFinite(sleepMs) || sleepMs < 0) {
		throw new Error("--sleep must be a non-negative number");
	}
	if (maxRepos !== undefined && (!Number.isFinite(maxRepos) || maxRepos < 1)) {
		throw new Error("--max-repos must be a positive number");
	}

	return { csvPath, apply, branchPrefix, includeStatuses, sleepMs, maxRepos };
}

function printHelp() {
	console.log(`Usage:
  bun scripts/security/create_workflow_permission_prs.ts scan.csv
  DRY_RUN=0 bun scripts/security/create_workflow_permission_prs.ts scan.csv --max-repos 5

Default behavior:
  dry-run only; no clone, branch, push, or PR is created.
  edits only missing_workflow_permissions and job_level_permissions_present.

Options:
  --apply                  Create branches, commits, pushes, and PRs.
  --dry-run                Force preview mode.
  --include-status a,b     Override editable statuses.
  --branch-prefix prefix   Branch prefix. Default: hardening/minimal-workflow-permissions.
  --sleep seconds          Delay between PRs in apply mode.
  --max-repos n            Canary limit for apply or dry-run.`);
}

async function runCommand(command: string, args: string[], cwd?: string) {
	const proc = Bun.spawn([command, ...args], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	if (exitCode !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed: ${stderr.trim() || stdout.trim()}`,
		);
	}

	return stdout.trim();
}

async function defaultBranch(repo: string, cwd: string) {
	try {
		return await runCommand(
			"gh",
			[
				"repo",
				"view",
				repo,
				"--json",
				"defaultBranchRef",
				"-q",
				".defaultBranchRef.name",
			],
			cwd,
		);
	} catch {
		const current = await runCommand("git", ["branch", "--show-current"], cwd);
		return current || "main";
	}
}

function sanitizeBranchPart(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9/_-]+/g, "-")
		.replace(/\/+/g, "/")
		.replace(/^-+|-+$/g, "")
		.replace(/\/-+|-+\//g, "/");
}

export function buildBranchName(
	repo: string,
	prefix: string,
	date = new Date(),
) {
	const stamp = date
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\.\d{3}Z$/, "z");
	const repoSlug = sanitizeBranchPart(repo).replaceAll("/", "-");
	return sanitizeBranchPart(`${prefix}-${stamp}-${repoSlug}`);
}

function prBody(plan: RepoPrPlan, changedFiles: string[]) {
	const skipped = plan.skips
		.filter((skip) => skip.workflowPath)
		.map((skip) => `- ${skip.workflowPath}: ${skip.reason}`)
		.join("\n");
	return `目的: GITHUB_TOKEN の既定権限を workflow 単位で明示し、未指定のまま広がる write 権限リスクを抑えます。

変更:
${changedFiles.map((file) => `- ${file}: permissions contents: read / id-token: none を追加`).join("\n")}

安全策:
- 自動変更は missing_workflow_permissions / job_level_permissions_present の低リスク行に限定
- write_scope / write_all / oidc_review はこのPRでは変更せず、手動レビュー対象
- 既存の job-level permissions は保持

検証:
- CI が期待どおりに通ること
- workflow 所有者が必要な昇格権限を確認すること

ロールバック:
- PR を閉じるか、マージ後に merge commit を revert
${skipped ? `\n今回スキップした行:\n${skipped}\n` : ""}`;
}

function guardedRemoveTemp(path: string) {
	const resolved = resolve(path);
	const tempRoot = resolve(tmpdir());
	if (!resolved.startsWith(`${tempRoot}${sep}`)) {
		throw new Error(`Refusing to remove non-temp path: ${resolved}`);
	}
	rmSync(resolved, { recursive: true, force: true });
}

async function applyRepoPlan(plan: RepoPrPlan, options: Options) {
	const cloneDir = mkdtempSync(resolve(tmpdir(), "workflow-permission-pr-"));
	try {
		await runCommand("git", [
			"clone",
			"--depth",
			"1",
			`https://github.com/${plan.repo}.git`,
			cloneDir,
		]);
		const base = await defaultBranch(plan.repo, cloneDir);
		const branch = buildBranchName(plan.repo, options.branchPrefix);
		await runCommand("git", ["checkout", "-b", branch], cloneDir);

		const changedFiles: string[] = [];
		for (const edit of plan.edits) {
			const absolutePath = resolve(cloneDir, edit.workflowPath);
			if (!absolutePath.startsWith(`${resolve(cloneDir)}${sep}`)) {
				throw new Error(`Unsafe workflow path: ${edit.workflowPath}`);
			}
			if (!existsSync(absolutePath)) {
				console.error(`[skip] ${plan.repo} ${edit.workflowPath}: file missing`);
				continue;
			}

			const currentText = readFileSync(absolutePath, "utf8");
			const result = addMinimalWorkflowPermissions(currentText);
			if (!result.changed) {
				console.error(
					`[skip] ${plan.repo} ${edit.workflowPath}: ${result.reason}`,
				);
				continue;
			}

			writeFileSync(absolutePath, result.text);
			changedFiles.push(edit.workflowPath);
		}

		if (changedFiles.length === 0) {
			console.error(`[skip] ${plan.repo}: no editable workflow changes`);
			return;
		}

		await runCommand("git", ["add", ...changedFiles], cloneDir);
		await runCommand(
			"git",
			[
				"commit",
				"-m",
				"chore(hardening): add explicit minimal workflow permissions",
			],
			cloneDir,
		);
		await runCommand("git", ["push", "origin", branch], cloneDir);
		await runCommand(
			"gh",
			[
				"pr",
				"create",
				"--title",
				"safe(hardening): explicit minimal workflow permissions",
				"--body",
				prBody(plan, changedFiles),
				"--base",
				base,
				"--head",
				branch,
			],
			cloneDir,
		);

		console.error(`[created] ${plan.repo}: ${branch}`);
	} finally {
		guardedRemoveTemp(cloneDir);
	}
}

function sleep(ms: number) {
	return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function printDryRun(plans: RepoPrPlan[]) {
	console.error(
		"DRY RUN: no repositories will be cloned, pushed, or opened as PRs.",
	);
	for (const plan of plans) {
		console.log(`\n${plan.repo}`);
		for (const edit of plan.edits) {
			console.log(`  [edit] ${edit.workflowPath} (${edit.status})`);
		}
		for (const skip of plan.skips) {
			const path = skip.workflowPath || "(no workflow path)";
			console.log(`  [skip] ${path} (${skip.status}): ${skip.reason}`);
		}
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	if (!existsSync(options.csvPath)) {
		throw new Error(`Missing CSV: ${options.csvPath}`);
	}

	const records = parseCsvRecords(readFileSync(options.csvPath, "utf8"));
	const findings = records
		.map(scanFindingFromCsvRecord)
		.filter((finding): finding is ScanFinding => finding !== undefined);
	let plans = buildPrPlans(findings, options.includeStatuses);
	if (options.maxRepos !== undefined) {
		plans = plans.slice(0, options.maxRepos);
	}

	if (!options.apply) {
		printDryRun(plans);
		return;
	}

	for (const plan of plans.filter((repoPlan) => repoPlan.edits.length > 0)) {
		await applyRepoPlan(plan, options);
		if (options.sleepMs > 0) await sleep(options.sleepMs);
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
