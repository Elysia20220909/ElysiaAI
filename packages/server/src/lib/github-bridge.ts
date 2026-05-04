import { getEnv } from "../../../../src/config.ts";

export interface GitHubRepoRef {
	owner: string;
	name: string;
	fullName: string;
}

export interface GitHubRepoSnapshot {
	fullName: string;
	visibility?: string;
	private?: boolean;
	defaultBranch?: string;
	archived?: boolean;
	htmlUrl?: string;
	updatedAt?: string;
	openIssuesCount?: number;
	allowAutoMerge?: boolean;
	permissions?: {
		admin?: boolean;
		maintain?: boolean;
		push?: boolean;
		pull?: boolean;
		triage?: boolean;
	};
}

export interface GitHubFetchResult {
	ok: boolean;
	status: number;
	repo?: GitHubRepoSnapshot;
	error?: string;
}

type FetchLike = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

interface GitHubRepoApiResponse {
	full_name?: string;
	visibility?: string;
	private?: boolean;
	default_branch?: string;
	archived?: boolean;
	html_url?: string;
	updated_at?: string;
	open_issues_count?: number;
	allow_auto_merge?: boolean;
	permissions?: GitHubRepoSnapshot["permissions"];
	message?: string;
}

export function parseGitHubRepoFullName(value: string): GitHubRepoRef | null {
	const trimmed = value.trim();
	const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(trimmed);
	if (!match) return null;
	return {
		owner: match[1],
		name: match[2],
		fullName: `${match[1]}/${match[2]}`,
	};
}

export function getDefaultGitHubRepo() {
	return getEnv("GINROU_DEFAULT_REPO", "Elysia20220909/ElysiaAI");
}

function buildGitHubHeaders(token = getEnv("GITHUB_TOKEN", "")) {
	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "ElysiaAI-GINROU-Lv999",
	};
	if (token) headers.Authorization = `Bearer ${token}`;
	return headers;
}

export async function fetchGitHubRepoSnapshot(
	fullName = getDefaultGitHubRepo(),
	options: { token?: string; fetchImpl?: FetchLike } = {},
): Promise<GitHubFetchResult> {
	const repo = parseGitHubRepoFullName(fullName);
	if (!repo) {
		return { ok: false, status: 0, error: "invalid repo full name" };
	}

	const fetchImpl = options.fetchImpl ?? fetch;
	try {
		const response = await fetchImpl(
			`https://api.github.com/repos/${repo.owner}/${repo.name}`,
			{ headers: buildGitHubHeaders(options.token) },
		);
		const payload = (await response.json().catch(() => undefined)) as
			| GitHubRepoApiResponse
			| undefined;

		if (!response.ok || !payload?.full_name) {
			return {
				ok: false,
				status: response.status,
				error: payload?.message || "GitHub repo lookup failed",
			};
		}

		return {
			ok: true,
			status: response.status,
			repo: {
				fullName: payload.full_name,
				visibility: payload.visibility,
				private: payload.private,
				defaultBranch: payload.default_branch,
				archived: payload.archived,
				htmlUrl: payload.html_url,
				updatedAt: payload.updated_at,
				openIssuesCount: payload.open_issues_count,
				allowAutoMerge: payload.allow_auto_merge,
				permissions: payload.permissions,
			},
		};
	} catch (error) {
		return {
			ok: false,
			status: 0,
			error: error instanceof Error ? error.message : "GitHub request failed",
		};
	}
}

export function buildGitHubRepoStatusText(result: GitHubFetchResult) {
	if (!result.ok || !result.repo) {
		return [
			"GitHub repo lookup failed",
			`Status: ${result.status || "n/a"}`,
			`Reason: ${result.error || "unknown"}`,
			"Hint: set GITHUB_TOKEN for private repositories.",
		].join("\n");
	}

	const repo = result.repo;
	const permission = repo.permissions?.admin
		? "admin"
		: repo.permissions?.maintain
			? "maintain"
			: repo.permissions?.push
				? "push"
				: repo.permissions?.pull
					? "pull"
					: "unknown";

	return [
		`GitHub Repo: ${repo.fullName}`,
		`Visibility: ${repo.visibility || (repo.private ? "private" : "unknown")}`,
		`Default Branch: ${repo.defaultBranch || "unknown"}`,
		`Archived: ${repo.archived ? "yes" : "no"}`,
		`Open Issues/PRs: ${repo.openIssuesCount ?? "unknown"}`,
		`Permission: ${permission}`,
		`Auto Merge: ${repo.allowAutoMerge ? "enabled" : "unknown"}`,
		repo.htmlUrl ? `URL: ${repo.htmlUrl}` : "",
	]
		.filter(Boolean)
		.join("\n");
}

export function buildGitHubSlackSubscribeCommand(
	fullName = getDefaultGitHubRepo(),
) {
	const repo = parseGitHubRepoFullName(fullName);
	if (!repo) return null;
	return `/github subscribe ${repo.fullName} commits pulls issues workflows`;
}
