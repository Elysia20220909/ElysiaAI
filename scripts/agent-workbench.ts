import { spawn } from "node:child_process";
import {
	type AgentWorkbenchMode,
	buildAgentWorkbenchProfile,
	planAgentWorkbenchTask,
} from "../packages/server/src/lib/agent-workbench";

const command = Bun.argv[2] ?? "status";
const asJson = Bun.argv.includes("--json");
const launchTarget = readFlagValue("--target") || "codex";

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

function launchCandidates(target: string): string[] {
	if (target === "codex") {
		return [process.env.ELYSIA_CODEX_BIN || "", "codex"].filter(Boolean);
	}
	if (target === "antigravity") {
		return [
			process.env.ELYSIA_ANTIGRAVITY_BIN || "",
			"agy",
			"antigravity",
		].filter(Boolean);
	}
	return [];
}

function launchLocalTarget(target: string) {
	const candidates = launchCandidates(target);
	const executable = candidates
		.map((candidate) => Bun.which(candidate) || candidate)
		.find((candidate) =>
			Boolean(Bun.which(candidate) || candidate.includes(":")),
		);

	if (!executable) {
		console.error(
			`No executable found for ${target}. Set ELYSIA_CODEX_BIN or ELYSIA_ANTIGRAVITY_BIN if it is installed in a custom location.`,
		);
		process.exit(1);
	}

	const args = target === "antigravity" ? [process.cwd()] : [];
	const child = spawn(executable, args, {
		cwd: process.cwd(),
		detached: true,
		stdio: "ignore",
		windowsHide: false,
	});
	child.unref();
	return { executable, args };
}

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
} else if (command === "launch") {
	if (launchTarget !== "codex" && launchTarget !== "antigravity") {
		console.error("Launch target must be codex or antigravity");
		process.exit(1);
	}
	const launch = launchLocalTarget(launchTarget);
	console.log(`Launched ${launchTarget}: ${launch.executable}`);
	if (requestText.trim()) {
		const plan = planAgentWorkbenchTask({
			request: requestText,
			requestedBy: "local-cli",
			mode: readMode(),
		});
		console.log(`Suggested handoff: ${plan.primaryRuntime}`);
		for (const handoff of plan.handoffs.filter(
			(item) => item.target === launchTarget,
		)) {
			console.log(handoff.prompt);
		}
	}
} else {
	console.error(`Unknown agent workbench command: ${command}`);
	console.error(
		'Usage: bun run agents -- [status|plan|launch] [--json] [--target codex|antigravity] [--request "implement feature"] [--mode review_driven|balanced|codex_first|antigravity_first]',
	);
	process.exit(1);
}
