import { existsSync, type Stats } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import {
	basename,
	extname,
	isAbsolute,
	join,
	relative,
	resolve,
	sep,
} from "node:path";
import { getWorkspaceRoot } from "./mvp-local-ai";

export type SecurityAgentArea =
	| "secrets"
	| "github-actions"
	| "dependency-audit"
	| "log-anomaly";

export type SecurityAgentSeverity = "ok" | "info" | "attention" | "critical";

export type SecurityAgentFinding = {
	area: SecurityAgentArea;
	severity: SecurityAgentSeverity;
	title: string;
	detail: string;
	path?: string;
	line?: number;
	snippet?: string;
};

export type SecurityAgentActionRun = {
	workflowName: string;
	title: string;
	status: string;
	conclusion: string | null;
	branch: string;
	event: string;
	createdAt: string;
	updatedAt: string;
	url?: string;
};

export type SecurityAgentReport = {
	status: SecurityAgentSeverity;
	generatedAt: string;
	root: string;
	actions?: {
		repository: string;
		branch?: string;
		source: "github-api" | "unavailable";
		runs: SecurityAgentActionRun[];
	};
	summary: Record<
		SecurityAgentArea,
		{ label: string; severity: SecurityAgentSeverity; count: number }
	>;
	findings: SecurityAgentFinding[];
};

const SECURITY_SCAN_TARGETS = [
	".github",
	".gitleaks.toml",
	"README.md",
	"README.ja.md",
	"docs",
	"kernel",
	"package.json",
	"packages/server/src",
	"prompts",
	"pyproject.toml",
	"python",
	"requirements.txt",
	"scripts",
	"src",
	"src-tauri",
];

const LOG_SCAN_TARGETS = [
	"logs",
	"server.log",
	"tauri.log",
	"data/runtime/logs",
];

const SECURITY_EXTENSIONS = new Set([
	"",
	".css",
	".html",
	".js",
	".json",
	".log",
	".md",
	".py",
	".rs",
	".toml",
	".ts",
	".tsx",
	".txt",
	".yml",
	".yaml",
]);

const EXCLUDED_PARTS = new Set([
	".git",
	".next",
	".tmp",
	".venv",
	"build",
	"coverage",
	"dist",
	"node_modules",
	"out",
	"target",
]);

const SEVERITY_SCORE: Record<SecurityAgentSeverity, number> = {
	ok: 0,
	info: 1,
	attention: 2,
	critical: 3,
};

const SECRET_PATTERNS: Array<{
	title: string;
	pattern: RegExp;
	severity: SecurityAgentSeverity;
}> = [
	{
		title: "Discord webhook",
		pattern:
			/https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+/i,
		severity: "critical",
	},
	{
		title: "GitHub token",
		pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/i,
		severity: "critical",
	},
	{
		title: "OpenAI API key",
		pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/i,
		severity: "critical",
	},
	{
		title: "Redis credential URL",
		pattern: /\bredis:\/\/[^:\s]+:[^@\s]+@[^/\s]+/i,
		severity: "critical",
	},
	{
		title: "AWS access key",
		pattern: /\bAKIA[0-9A-Z]{16}\b/,
		severity: "critical",
	},
	{
		title: "Private key material",
		pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
		severity: "critical",
	},
];

function normalizePath(root: string, file: string) {
	return relative(root, file).split(sep).join("/");
}

