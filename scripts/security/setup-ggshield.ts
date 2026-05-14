#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { homedir, platform, tmpdir } from "node:os";
import { basename, extname, join, relative } from "node:path";

const PROJECT_ROOT = process.cwd();
const SAMPLE_REPO = "https://github.com/GitGuardian/sample_secrets.git";
const args = new Set(process.argv.slice(2));

const includeDocs = args.has("--include-docs");
const failOnIncidents = !args.has("--no-fail");
const shouldAuth = args.has("--auth");
const shouldScan = args.has("--scan");
const shouldScanHistory = args.has("--history");
const shouldScanSample = args.has("--sample");

const codeAndConfigExtensions = new Set([
	".bat",
	".cjs",
	".cmd",
	".conf",
	".css",
	".cfg",
	".dockerignore",
	".editorconfig",
	".env",
	".example",
	".forge",
	".gitattributes",
	".gitignore",
	".html",
	".js",
	".json",
	".jsonc",
	".mjs",
	".npmrc",
	".prisma",
	".production",
	".ps1",
	".py",
	".rs",
	".sandbox",
	".sh",
	".shield",
	".sql",
	".swift",
	".template",
	".toml",
	".ts",
	".tsx",
	".txt",
	".yaml",
	".yml",
]);

const textFileNames = new Set([
	".claudeignore",
	".cleanignore",
	".dockerignore",
	".editorconfig",
	".env.example",
	".gitattributes",
	".gitignore",
	".npmrc",
	".yarnrc.yml",
	"Dockerfile",
	"Makefile",
]);

const excludedPrefixes = [
	".Codex/completions/",
	".Codex/sessions/",
	".github/assets/",
	"docs/archive/",
	"node_modules/",
	"output/",
	"python/data/",
];

type CommandResult = {
	status: number | null;
	stdout: string;
	stderr: string;
	error?: Error;
};

function printHelp() {
	console.log(`Usage:
  bun scripts/security/setup-ggshield.ts [options]

Options:
  --auth          Run ggshield auth login after install.
  --scan          Scan tracked code/config files and summarize findings.
  --include-docs  Include Markdown files in --scan.
  --history       Scan full git history with ggshield secret scan repo .
  --sample        Scan GitGuardian's public sample repo over HTTPS.
  --no-fail       Do not exit non-zero when secrets are found.

Examples:
  bun run security:ggshield:setup
  bun run security:ggshield:scan
  bun run security:ggshield:scan -- --include-docs
  bun run security:ggshield:history
`);
}

function runCapture(
	command: string,
	commandArgs: string[] = [],
	extraEnv: NodeJS.ProcessEnv = {},
): CommandResult {
	const result = spawnSync(command, commandArgs, {
		cwd: PROJECT_ROOT,
		encoding: "utf8",
		env: { ...process.env, ...extraEnv },
		stdio: ["ignore", "pipe", "pipe"],
	});

	return {
		status: result.status,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
		error: result.error,
	};
}

