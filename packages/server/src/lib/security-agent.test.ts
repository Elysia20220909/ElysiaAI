import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSecurityAgentReport } from "./security-agent";

const tempDirs: string[] = [];
const originalFetch = globalThis.fetch;
const githubEnvKeys = [
	"GITHUB_REPOSITORY",
	"GITHUB_REF_NAME",
	"GITHUB_HEAD_REF",
	"GITHUB_TOKEN",
	"GH_TOKEN",
] as const;
const originalGithubEnv = Object.fromEntries(
	githubEnvKeys.map((key) => [key, process.env[key]]),
);

async function makeWorkspace() {
	const root = await mkdtemp(join(tmpdir(), "elysia-security-agent-"));
	tempDirs.push(root);
	await mkdir(join(root, ".github", "workflows"), { recursive: true });
	await writeFile(
		join(root, ".github", "workflows", "ci.yml"),
		"steps:\n  - run: python -m ruff check python/fastapi_server.py kernel usr tests/test_kernel.py tests/python scripts/security/audit_dependencies.py scripts/tests/check-encoding.py\n",
		"utf8",
	);
	await writeFile(join(root, ".github", "PULL_REQUEST_TEMPLATE.md"), "# PR\n");
	await writeFile(join(root, ".gitleaks.toml"), "title = 'test'\n");
	await writeFile(
		join(root, "package.json"),
		JSON.stringify({
			scripts: { "security:audit": "bun scripts/run-python.ts audit.py" },
			dependencies: { elysia: "latest" },
		}),
	);
	await writeFile(join(root, "requirements.txt"), "ruff\npytest\n");
	return root;
}

describe("Security Agent report", () => {
	beforeEach(() => {
		for (const key of githubEnvKeys) delete process.env[key];
	});

	afterEach(async () => {
		globalThis.fetch = originalFetch;
		for (const key of githubEnvKeys) {
			const value = originalGithubEnv[key];
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
		await Promise.all(
			tempDirs
				.splice(0)
				.map((dir) => rm(dir, { recursive: true, force: true })),
		);
	});

	test("returns clean MVP security gates when policy files are present", async () => {
		const root = await makeWorkspace();
		const report = await buildSecurityAgentReport(root);

		expect(report.summary.secrets.severity).toBe("ok");
		expect(report.summary["github-actions"].severity).toBe("ok");
		expect(report.summary["dependency-audit"].severity).toBe("ok");
	});

	test("detects and masks high-risk secret patterns", async () => {
		const root = await makeWorkspace();
		const fakeWebhook = [
			"https://discord.com/api",
			"webhooks",
			"123456789012345678",
			"abcdefghijklmnopqrstuvwxyz",
		].join("/");
		await writeFile(
			join(root, "README.md"),
			`webhook=${fakeWebhook}\n`,
			"utf8",
		);

		const report = await buildSecurityAgentReport(root);
		const secretFinding = report.findings.find(
			(finding) =>
				finding.area === "secrets" && finding.severity === "critical",
		);

		expect(report.status).toBe("critical");
		expect(secretFinding?.title).toContain("Discord webhook");
		expect(secretFinding?.snippet).toContain("[masked]");
		expect(secretFinding?.snippet).not.toContain("abcdefghijklmnopqrstuvwxyz");
	});

	test("summarizes recent GitHub Actions run history", async () => {
		const root = await makeWorkspace();
		await mkdir(join(root, ".git"), { recursive: true });
		await writeFile(
			join(root, ".git", "config"),
			'[remote "origin"]\n\turl = https://github.com/Elysia20220909/ElysiaAI.git\n',
			"utf8",
		);
		await writeFile(join(root, ".git", "HEAD"), "ref: refs/heads/master\n");
		globalThis.fetch = (async () =>
			new Response(
				JSON.stringify({
					workflow_runs: [
						{
							name: "CI",
							display_title: "MVP release hygiene",
							status: "completed",
							conclusion: "failure",
							head_branch: "master",
							event: "push",
							created_at: "2026-06-14T00:00:00Z",
							updated_at: "2026-06-14T00:05:00Z",
							html_url:
								"https://github.com/Elysia20220909/ElysiaAI/actions/runs/1",
						},
					],
				}),
				{ status: 200 },
			)) as unknown as typeof fetch;

		const report = await buildSecurityAgentReport(root);
		const finding = report.findings.find((item) =>
			item.title.startsWith("Latest GitHub Actions run:"),
		);

		expect(report.actions?.repository).toBe("Elysia20220909/ElysiaAI");
		expect(report.actions?.runs[0]?.workflowName).toBe("CI");
		expect(finding?.severity).toBe("critical");
		expect(finding?.detail).toContain("failure");
	});
});