function isInside(root: string, candidate: string): boolean {
	const rel = relative(root, candidate);
	return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function isExcluded(path: string): boolean {
	const parts = path.split(/[\\/]+/);
	if (parts.some((part) => EXCLUDED_PARTS.has(part))) return true;

	const name = basename(path).toLowerCase();
	return name.endsWith(".lock") || name.endsWith(".map");
}

async function collectFiles(
	root: string,
	targets: string[],
	options: { maxFiles?: number; maxBytes?: number } = {},
): Promise<string[]> {
	const files: string[] = [];
	const queue = targets.map((target) => resolve(root, target));
	const maxFiles = options.maxFiles || 800;
	const maxBytes = options.maxBytes || 220 * 1024;

	while (queue.length > 0 && files.length < maxFiles) {
		const current = queue.shift();
		if (!current || !isInside(root, current) || isExcluded(current)) continue;

		let currentStat: Stats;
		try {
			currentStat = await stat(current);
		} catch {
			continue;
		}

		if (currentStat.isDirectory()) {
			const entries = await readdir(current, { withFileTypes: true });
			for (const entry of entries) queue.push(join(current, entry.name));
			continue;
		}

		if (
			currentStat.isFile() &&
			currentStat.size <= maxBytes &&
			SECURITY_EXTENSIONS.has(extname(current).toLowerCase())
		) {
			files.push(current);
		}
	}

	return files;
}

function maskSecret(value: string) {
	if (value.length <= 12) return "[masked]";
	return `${value.slice(0, 6)}...[masked]...${value.slice(-4)}`;
}

function maskSnippet(line: string, pattern: RegExp) {
	const snippet = line.trim().slice(0, 240);
	const replacement = new RegExp(pattern.source, pattern.flags);
	return snippet.replace(replacement, (match) => maskSecret(match));
}

async function scanSecrets(root: string): Promise<SecurityAgentFinding[]> {
	const files = await collectFiles(root, SECURITY_SCAN_TARGETS);
	const findings: SecurityAgentFinding[] = [];

	for (const file of files) {
		let text = "";
		try {
			text = await readFile(file, "utf8");
		} catch {
			continue;
		}

		const lines = text.split(/\r?\n/);
		for (let index = 0; index < lines.length; index++) {
			const line = lines[index] || "";
			for (const secret of SECRET_PATTERNS) {
				secret.pattern.lastIndex = 0;
				if (!secret.pattern.test(line)) continue;
				findings.push({
					area: "secrets",
					severity: secret.severity,
					title: `${secret.title} pattern detected`,
					detail: "A high-risk secret pattern appears in the workspace.",
					path: normalizePath(root, file),
					line: index + 1,
					snippet: maskSnippet(line, secret.pattern),
				});
			}
		}
	}

	if (findings.length === 0) {
		findings.push({
			area: "secrets",
			severity: "ok",
			title: "Secrets scan clean",
			detail:
				"No Discord webhook, Redis credential, API key, or private key pattern was found in the MVP scan scope.",
		});
	}

	return findings;
}

async function readTextIfExists(path: string) {
	try {
		return await readFile(path, "utf8");
	} catch {
		return "";
	}
}

async function scanGitHubActions(
	root: string,
): Promise<SecurityAgentFinding[]> {
	const workflowsDir = join(root, ".github", "workflows");
	const files = await collectFiles(root, [".github/workflows"], {
		maxFiles: 80,
		maxBytes: 160 * 1024,
	});
	const workflowFiles = files.filter((file) =>
		[".yml", ".yaml"].includes(extname(file).toLowerCase()),
	);
	const ciText = await readTextIfExists(join(workflowsDir, "ci.yml"));
	const normalizedCiText = ciText
		.replace(/\\\r?\n\s*/g, " ")
		.replace(/\s+/g, " ");
	const githubEntries: string[] = await readdir(join(root, ".github")).catch(
		() => [],
	);
	const hasUpperTemplate = githubEntries.includes("PULL_REQUEST_TEMPLATE.md");
	const hasLowerTemplate = githubEntries.includes("pull_request_template.md");
	const findings: SecurityAgentFinding[] = [];

	if (workflowFiles.length === 0) {
		findings.push({
			area: "github-actions",
			severity: "attention",
			title: "GitHub Actions workflows missing",
			detail: "No workflow YAML files were found under .github/workflows.",
		});
		return findings;
	}

	findings.push({
		area: "github-actions",
		severity: "ok",
		title: "GitHub Actions workflows present",
		detail: `${workflowFiles.length} workflow file(s) are available for CI and release hygiene.`,
	});

	if (
		normalizedCiText.includes("ruff check") &&
		normalizedCiText.includes("python/fastapi_server.py") &&
		normalizedCiText.includes("tests/python") &&
		normalizedCiText.includes("scripts/security/audit_dependencies.py")
	) {
		findings.push({
			area: "github-actions",
			severity: "ok",
			title: "Python CI debt scoped",
			detail:
				"Ruff and pytest gates are focused on the MVP Python surface instead of the legacy whole-repo backlog.",
			path: ".github/workflows/ci.yml",
		});
	} else {
		findings.push({
			area: "github-actions",
			severity: "attention",
			title: "Python CI scope needs review",
			detail:
				"The CI workflow does not appear to contain the scoped Ruff command for the MVP Python surface.",
			path: ".github/workflows/ci.yml",
		});
	}

	if (hasUpperTemplate && !hasLowerTemplate) {
		findings.push({
			area: "github-actions",
			severity: "ok",
			title: "PR template case collision resolved",
			detail:
				"Only .github/PULL_REQUEST_TEMPLATE.md is present on this checkout.",
			path: ".github/PULL_REQUEST_TEMPLATE.md",
		});
	} else {
		findings.push({
			area: "github-actions",
			severity: "attention",
			title: "PR template case collision remains possible",
			detail:
				"Keep only one PR template path to avoid Windows/macOS case-insensitive checkout collisions.",
			path: ".github",
		});
	}

	return findings;
}

function parseGitHubRepository(remoteUrl: string): string | null {
	const normalized = remoteUrl.trim();
	const httpsMatch = normalized.match(
		/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/,
	);
	if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;

	const sshMatch = normalized.match(
		/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/,
	);
	if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;

	return null;
}

async function resolveGitHubRepository(root: string) {
	const envRepository = process.env.GITHUB_REPOSITORY?.trim();
	const envBranch =
		process.env.GITHUB_REF_NAME?.trim() || process.env.GITHUB_HEAD_REF?.trim();
	if (envRepository) return { repository: envRepository, branch: envBranch };

	const gitConfig = await readTextIfExists(join(root, ".git", "config"));
	const remoteMatch = gitConfig.match(
		/\[remote "origin"\][\s\S]*?\n\s*url = (.+)/,
	);
	const repository = remoteMatch?.[1]
		? parseGitHubRepository(remoteMatch[1])
		: null;
	if (!repository) return null;

	const head = await readTextIfExists(join(root, ".git", "HEAD"));
	const branch = head.match(/^ref: refs\/heads\/(.+)$/m)?.[1]?.trim();
	return { repository, branch };
}

function actionRunSeverity(
	run: Pick<SecurityAgentActionRun, "status" | "conclusion">,
): SecurityAgentSeverity {
	if (run.status !== "completed") return "info";
	if (run.conclusion === "success") return "ok";
	if (run.conclusion === "skipped" || run.conclusion === "neutral")
		return "info";
	if (run.conclusion === "failure" || run.conclusion === "timed_out") {
		return "critical";
	}
	return "attention";
}

async function fetchGitHubActionsHistory(root: string): Promise<{
	actions?: SecurityAgentReport["actions"];
	findings: SecurityAgentFinding[];
}> {
	const resolved = await resolveGitHubRepository(root);
	if (!resolved) return { findings: [] };

	const url = new URL(
		`https://api.github.com/repos/${resolved.repository}/actions/runs`,
	);
	url.searchParams.set("per_page", "6");
	if (resolved.branch) url.searchParams.set("branch", resolved.branch);

	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"User-Agent": "ElysiaAI-Security-Agent",
	};
	const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
	if (githubToken) {
		headers.Authorization = `Bearer ${githubToken}`;
	}

	try {
		const abort = new AbortController();
		const timeout = setTimeout(() => abort.abort(), 3500);
		const response = await fetch(url, { headers, signal: abort.signal });
		clearTimeout(timeout);

		if (!response.ok) {
			return {
				actions: {
					repository: resolved.repository,
					branch: resolved.branch,
					source: "unavailable",
					runs: [],
				},
				findings: [
					{
						area: "github-actions",
						severity: "attention",
						title: "GitHub Actions history unavailable",
						detail: `GitHub API returned ${response.status} while reading recent workflow runs.${githubToken ? "" : " Private repositories may require GH_TOKEN or GITHUB_TOKEN."}`,
					},
				],
			};
		}

		const data = (await response.json()) as {
			workflow_runs?: Array<{
				name?: string;
				display_title?: string;
				status?: string;
				conclusion?: string | null;
				head_branch?: string;
				event?: string;
				created_at?: string;
				updated_at?: string;
				html_url?: string;
			}>;
		};
		const runs: SecurityAgentActionRun[] = (data.workflow_runs || [])
			.slice(0, 6)
			.map((run) => ({
				workflowName: run.name || "GitHub Actions",
				title: run.display_title || run.name || "Workflow run",
				status: run.status || "unknown",
				conclusion: run.conclusion ?? null,
				branch: run.head_branch || resolved.branch || "",
				event: run.event || "",
				createdAt: run.created_at || "",
				updatedAt: run.updated_at || "",
				url: run.html_url,
			}));

		const latest = runs[0];
		const findings: SecurityAgentFinding[] = [];
		if (!latest) {
			findings.push({
				area: "github-actions",
				severity: "attention",
				title: "No recent GitHub Actions runs found",
				detail: `No recent workflow runs were returned for ${resolved.repository}${resolved.branch ? ` on ${resolved.branch}` : ""}.`,
			});
		} else {
			const severity = actionRunSeverity(latest);
			findings.push({
				area: "github-actions",
				severity,
				title: `Latest GitHub Actions run: ${latest.workflowName}`,
				detail: `${latest.title} is ${latest.status}${latest.conclusion ? ` / ${latest.conclusion}` : ""}. Updated at ${latest.updatedAt || "unknown"}.`,
				path: latest.url,
			});
		}

		return {
			actions: {
				repository: resolved.repository,
				branch: resolved.branch,
				source: "github-api",
				runs,
			},
			findings,
		};
	} catch (error) {
		return {
			actions: {
				repository: resolved.repository,
				branch: resolved.branch,
				source: "unavailable",
				runs: [],
			},
			findings: [
				{
					area: "github-actions",
					severity: "attention",
					title: "GitHub Actions history unavailable",
					detail:
						error instanceof Error
							? error.message
							: "Recent workflow runs could not be fetched.",
				},
			],
		};
	}
}

