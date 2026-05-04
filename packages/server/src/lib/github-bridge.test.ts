import { describe, expect, test } from "bun:test";
import {
	buildGitHubRepoStatusText,
	buildGitHubSlackSubscribeCommand,
	fetchGitHubRepoSnapshot,
	parseGitHubRepoFullName,
} from "./github-bridge";

describe("github bridge", () => {
	test("parses owner/repo names", () => {
		expect(parseGitHubRepoFullName("Elysia20220909/ElysiaAI")).toEqual({
			owner: "Elysia20220909",
			name: "ElysiaAI",
			fullName: "Elysia20220909/ElysiaAI",
		});
		expect(parseGitHubRepoFullName("bad repo")).toBeNull();
	});

	test("builds GitHub Slack subscribe commands", () => {
		expect(buildGitHubSlackSubscribeCommand("Elysia20220909/ElysiaAI")).toBe(
			"/github subscribe Elysia20220909/ElysiaAI commits pulls issues workflows",
		);
	});

	test("fetches repo snapshots through the GitHub REST API", async () => {
		const fetchImpl = async () =>
			new Response(
				JSON.stringify({
					full_name: "Elysia20220909/ElysiaAI",
					visibility: "private",
					private: true,
					default_branch: "master",
					archived: false,
					html_url: "https://github.com/Elysia20220909/ElysiaAI",
					open_issues_count: 7,
					allow_auto_merge: true,
					permissions: { admin: true, push: true, pull: true },
				}),
				{ status: 200 },
			);

		const result = await fetchGitHubRepoSnapshot("Elysia20220909/ElysiaAI", {
			fetchImpl,
		});

		expect(result.ok).toBe(true);
		expect(result.repo?.defaultBranch).toBe("master");
		expect(buildGitHubRepoStatusText(result)).toContain("Permission: admin");
	});

	test("reports GitHub lookup failures", async () => {
		const fetchImpl = async () =>
			new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });

		const result = await fetchGitHubRepoSnapshot("Elysia20220909/ElysiaAI", {
			fetchImpl,
		});

		expect(result.ok).toBe(false);
		expect(buildGitHubRepoStatusText(result)).toContain("GITHUB_TOKEN");
	});
});
