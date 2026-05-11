import {
	type AgentWorkbenchMode,
	buildAgentWorkbenchProfile,
	planAgentWorkbenchTask,
} from "../packages/server/src/lib/agent-workbench";

const command = Bun.argv[2] ?? "status";
const asJson = Bun.argv.includes("--json");

function readFlagValue(flag: string): string {
	const index = Bun.argv.indexOf(flag);
	if (index < 0) return "";
	const values: string[] = [];
	for (const arg of Bun.argv.slice(index + 1)) {
		if (arg.startsWith("--")) break;
		values.push(arg);
	}
	return values.join(" ");
}

function readMode(): AgentWorkbenchMode | undefined {
	const mode = readFlagValue("--mode");
	if (
		mode === "review_driven" ||
		mode === "balanced" ||
		mode === "codex_first" ||
		mode === "antigravity_first"
	) {
		return mode;
	}
	return undefined;
}

const requestText = readFlagValue("--request");

if (command === "status") {
	const profile = buildAgentWorkbenchProfile();
	if (asJson) {
		console.log(JSON.stringify(profile, null, 2));
	} else {
		console.log(`${profile.id} / ${profile.version}`);
		console.log(`Mode: ${profile.defaultMode}`);
		console.log(profile.summary);
		for (const runtime of profile.runtimes) {
			console.log(
				`- ${runtime.id}: ${runtime.role}, ${runtime.authority}, ${runtime.status}`,
			);
		}
	}
} else if (command === "plan") {
	if (!requestText.trim()) {
		console.error(
			'Usage: bun run agents -- plan --request "implement feature"',
		);
		process.exit(1);
	}

	const plan = planAgentWorkbenchTask({
		request: requestText,
		requestedBy: "local-cli",
		mode: readMode(),
	});

	if (asJson) {
		console.log(JSON.stringify(plan, null, 2));
	} else {
		console.log(`Agent workbench plan: ${plan.taskKind}`);
		console.log(`Decision: ${plan.decision}`);
		console.log(`Primary: ${plan.primaryRuntime}`);
		console.log(`Dispatch: ${plan.dispatch}`);
		console.log(plan.summary);
		console.log("Steps:");
		for (const step of plan.steps) {
			console.log(`- ${step.owner}: ${step.title}`);
		}
		if (plan.handoffs.length > 0) {
			console.log("Handoffs:");
			for (const handoff of plan.handoffs) {
				console.log(`- ${handoff.target}: ${handoff.title}`);
			}
		}
	}
} else {
	console.error(`Unknown agent workbench command: ${command}`);
	console.error(
		'Usage: bun run agents -- [status|plan] [--json] [--request "implement feature"] [--mode review_driven|balanced|codex_first|antigravity_first]',
	);
	process.exit(1);
}