async function scanDependencies(root: string): Promise<SecurityAgentFinding[]> {
	const packageText = await readTextIfExists(join(root, "package.json"));
	const requirementsText = await readTextIfExists(
		join(root, "requirements.txt"),
	);
	const gitleaksExists = existsSync(join(root, ".gitleaks.toml"));
	const findings: SecurityAgentFinding[] = [];

	try {
		const packageJson = JSON.parse(packageText || "{}") as {
			scripts?: Record<string, string>;
			dependencies?: Record<string, string>;
		};
		if (packageJson.scripts?.["security:audit"]) {
			findings.push({
				area: "dependency-audit",
				severity: "ok",
				title: "Dependency audit script present",
				detail:
					"package.json exposes security:audit for CI and local release hygiene.",
				path: "package.json",
			});
		} else {
			findings.push({
				area: "dependency-audit",
				severity: "attention",
				title: "Dependency audit script missing",
				detail: "Add a repeatable dependency audit command before MVP release.",
				path: "package.json",
			});
		}

		if (!packageJson.dependencies?.["ollama-ai-provider"]) {
			findings.push({
				area: "dependency-audit",
				severity: "ok",
				title: "Vulnerable Ollama provider package absent",
				detail:
					"The server now talks to Ollama directly, avoiding the vulnerable provider dependency.",
				path: "package.json",
			});
		}
	} catch {
		findings.push({
			area: "dependency-audit",
			severity: "attention",
			title: "package.json could not be parsed",
			detail: "Dependency audit checks could not inspect package.json.",
			path: "package.json",
		});
	}

	if (
		requirementsText.includes("ruff") &&
		requirementsText.includes("pytest")
	) {
		findings.push({
			area: "dependency-audit",
			severity: "ok",
			title: "Python quality dependencies present",
			detail:
				"requirements.txt includes Ruff and pytest for the scoped Python CI gate.",
			path: "requirements.txt",
		});
	}

	findings.push({
		area: "dependency-audit",
		severity: gitleaksExists ? "ok" : "attention",
		title: gitleaksExists
			? "Gitleaks policy present"
			: "Gitleaks policy missing",
		detail: gitleaksExists
			? "Secret scanning policy is available locally."
			: "Add .gitleaks.toml before treating secrets detection as enforced.",
		path: ".gitleaks.toml",
	});

	return findings;
}

