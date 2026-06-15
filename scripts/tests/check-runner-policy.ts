const trustedRunnerLabels = [
	"ice-linux-trusted",
	"ice-macos-trusted",
	"ice-windows-trusted",
	"ice-arm64-lab",
] as const;

export {};

type WorkflowCheck = {
	path: string;
	text: string;
};

function hasTopLevelEvent(text: string, eventName: string) {
	const pattern = new RegExp(`^\\s{0,2}${eventName}\\s*:`, "m");
	return pattern.test(text);
}

function hasSelfHostedRunner(text: string) {
	return /\bself-hosted\b/.test(text);
}

function hasTrustedRunnerLabel(text: string) {
	return trustedRunnerLabels.some((label) => text.includes(label));
}

function hasNonGithubTokenSecret(text: string) {
	const withoutGithubToken = text.replaceAll("secrets.GITHUB_TOKEN", "");
	return /\bsecrets\.[A-Za-z_][A-Za-z0-9_]*\b/.test(withoutGithubToken);
}

function runnerBlocks(text: string) {
	const lines = text.split(/\r?\n/);
	const blocks: string[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const match = line.match(/^(\s*)runs-on:\s*(.*)$/);

		if (!match) {
			continue;
		}

		const indent = match[1].length;
		const block = [match[2]];

		for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
			const nextLine = lines[nextIndex];

			if (nextLine.trim() === "") {
				block.push(nextLine);
				continue;
			}

			const nextIndent = nextLine.match(/^(\s*)/)?.[1].length ?? 0;
			if (nextIndent <= indent) {
				break;
			}

			block.push(nextLine);
		}

		blocks.push(block.join("\n"));
	}

	return blocks;
}

async function workflowFiles() {
	const proc = Bun.spawn(
		[
			"git",
			"ls-files",
			"--cached",
			"--others",
			"--exclude-standard",
			".github/workflows/*.yml",
			".github/workflows/*.yaml",
		],
		{
			stdout: "pipe",
			stderr: "inherit",
		},
	);

	const output = await new Response(proc.stdout).text();
	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		console.error("Runner policy guard could not list workflow files.");
		process.exit(exitCode);
	}

	return output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

async function loadWorkflow(path: string): Promise<WorkflowCheck> {
	return {
		path,
		text: await Bun.file(path).text(),
	};
}

function checkWorkflow(workflow: WorkflowCheck) {
	const failures: string[] = [];
	const hasPullRequest = hasTopLevelEvent(workflow.text, "pull_request");
	const hasPullRequestTarget = hasTopLevelEvent(
		workflow.text,
		"pull_request_target",
	);
	const hasSelfHosted = hasSelfHostedRunner(workflow.text);

	if (hasPullRequestTarget && hasSelfHosted) {
		failures.push("pull_request_target must not use self-hosted runners");
	}

	if (hasPullRequest && hasSelfHosted) {
		failures.push(
			"pull_request workflows must stay GitHub-hosted; split trusted self-hosted jobs into a separate workflow",
		);
	}

	if (hasPullRequest && hasNonGithubTokenSecret(workflow.text)) {
		failures.push(
			"pull_request workflows must not reference repository secrets other than secrets.GITHUB_TOKEN",
		);
	}

	if (hasSelfHosted && !hasTrustedRunnerLabel(workflow.text)) {
		failures.push(
			`self-hosted runners must include one ICE label: ${trustedRunnerLabels.join(", ")}`,
		);
	}

	for (const block of runnerBlocks(workflow.text)) {
		if (!hasSelfHostedRunner(block)) {
			continue;
		}

		if (!hasTrustedRunnerLabel(block)) {
			failures.push(
				`self-hosted runs-on block is missing an ICE label: ${block}`,
			);
		}
	}

	return failures;
}

const workflows = await Promise.all((await workflowFiles()).map(loadWorkflow));
const failures = workflows.flatMap((workflow) =>
	checkWorkflow(workflow).map((failure) => `${workflow.path}: ${failure}`),
);

if (failures.length > 0) {
	console.error("ICE runner policy guard failed.");
	for (const failure of failures) {
		console.error(`  - ${failure}`);
	}
	process.exit(1);
}

console.log(
	`ICE runner policy guard passed. Checked ${workflows.length} workflow files.`,
);
