import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

export const defaultProtectedBranches = ["master", "main", "dev", "develop"];

export interface AutoBranchCliOptions {
	allowDirty: boolean;
	base?: string;
	dryRun: boolean;
	force: boolean;
	help: boolean;
	hook: boolean;
	name?: string;
	prefix: string;
	protectedBranches: string[];
	switchBranch: boolean;
}

export interface AutoBranchResult {
	action: "created" | "already-safe" | "dry-run";
	branch: string;
	currentBranch: string;
	dirty: boolean;
}

interface GitResult {
	status: number;
	stdout: string;
	stderr: string;
}

function git(args: string[], cwd = process.cwd()): GitResult {
	const result = spawnSync("git", args, {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});

	return {
		status: result.status ?? 1,
		stdout: result.stdout.trim(),
		stderr: result.stderr.trim(),
	};
}

function gitOutput(args: string[], fallback = ""): string {
	const result = git(args);
	return result.status === 0 ? result.stdout : fallback;
}

export function sanitizeBranchSegment(value: string): string {
	return (
		value
			.normalize("NFKD")
			.replace(/['"`]/g, "")
			.replace(/[^A-Za-z0-9._-]+/g, "-")
			.replace(/[.-]{2,}/g, "-")
			.replace(/^-+|-+$/g, "")
			.toLowerCase() || "work"
	);
}

export function sanitizeBranchName(value: string): string {
	const cleaned = value
		.replace(/^refs\/heads\//, "")
		.split("/")
		.map(sanitizeBranchSegment)
		.filter(Boolean)
		.join("/");

	return cleaned || "work";
}

export function withBranchPrefix(name: string, prefix: string): string {
	const safePrefix = sanitizeBranchName(prefix);
	const safeName = sanitizeBranchName(name);

	if (safeName === safePrefix || safeName.startsWith(`${safePrefix}/`)) {
		return safeName;
	}

	return `${safePrefix}/${safeName}`;
}

export function isProtectedBranch(
	branch: string,
	protectedBranches = defaultProtectedBranches,
): boolean {
	return protectedBranches.includes(branch);
}

export function formatDateStamp(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hour = String(date.getHours()).padStart(2, "0");
	const minute = String(date.getMinutes()).padStart(2, "0");
	return `${year}${month}${day}-${hour}${minute}`;
}

export function buildDefaultBranchName(
	prefix: string,
	date: Date,
	shortSha: string,
): string {
	return withBranchPrefix(`work-${formatDateStamp(date)}-${shortSha}`, prefix);
}

export function nextAvailableBranchName(
	baseName: string,
	exists: (branch: string) => boolean,
): string {
	if (!exists(baseName)) return baseName;

	for (let index = 2; index <= 99; index += 1) {
		const candidate = `${baseName}-${index}`;
		if (!exists(candidate)) return candidate;
	}

	throw new Error(`Could not find an available branch name for ${baseName}.`);
}

function stringOption(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

export function parseAutoBranchArgs(argv: string[]): AutoBranchCliOptions {
	const { values, positionals } = parseArgs({
		args: argv,
		options: {
			"allow-dirty": { type: "boolean" },
			base: { type: "string" },
			"dry-run": { type: "boolean" },
			force: { type: "boolean", short: "f" },
			help: { type: "boolean", short: "h" },
			hook: { type: "boolean" },
			name: { type: "string", short: "n" },
			"no-switch": { type: "boolean" },
			prefix: { type: "string" },
			protected: { type: "string" },
		},
		allowPositionals: true,
		strict: false,
	});

	const protectedFromEnv = process.env.ELYSIA_AUTO_BRANCH_PROTECTED;
	const protectedValue =
		stringOption(values.protected) ||
		protectedFromEnv ||
		defaultProtectedBranches.join(",");

	return {
		allowDirty: Boolean(values["allow-dirty"]),
		base: stringOption(values.base),
		dryRun: Boolean(values["dry-run"]),
		force: Boolean(values.force),
		help: Boolean(values.help),
		hook: Boolean(values.hook),
		name: stringOption(values.name) || positionals[0],
		prefix:
			stringOption(values.prefix) ||
			process.env.ELYSIA_AUTO_BRANCH_PREFIX ||
			"codex",
		protectedBranches: protectedValue
			.split(",")
			.map((item: string) => item.trim())
			.filter(Boolean),
		switchBranch: !values["no-switch"],
	};
}

function branchExists(branch: string): boolean {
	return (
		git(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]).status ===
			0 ||
		git(["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`])
			.status === 0
	);
}

function isDirty(): boolean {
	return gitOutput(["status", "--porcelain"]).length > 0;
}

function currentBranch(): string {
	return gitOutput(["branch", "--show-current"], "detached");
}

function ensureInsideGitRepo() {
	const result = git(["rev-parse", "--show-toplevel"]);
	if (result.status !== 0) {
		throw new Error("This command must be run inside a Git repository.");
	}
}

export function ensureAutoBranch(
	options: AutoBranchCliOptions,
): AutoBranchResult {
	ensureInsideGitRepo();

	const current = currentBranch();
	const dirty = isDirty();
	const shouldCreate =
		options.force ||
		Boolean(options.name) ||
		current === "detached" ||
		isProtectedBranch(current, options.protectedBranches);

	if (!shouldCreate) {
		return {
			action: "already-safe",
			branch: current,
			currentBranch: current,
			dirty,
		};
	}

	if (options.base && dirty && options.switchBranch && !options.allowDirty) {
		throw new Error(
			"Working tree has changes. Commit, stash, or rerun with --allow-dirty before switching from --base.",
		);
	}

	const shortSha = gitOutput(["rev-parse", "--short", "HEAD"], "unborn");
	const baseName = options.name
		? withBranchPrefix(options.name, options.prefix)
		: buildDefaultBranchName(options.prefix, new Date(), shortSha);
	const branch = nextAvailableBranchName(baseName, branchExists);

	if (options.dryRun) {
		return { action: "dry-run", branch, currentBranch: current, dirty };
	}

	const args = options.switchBranch
		? ["switch", "-c", branch]
		: ["branch", branch];
	if (options.base) args.push(options.base);

	const result = git(args);
	if (result.status !== 0) {
		throw new Error(result.stderr || `git ${args.join(" ")} failed.`);
	}

	return { action: "created", branch, currentBranch: current, dirty };
}

function showHelp() {
	console.log(`
ElysiaAI Auto Branch

Usage:
  bun run branch:auto -- [name]
  bun scripts/auto-branch.ts [name] [options]

Options:
  -n, --name <name>       Branch slug or full branch name.
      --prefix <prefix>   Branch prefix. Default: codex
      --base <ref>        Create from a specific base ref.
      --no-switch         Create the branch without switching to it.
      --allow-dirty       Allow dirty worktree when switching from --base.
      --dry-run           Print the branch that would be created.
  -f, --force             Create a branch even when already on a work branch.
      --protected <list>  Comma-separated protected branches.
  -h, --help              Show help.
`);
}

function report(result: AutoBranchResult, hook: boolean) {
	const write = hook ? console.error : console.log;
	if (result.action === "already-safe") {
		write(`Auto branch: already on safe branch ${result.branch}`);
		return;
	}
	if (result.action === "dry-run") {
		write(`Auto branch dry-run: ${result.branch}`);
		return;
	}

	const dirtyNote = result.dirty ? " with existing worktree changes" : "";
	write(
		`Auto branch: created ${result.branch} from ${result.currentBranch}${dirtyNote}`,
	);
}

if (import.meta.main) {
	try {
		const options = parseAutoBranchArgs(Bun.argv.slice(2));
		if (options.help) {
			showHelp();
			process.exit(0);
		}

		report(ensureAutoBranch(options), options.hook);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}
}