async function scanLogAnomalies(root: string): Promise<SecurityAgentFinding[]> {
	const files = await collectFiles(root, LOG_SCAN_TARGETS, {
		maxFiles: 80,
		maxBytes: 320 * 1024,
	});
	const findings: SecurityAgentFinding[] = [];
	const suspicious =
		/\b(error|fatal|panic|exception|failed|denied|secret|token|webhook|redis)\b/i;

	for (const file of files) {
		const text = await readTextIfExists(file);
		const lines = text.split(/\r?\n/).slice(-250);
		let matches = 0;
		for (const line of lines) {
			if (suspicious.test(line)) matches += 1;
		}
		if (matches > 0) {
			findings.push({
				area: "log-anomaly",
				severity: matches >= 8 ? "attention" : "info",
				title: "Log anomaly keywords detected",
				detail: `${matches} recent line(s) include failure or secret-related keywords.`,
				path: normalizePath(root, file),
			});
		}
	}

	if (findings.length === 0) {
		findings.push({
			area: "log-anomaly",
			severity: "ok",
			title: "No local log anomalies found",
			detail:
				"No recent local log file with failure or secret-related keywords was found in the MVP log scope.",
		});
	}

	return findings;
}

function worstSeverity(findings: SecurityAgentFinding[]) {
	return findings.reduce<SecurityAgentSeverity>(
		(worst, finding) =>
			SEVERITY_SCORE[finding.severity] > SEVERITY_SCORE[worst]
				? finding.severity
				: worst,
		"ok",
	);
}

