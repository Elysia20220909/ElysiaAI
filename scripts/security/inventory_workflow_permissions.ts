#!/usr/bin/env bun
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";

export type PermissionStatus =
	| "missing_workflow_permissions"
	| "job_level_permissions_present"
	| "write_all"
	| "write_scope"
	| "oidc_review"
	| "safe_readonly"
	| "no_workflows"
	| "fetch_error"
	| "parse_error";

type PermissionLevel = "workflow" | "job";

type PermissionBlock = {
	level: PermissionLevel;
	line: number;
	summary: string;
	scalar?: string;
	entries: Array<{ key: string; value: string }>;
	errors: string[];
};

export type WorkflowPermissionInventory = {
	status: PermissionStatus;
	hasWorkflowPermissions: boolean;
	hasJobPermissions: boolean;
	summary: string;
	errors: string[];
};

type CsvRow = {
	repo: string;
	workflowPath: string;
	status: PermissionStatus;
	hasWorkflowPermissions: string;
	hasJobPermissions: string;
	permissionsSummary: string;
};

type Options = {
	org?: string;
	repos: string[];
	local: boolean;
	out: string;
	limit: number;
	dryRun: boolean;
};

const apiVersion = "2022-11-28";

function stripInlineComment(value: string) {
	let quote: "'" | '"' | undefined;
	for (let index = 0; index < value.length; index++) {
		const char = value[index];
		if ((char === "'" || char === '"') && value[index - 1] !== "\\") {
			quote = quote === char ? undefined : (quote ?? char);
			continue;
		}
		if (char === "#" && quote === undefined) {
			return value.slice(0, index).trim();
		}
	}
	return value.trim();
}

function indentation(line: string) {
	const match = line.match(/^[ ]*/);
	return match ? match[0].length : 0;
}

