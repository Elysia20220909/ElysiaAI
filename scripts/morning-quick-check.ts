import { spawnSync } from "node:child_process";

type PullRequest = {
	number: number;
	title: string;
	author?: { login?: string };
	isDraft?: boolean;
	updatedAt?: string;
	reviewDecision?: string;
	mergeStateStatus?: string;
};

type WorkflowRun = {
	databaseId: number;
	displayTitle: string;
	workflowName: string;
	headBranch: string;
	conclusion: string;
	status: string;
	createdAt: string;
	url: string;
};

type GitHubCommit = {
	sha: string;
	commit?: {
		author?: {
			date?: string;
			name?: string;
		};
		message?: string;
	};
};

type Options = {
	repo?: string;
	hours: number;
	limit: number;
};

function parseArgs(argv = process.argv.slice(2)): Options {
	const options: Options = {
		hours: 48,
		limit: 10,
	};

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];
		if (arg === "--repo") options.repo = argv[++index];
		if (arg === "--hours") options.hours = Number(argv[++index]) || 48;
		if (arg === "--limit") options.limit = Number(argv[++index]) || 10;
	}

	return options;
}

function run(command: string, args: string[], timeoutMs = 30_000) {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		timeout: timeoutMs,
	});

	return {
		ok: result.status === 0,
		stdout: result.stdout.trim(),
		stderr: result.stderr.trim(),
		status: result.status,
	};
}

function git(args: string[]) {
	return run("git", args, 10_000);
}

function parseRepoFromRemote(remoteUrl: string) {
	const match = /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(
		remoteUrl,
	);
	if (!match) return undefined;
	return `${match[1]}/${match[2]}`;
}

function resolveRepo(explicit?: string) {
	if (explicit) return explicit;
	const remote = git(["remote", "get-url", "origin"]);
	if (!remote.ok) return undefined;
	return parseRepoFromRemote(remote.stdout);
}

function ghJson<T>(args: string[]): T | undefined {
	const result = run("gh", args, 60_000);
	if (!result.ok || !result.stdout) return undefined;

	try {
		return JSON.parse(result.stdout) as T;
	} catch {
		return undefined;
	}
}

function isoHoursAgo(hours: number) {
	return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function localStatus() {
	const status = git(["status", "-sb"]);
	return status.ok ? status.stdout : "";
}

function oneLineStatus(status: string) {
	return status.split(/\r?\n/).filter(Boolean).join("; ");
}

function localRecentCommits(hours: number) {
	const result = git([
		"log",
		"--oneline",
		`--since=${hours} hours ago`,
		"--max-count=10",
	]);
	if (!result.ok || !result.stdout) return [];
	return result.stdout.split(/\r?\n/).filter(Boolean);
}

function aheadCount(status: string) {
	const match = /\[ahead (\d+)/.exec(status);
	return match ? Number(match[1]) : 0;
}

function isWithinHours(dateText: string, hours: number) {
	const time = Date.parse(dateText);
	if (Number.isNaN(time)) return false;
	return time >= Date.now() - hours * 60 * 60 * 1000;
}

function pickOne(
	prs: PullRequest[],
	failures: WorkflowRun[],
	localAhead: number,
	localCommits: string[],
	hours: number,
) {
	const smallPr = prs.find((pr) => !pr.isDraft) || prs[0];
	if (smallPr) {
		return `PR #${smallPr.number} を確認する: ${smallPr.title}`;
	}

	const recentFailure = failures.find((run) =>
		isWithinHours(run.createdAt, hours),
	);
	if (recentFailure) {
		return `直近の失敗CIを確認する: ${recentFailure.workflowName} / ${recentFailure.displayTitle}`;
	}

	if (localAhead > 0) {
		return `ローカルの未pushコミット ${localAhead} 件を確認し、必要ならpushしてCIを回す`;
	}

	const latestFailure = failures[0];
	if (latestFailure) {
		return `古い失敗CIを棚卸しする: ${latestFailure.workflowName} / ${latestFailure.displayTitle}`;
	}

	if (localCommits.length > 0) {
		return `直近コミットの周辺で表記ゆれや警告を1件だけ直す: ${localCommits[0]}`;
	}

	return "小さな改善を1件作る: docs、テスト名、READMEの古い表記を確認する";
}

function printSection(title: string, lines: string[]) {
	console.log(`\n## ${title}`);
	if (lines.length === 0) {
		console.log("- なし");
		return;
	}
	for (const line of lines) console.log(`- ${line}`);
}

function main() {
	const options = parseArgs();
	const repo = resolveRepo(options.repo);
	const status = localStatus();
	const localAhead = aheadCount(status);
	const localCommits = localRecentCommits(options.hours);

	const ghAvailable = run("gh", ["--version"], 10_000).ok;
	const prs =
		ghAvailable && repo
			? ghJson<PullRequest[]>([
					"pr",
					"list",
					"--repo",
					repo,
					"--state",
					"open",
					"--limit",
					String(options.limit),
					"--json",
					"number,title,author,isDraft,updatedAt,reviewDecision,mergeStateStatus",
				]) || []
			: [];
	const failures =
		ghAvailable && repo
			? ghJson<WorkflowRun[]>([
					"run",
					"list",
					"--repo",
					repo,
					"--limit",
					String(options.limit),
					"--status",
					"failure",
					"--json",
					"databaseId,displayTitle,workflowName,headBranch,conclusion,status,createdAt,url",
				]) || []
			: [];
	const commits =
		ghAvailable && repo
			? (
					ghJson<GitHubCommit[]>([
						"api",
						"--method",
						"GET",
						`repos/${repo}/commits`,
						"-f",
						`since=${isoHoursAgo(options.hours)}`,
					]) || []
				).map((commit) => ({
					sha: commit.sha.slice(0, 7),
					date: commit.commit?.author?.date || "",
					author: commit.commit?.author?.name || "unknown",
					message: (commit.commit?.message || "").split("\n")[0],
				}))
			: [];

	console.log("# Morning Quick Check");
	console.log(`- repo: ${repo || "unknown"}`);
	console.log(`- window: ${options.hours}h`);
	console.log(`- gh: ${ghAvailable ? "available" : "unavailable"}`);
	console.log(`- git: ${status ? oneLineStatus(status) : "unknown"}`);

	printSection(
		"Open PR",
		prs.map((pr) => {
			const draft = pr.isDraft ? "draft" : "ready";
			const author = pr.author?.login || "unknown";
			return `#${pr.number} ${pr.title} (${draft}, ${author})`;
		}),
	);

	printSection(
		"Failed CI",
		failures.map(
			(run) =>
				`${run.createdAt} ${run.workflowName} / ${run.displayTitle} (${run.headBranch}) ${run.url}`,
		),
	);

	printSection(
		"Remote Commits",
		commits.map(
			(commit) =>
				`${commit.sha} ${commit.date} ${commit.author}: ${commit.message}`,
		),
	);

	printSection("Local Recent Commits", localCommits);

	console.log("\n## 今日の一手");
	console.log(
		`- ${pickOne(prs, failures, localAhead, localCommits, options.hours)}`,
	);
}

main();