function buildSummary(findings: SecurityAgentFinding[]) {
	const labels: Record<SecurityAgentArea, string> = {
		secrets: "Secrets",
		"github-actions": "GitHub Actions",
		"dependency-audit": "Dependencies",
		"log-anomaly": "Logs",
	};
	const areas = Object.keys(labels) as SecurityAgentArea[];
	return Object.fromEntries(
		areas.map((area) => {
			const areaFindings = findings.filter((finding) => finding.area === area);
			return [
				area,
				{
					label: labels[area],
					severity: worstSeverity(areaFindings),
					count: areaFindings.filter((finding) => finding.severity !== "ok")
						.length,
				},
			];
		}),
	) as SecurityAgentReport["summary"];
}

export async function buildSecurityAgentReport(
	root = getWorkspaceRoot(),
): Promise<SecurityAgentReport> {
	const resolvedRoot = resolve(root);
	const actionHistory = await fetchGitHubActionsHistory(resolvedRoot);
	const findings = [
		...(await scanSecrets(resolvedRoot)),
		...(await scanGitHubActions(resolvedRoot)),
		...actionHistory.findings,
		...(await scanDependencies(resolvedRoot)),
		...(await scanLogAnomalies(resolvedRoot)),
	];

	return {
		status: worstSeverity(findings),
		generatedAt: new Date().toISOString(),
		root: resolvedRoot,
		actions: actionHistory.actions,
		summary: buildSummary(findings),
		findings,
	};
}