function parseInlineMap(value: string) {
	const trimmed = value.trim();
	if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return undefined;

	const body = trimmed.slice(1, -1).trim();
	if (body === "") return [] as Array<{ key: string; value: string }>;

	const entries: Array<{ key: string; value: string }> = [];
	for (const part of body.split(",")) {
		const [key, ...rest] = part.split(":");
		if (!key || rest.length === 0) return undefined;
		entries.push({
			key: key.trim().replace(/^["']|["']$/g, ""),
			value: stripInlineComment(rest.join(":")).replace(/^["']|["']$/g, ""),
		});
	}
	return entries;
}

function isValidPermissionValue(key: string, value: string) {
	const normalizedValue = value.toLowerCase();
	if (key === "id-token")
		return normalizedValue === "write" || normalizedValue === "none";
	if (key === "models" || key === "vulnerability-alerts") {
		return normalizedValue === "read" || normalizedValue === "none";
	}
	return (
		normalizedValue === "read" ||
		normalizedValue === "write" ||
		normalizedValue === "none"
	);
}

function parseBlockEntries(
	lines: string[],
	startIndex: number,
	baseIndent: number,
) {
	const entries: Array<{ key: string; value: string }> = [];
	const errors: string[] = [];
	let index = startIndex + 1;

	for (; index < lines.length; index++) {
		const rawLine = lines[index];
		const trimmed = rawLine.trim();
		if (trimmed === "" || trimmed.startsWith("#")) continue;

		const currentIndent = indentation(rawLine);
		if (currentIndent <= baseIndent) break;

		if (/^\t+/.test(rawLine)) {
			errors.push(`line ${index + 1}: tabs are not valid YAML indentation`);
			continue;
		}

		const normalized = stripInlineComment(trimmed);
		const match = normalized.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!match) {
			errors.push(`line ${index + 1}: unsupported permissions entry`);
			continue;
		}

		const key = match[1];
		const value = match[2].trim().replace(/^["']|["']$/g, "");
		if (value === "") {
			errors.push(`line ${index + 1}: permissions entry has no value`);
			continue;
		}

		entries.push({ key, value });
		if (!isValidPermissionValue(key, value)) {
			errors.push(`line ${index + 1}: unsupported permission value "${value}"`);
		}
	}

	return { entries, errors };
}

function parsePermissionValue(
	lines: string[],
	index: number,
	level: PermissionLevel,
	value: string,
	baseIndent: number,
): PermissionBlock {
	const errors: string[] = [];
	const trimmedValue = stripInlineComment(value);
	let scalar: string | undefined;
	let entries: Array<{ key: string; value: string }> = [];

	if (trimmedValue === "") {
		const block = parseBlockEntries(lines, index, baseIndent);
		entries = block.entries;
		errors.push(...block.errors);
		if (entries.length === 0 && block.errors.length === 0) {
			errors.push(`line ${index + 1}: permissions block is empty`);
		}
	} else if (trimmedValue === "{}") {
		scalar = "{}";
	} else {
		const inlineMap = parseInlineMap(trimmedValue);
		if (inlineMap) {
			entries = inlineMap;
			for (const entry of entries) {
				if (!isValidPermissionValue(entry.key, entry.value)) {
					errors.push(
						`line ${index + 1}: unsupported permission value "${entry.value}"`,
					);
				}
			}
		} else {
			scalar = trimmedValue.replace(/^["']|["']$/g, "");
			const normalizedScalar = scalar.toLowerCase();
			if (
				normalizedScalar !== "read-all" &&
				normalizedScalar !== "write-all" &&
				normalizedScalar !== "none"
			) {
				errors.push(
					`line ${index + 1}: unsupported permissions scalar "${scalar}"`,
				);
			}
		}
	}

	const summary =
		scalar ??
		(entries.length > 0
			? entries.map((entry) => `${entry.key}: ${entry.value}`).join("; ")
			: "empty");

	return {
		level,
		line: index + 1,
		summary,
		scalar,
		entries,
		errors,
	};
}

export function scanWorkflowPermissions(
	text: string,
): WorkflowPermissionInventory {
	const lines = text.split(/\r?\n/);
	const blocks: PermissionBlock[] = [];
	const globalErrors: string[] = [];
	let topLevelSection = "";
	let jobsChildIndent: number | undefined;
	let jobKeyIndent: number | undefined;
	let currentJobChildIndent: number | undefined;

	for (let index = 0; index < lines.length; index++) {
		const rawLine = lines[index];
		if (/^\t+/.test(rawLine)) {
			globalErrors.push(
				`line ${index + 1}: tabs are not valid YAML indentation`,
			);
		}

		const trimmed = rawLine.trim();
		if (trimmed === "" || trimmed.startsWith("#")) continue;

		const currentIndent = indentation(rawLine);
		const keyMatch = stripInlineComment(trimmed).match(
			/^([A-Za-z0-9_-]+):\s*(.*)$/,
		);
		if (!keyMatch) continue;

		const key = keyMatch[1];
		const value = keyMatch[2] ?? "";
		if (currentIndent === 0) {
			topLevelSection = key;
			jobsChildIndent = undefined;
			jobKeyIndent = undefined;
			currentJobChildIndent = undefined;
		} else if (topLevelSection === "jobs") {
			if (jobsChildIndent === undefined) jobsChildIndent = currentIndent;
			if (currentIndent === jobsChildIndent) {
				jobKeyIndent = currentIndent;
				currentJobChildIndent = undefined;
			} else if (
				jobKeyIndent !== undefined &&
				currentIndent > jobKeyIndent &&
				currentJobChildIndent === undefined
			) {
				currentJobChildIndent = currentIndent;
			}
		}

		if (key !== "permissions") continue;

		const level = permissionLevel(
			currentIndent,
			topLevelSection,
			jobKeyIndent,
			currentJobChildIndent,
		);
		if (level === undefined) continue;
		blocks.push(
			parsePermissionValue(lines, index, level, value, currentIndent),
		);
	}

	const workflowBlocks = blocks.filter((block) => block.level === "workflow");
	const jobBlocks = blocks.filter((block) => block.level === "job");
	const errors = [...globalErrors, ...blocks.flatMap((block) => block.errors)];

	if (errors.length > 0) {
		return {
			status: "parse_error",
			hasWorkflowPermissions: workflowBlocks.length > 0,
			hasJobPermissions: jobBlocks.length > 0,
			summary: formatSummary(blocks),
			errors,
		};
	}

	if (blocks.some(isWriteAllBlock)) {
		return buildInventory("write_all", workflowBlocks, jobBlocks, blocks);
	}

	if (blocks.some(isWriteScopeBlock)) {
		return buildInventory("write_scope", workflowBlocks, jobBlocks, blocks);
	}

	if (blocks.some(isOidcReviewBlock)) {
		return buildInventory("oidc_review", workflowBlocks, jobBlocks, blocks);
	}

	if (workflowBlocks.length === 0 && jobBlocks.length > 0) {
		return buildInventory(
			"job_level_permissions_present",
			workflowBlocks,
			jobBlocks,
			blocks,
		);
	}

	if (workflowBlocks.length === 0) {
		return buildInventory(
			"missing_workflow_permissions",
			workflowBlocks,
			jobBlocks,
			blocks,
		);
	}

	return buildInventory("safe_readonly", workflowBlocks, jobBlocks, blocks);
}

function permissionLevel(
	currentIndent: number,
	topLevelSection: string,
	jobKeyIndent: number | undefined,
	currentJobChildIndent: number | undefined,
): PermissionLevel | undefined {
	if (currentIndent === 0) return "workflow";
	if (
		topLevelSection === "jobs" &&
		jobKeyIndent !== undefined &&
		currentJobChildIndent !== undefined &&
		currentIndent === currentJobChildIndent
	) {
		return "job";
	}
	return undefined;
}

function buildInventory(
	status: PermissionStatus,
	workflowBlocks: PermissionBlock[],
	jobBlocks: PermissionBlock[],
	blocks: PermissionBlock[],
): WorkflowPermissionInventory {
	return {
		status,
		hasWorkflowPermissions: workflowBlocks.length > 0,
		hasJobPermissions: jobBlocks.length > 0,
		summary: formatSummary(blocks),
		errors: [],
	};
}

function formatSummary(blocks: PermissionBlock[]) {
	if (blocks.length === 0) return "missing";
	return blocks
		.map((block) => `${block.level}@${block.line}: ${block.summary}`)
		.join(" | ");
}

function isWriteAllBlock(block: PermissionBlock) {
	return block.scalar?.toLowerCase() === "write-all";
}

function isWriteScopeBlock(block: PermissionBlock) {
	if (block.scalar?.includes("*")) return true;
	return block.entries.some((entry) => {
		const key = entry.key.toLowerCase();
		const value = entry.value.toLowerCase();
		return (
			key === "*" || value === "*" || (key !== "id-token" && value === "write")
		);
	});
}

function isOidcReviewBlock(block: PermissionBlock) {
	return block.entries.some(
		(entry) =>
			entry.key.toLowerCase() === "id-token" &&
			entry.value.toLowerCase() === "write",
	);
}

function csvEscape(value: string) {
	if (!/[",\r\n]/.test(value)) return value;
	return `"${value.replaceAll('"', '""')}"`;
}

function toCsv(rows: CsvRow[]) {
	const header = [
		"repo",
		"workflow_path",
		"status",
		"has_workflow_permissions",
		"has_job_permissions",
		"permissions_summary",
	];
	return [
		header.join(","),
		...rows.map((row) =>
			[
				row.repo,
				row.workflowPath,
				row.status,
				row.hasWorkflowPermissions,
				row.hasJobPermissions,
				row.permissionsSummary,
			]
				.map(csvEscape)
				.join(","),
		),
	].join("\n");
}

function localWorkflowFiles(cwd: string) {
	const workflowsDir = join(cwd, ".github", "workflows");
	if (!existsSync(workflowsDir)) return [];
	return readdirSync(workflowsDir)
		.filter((name) => /\.(ya?ml)$/i.test(name))
		.map((name) => join(workflowsDir, name));
}

function parseArgs(argv: string[]): Options {
	const repos: string[] = [];
	let org = process.env.GH_ORG;
	let local = false;
	let out =
		process.env.OUT ??
		join(
			process.cwd(),
			`workflow-permissions-${Math.floor(Date.now() / 1000)}.csv`,
		);
	let limit = Number.parseInt(process.env.GH_LIMIT ?? "1000", 10);
	let dryRun = process.env.DRY_RUN === "1";

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];
		if (arg === "--org") {
			org = argv[++index];
		} else if (arg === "--repo") {
			repos.push(argv[++index]);
		} else if (arg === "--local") {
			local = true;
		} else if (arg === "--out") {
			out = argv[++index];
		} else if (arg === "--limit") {
			limit = Number.parseInt(argv[++index], 10);
		} else if (arg === "--dry-run") {
			dryRun = true;
		} else if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	if (!Number.isFinite(limit) || limit < 1) {
		throw new Error("--limit must be a positive number");
	}

	if (!local && repos.length === 0 && !org) {
		local = true;
	}

	return { org, repos, local, out, limit, dryRun };
}

function printHelp() {
	console.log(`Usage:
  bun scripts/security/inventory_workflow_permissions.ts --local [--out report.csv]
  GH_ORG=your-org bun scripts/security/inventory_workflow_permissions.ts [--out report.csv]
  bun scripts/security/inventory_workflow_permissions.ts --org your-org --repo owner/name

Statuses:
  missing_workflow_permissions, job_level_permissions_present, write_all,
  write_scope, oidc_review, safe_readonly, no_workflows, fetch_error, parse_error`);
}

async function runGh(args: string[]) {
	const proc = Bun.spawn(["gh", ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	return { stdout, stderr, exitCode };
}

async function runGhJson<T>(args: string[]) {
	const result = await runGh(args);
	if (result.exitCode !== 0) {
		throw new Error(
			result.stderr.trim() || `gh exited with ${result.exitCode}`,
		);
	}
	return JSON.parse(result.stdout) as T;
}

async function orgRepos(org: string, limit: number) {
	const data = await runGhJson<Array<{ nameWithOwner: string }>>([
		"repo",
		"list",
		org,
		"--limit",
		String(limit),
		"--json",
		"nameWithOwner",
	]);
	return data.map((repo) => repo.nameWithOwner).sort();
}

function encodeContentPath(path: string) {
	return path
		.split("/")
		.map((part) => encodeURIComponent(part))
		.join("/");
}

async function remoteWorkflowPaths(repo: string) {
	const result = await runGh([
		"api",
		"-H",
		`X-GitHub-Api-Version: ${apiVersion}`,
		`/repos/${repo}/contents/.github/workflows`,
	]);

	if (result.exitCode !== 0) {
		if (/not found|404/i.test(result.stderr))
			return { paths: [], error: undefined };
		return {
			paths: [],
			error: result.stderr.trim() || "failed to list workflows",
		};
	}

	const data = JSON.parse(result.stdout) as Array<{
		path: string;
		type: string;
	}>;
	return {
		paths: data
			.filter((item) => item.type === "file" && /\.(ya?ml)$/i.test(item.path))
			.map((item) => item.path)
			.sort(),
		error: undefined,
	};
}

async function remoteWorkflowContent(repo: string, path: string) {
	const data = await runGhJson<{ content?: string; encoding?: string }>([
		"api",
		"-H",
		`X-GitHub-Api-Version: ${apiVersion}`,
		`/repos/${repo}/contents/${encodeContentPath(path)}`,
	]);

	if (data.encoding !== "base64" || !data.content) {
		throw new Error("workflow content was not returned as base64");
	}

	return Buffer.from(data.content.replaceAll("\n", ""), "base64").toString(
		"utf8",
	);
}

function inventoryToRow(
	repo: string,
	workflowPath: string,
	inventory: WorkflowPermissionInventory,
): CsvRow {
	const suffix =
		inventory.errors.length > 0
			? ` errors: ${inventory.errors.join("; ")}`
			: "";
	return {
		repo,
		workflowPath,
		status: inventory.status,
		hasWorkflowPermissions: inventory.hasWorkflowPermissions ? "yes" : "no",
		hasJobPermissions: inventory.hasJobPermissions ? "yes" : "no",
		permissionsSummary: `${inventory.summary}${suffix}`,
	};
}

async function scanLocal(cwd: string) {
	const repo = basename(cwd);
	const files = localWorkflowFiles(cwd);
	if (files.length === 0) {
		return [
			{
				repo,
				workflowPath: "",
				status: "no_workflows" as const,
				hasWorkflowPermissions: "no",
				hasJobPermissions: "no",
				permissionsSummary: "",
			},
		];
	}

	return files.map((file) =>
		inventoryToRow(
			repo,
			relative(cwd, file).replaceAll("\\", "/"),
			scanWorkflowPermissions(readFileSync(file, "utf8")),
		),
	);
}

async function scanRemoteRepos(repos: string[]) {
	const rows: CsvRow[] = [];
	for (const repo of repos) {
		console.error(`Scanning ${repo}`);
		const workflowList = await remoteWorkflowPaths(repo);
		if (workflowList.error) {
			rows.push({
				repo,
				workflowPath: "",
				status: "fetch_error",
				hasWorkflowPermissions: "no",
				hasJobPermissions: "no",
				permissionsSummary: workflowList.error,
			});
			continue;
		}
		if (workflowList.paths.length === 0) {
			rows.push({
				repo,
				workflowPath: "",
				status: "no_workflows",
				hasWorkflowPermissions: "no",
				hasJobPermissions: "no",
				permissionsSummary: "",
			});
			continue;
		}

		for (const workflowPath of workflowList.paths) {
			try {
				const content = await remoteWorkflowContent(repo, workflowPath);
				rows.push(
					inventoryToRow(repo, workflowPath, scanWorkflowPermissions(content)),
				);
			} catch (error) {
				rows.push({
					repo,
					workflowPath,
					status: "fetch_error",
					hasWorkflowPermissions: "no",
					hasJobPermissions: "no",
					permissionsSummary:
						error instanceof Error ? error.message : "failed to fetch workflow",
				});
			}
		}
	}
	return rows;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));

	let targetRepos = [...options.repos];
	if (options.org) {
		targetRepos.push(...(await orgRepos(options.org, options.limit)));
		targetRepos = [...new Set(targetRepos)].sort();
	}

	if (options.dryRun) {
		const mode = options.local
			? "local workflows"
			: `${targetRepos.length} remote repos`;
		console.error(`DRY RUN: would scan ${mode} and write ${options.out}`);
		if (targetRepos.length > 0) {
			for (const repo of targetRepos) console.error(`  - ${repo}`);
		}
		return;
	}

	const rows = [
		...(options.local ? await scanLocal(process.cwd()) : []),
		...(targetRepos.length > 0 ? await scanRemoteRepos(targetRepos) : []),
	];

	mkdirSync(dirname(options.out), { recursive: true });
	writeFileSync(options.out, `${toCsv(rows)}\n`);
	console.error(`Workflow permission inventory complete: ${options.out}`);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