function runInherit(
	command: string,
	commandArgs: string[],
	extraEnv: NodeJS.ProcessEnv = {},
) {
	const result = spawnSync(command, commandArgs, {
		cwd: PROJECT_ROOT,
		env: { ...process.env, ...extraEnv },
		stdio: "inherit",
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		throw new Error(
			`${command} ${commandArgs.join(" ")} exited with ${result.status}`,
		);
	}
}

function commandWorks(command: string, commandArgs: string[] = ["--version"]) {
	const result = runCapture(command, commandArgs);
	return !result.error && result.status === 0;
}

function localGgshieldPath() {
	const exe = platform() === "win32" ? "ggshield.exe" : "ggshield";
	return join(homedir(), ".local", "bin", exe);
}

function resolveGgshield() {
	const configured = process.env.GGSHIELD_BIN?.trim();
	if (configured && existsSync(configured)) {
		return configured;
	}

	if (commandWorks("ggshield")) {
		return "ggshield";
	}

	const local = localGgshieldPath();
	if (existsSync(local)) {
		return local;
	}

	return undefined;
}

function resolvePython() {
	const candidates = [
		process.env.PYTHON?.trim(),
		platform() === "win32" ? "python" : "python3",
		"python3",
		"python",
	].filter((candidate): candidate is string => Boolean(candidate));

	for (const candidate of candidates) {
		if (commandWorks(candidate, ["--version"])) {
			return candidate;
		}
	}

	return undefined;
}

function installGgshield() {
	const existing = resolveGgshield();
	if (existing) {
		console.log(`[ok] ggshield found: ${existing}`);
		return existing;
	}

	if (commandWorks("brew", ["--version"])) {
		console.log("[setup] Installing ggshield with Homebrew");
		runInherit("brew", ["install", "ggshield"]);
	} else {
		const python = resolvePython();
		if (!python) {
			throw new Error(
				"Python was not found. Install Python or Homebrew, then rerun this script.",
			);
		}

		console.log("[setup] Installing pipx with Python");
		runInherit(python, ["-m", "pip", "install", "--user", "pipx"]);
		console.log("[setup] Installing ggshield with pipx");
		runInherit(python, ["-m", "pipx", "install", "ggshield"]);
		console.log("[setup] Ensuring pipx bin directory is on PATH");
		runInherit(python, ["-m", "pipx", "ensurepath"]);
	}

	const installed = resolveGgshield();
	if (!installed) {
		throw new Error(
			`ggshield installed, but it was not found. Try opening a new terminal or set GGSHIELD_BIN=${localGgshieldPath()}`,
		);
	}

	console.log(`[ok] ggshield installed: ${installed}`);
	return installed;
}

function ggshieldEnv(): NodeJS.ProcessEnv {
	return platform() === "win32" ? { PYTHONUTF8: "1" } : {};
}

function ggshieldVersion(ggshield: string) {
	const result = runCapture(ggshield, ["--version"], ggshieldEnv());
	const output = `${result.stdout}${result.stderr}`.trim();
	if (output) {
		console.log(`[ok] ${output}`);
	}
}

function normalized(path: string) {
	return path.replaceAll("\\", "/");
}

function shouldScanFile(path: string) {
	const normalizedPath = normalized(path);
	if (excludedPrefixes.some((prefix) => normalizedPath.startsWith(prefix))) {
		return false;
	}

	const name = basename(path);
	const ext = extname(path).toLowerCase();
	if (includeDocs && ext === ".md") {
		return true;
	}

	return codeAndConfigExtensions.has(ext) || textFileNames.has(name);
}

function trackedFiles() {
	const result = runCapture("git", ["-c", "core.quotePath=false", "ls-files"]);
	if (result.error || result.status !== 0) {
		throw new Error(`git ls-files failed: ${result.stderr.trim()}`);
	}

	return result.stdout
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.filter(shouldScanFile);
}

function asArray(value: unknown): Record<string, unknown>[] {
	if (!value) {
		return [];
	}

	return Array.isArray(value)
		? (value.filter(Boolean) as Record<string, unknown>[])
		: [value as Record<string, unknown>];
}

function numberValue(value: unknown) {
	return typeof value === "number" ? value : 0;
}

function relativeOrOriginal(path: string) {
	if (path.startsWith("commit://")) {
		return path;
	}

	const rel = relative(PROJECT_ROOT, path);
	return rel && !rel.startsWith("..") ? rel : path;
}

function scanRoots(payload: Record<string, unknown>) {
	const scans = asArray(payload.scans);
	return scans.length > 0 ? scans : [payload];
}

function summarizeJsonScan(
	outFile: string,
	label: string,
	options: { expectedFindings?: boolean } = {},
) {
	const payload = JSON.parse(readFileSync(outFile, "utf8")) as Record<
		string,
		unknown
	>;
	const roots = scanRoots(payload);
	const totalIncidents =
		numberValue(payload.total_incidents) ||
		roots.reduce((sum, scan) => sum + numberValue(scan.total_incidents), 0);
	const totalOccurrences =
		numberValue(payload.total_occurrences) ||
		roots.reduce((sum, scan) => sum + numberValue(scan.total_occurrences), 0);
	const findings: string[] = [];

	for (const scan of roots) {
		for (const entity of asArray(scan.entities_with_incidents)) {
			if (numberValue(entity.total_incidents) <= 0) {
				continue;
			}

			const filename = relativeOrOriginal(String(entity.filename ?? "unknown"));
			for (const incident of asArray(entity.incidents)) {
				const type = String(incident.type ?? incident.policy ?? "Secret");
				const validity = String(incident.validity ?? "unknown");
				const occurrences = asArray(incident.occurrences);
				const firstOccurrence = occurrences[0];
				const line = firstOccurrence?.line_start
					? `:${String(firstOccurrence.line_start)}`
					: "";
				findings.push(`${filename}${line} - ${type} (${validity})`);
			}
		}
	}

	console.log(`[scan] ${label}`);
	console.log(`Total incidents: ${totalIncidents}`);
	console.log(`Total occurrences: ${totalOccurrences}`);

	if (findings.length > 0) {
		console.log("Findings:");
		for (const finding of findings.slice(0, 25)) {
			console.log(`- ${finding}`);
		}
		if (findings.length > 25) {
			console.log(`- ... ${findings.length - 25} more finding(s) omitted`);
		}
	} else {
		console.log("Findings: none");
	}

	if (totalIncidents > 0 && failOnIncidents && !options.expectedFindings) {
		process.exitCode = 1;
	}
}

function withTempFiles<T>(
	prefix: string,
	fn: (dir: string, pathsFile: string, outFile: string) => T,
) {
	const dir = mkdtempSync(join(tmpdir(), prefix));
	const pathsFile = join(dir, "paths.txt");
	const outFile = join(dir, "ggshield.json");

	try {
		return fn(dir, pathsFile, outFile);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function runPathScan(ggshield: string) {
	const files = trackedFiles();
	if (files.length === 0) {
		console.log("[scan] No tracked code/config files matched the scan filter.");
		return;
	}

	withTempFiles("elysiaai-ggshield-", (_dir, pathsFile, outFile) => {
		writeFileSync(pathsFile, `${files.join("\n")}\n`, "utf8");
		const result = spawnSync(
			ggshield,
			[
				"secret",
				"scan",
				"path",
				"--yes",
				"--exit-zero",
				"--format",
				"json",
				"--output",
				outFile,
				`@${pathsFile}`,
			],
			{
				cwd: PROJECT_ROOT,
				encoding: "utf8",
				env: { ...process.env, ...ggshieldEnv() },
				stdio: ["ignore", "pipe", "pipe"],
			},
		);

		const warnings = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
		if (warnings) {
			console.log(warnings);
		}

		if (result.error) {
			throw result.error;
		}

		if (result.status !== 0) {
			throw new Error(`ggshield path scan exited with ${result.status}`);
		}

		console.log(`Files scanned: ${files.length}`);
		summarizeJsonScan(outFile, "tracked code/config files");
	});
}

function runRepoScan(ggshield: string, repository: string, label: string) {
	withTempFiles("elysiaai-ggshield-repo-", (_dir, _pathsFile, outFile) => {
		const result = spawnSync(
			ggshield,
			[
				"secret",
				"scan",
				"repo",
				"--exit-zero",
				"--format",
				"json",
				"--output",
				outFile,
				repository,
			],
			{
				cwd: PROJECT_ROOT,
				encoding: "utf8",
				env: { ...process.env, ...ggshieldEnv() },
				stdio: ["ignore", "pipe", "pipe"],
			},
		);

		const warnings = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
		if (warnings) {
			console.log(warnings);
		}

		if (result.error) {
			throw result.error;
		}

		if (result.status !== 0) {
			throw new Error(`ggshield repo scan exited with ${result.status}`);
		}

		summarizeJsonScan(outFile, label, {
			expectedFindings: repository === SAMPLE_REPO,
		});
	});
}

async function main() {
	if (args.has("--help") || args.has("-h")) {
		printHelp();
		return;
	}

	const ggshield = installGgshield();
	ggshieldVersion(ggshield);

	if (shouldAuth) {
		runInherit(ggshield, ["auth", "login"], ggshieldEnv());
	}

	if (shouldScan) {
		runPathScan(ggshield);
	}

	if (shouldScanHistory) {
		runRepoScan(ggshield, ".", "local git history");
	}

	if (shouldScanSample) {
		runRepoScan(ggshield, SAMPLE_REPO, "GitGuardian sample repository");
	}

	if (!shouldAuth && !shouldScan && !shouldScanHistory && !shouldScanSample) {
		console.log("No action requested. Use --auth, --scan, --history, or --sample.");
	}
}

main().catch((error) => {
	console.error(
		`[error] ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exitCode = 1;
});
