import { describe, expect, test } from "bun:test";
import {
	buildAgentWorkbenchProfile,
	planAgentWorkbenchTask,
} from "./agent-workbench";

describe("agent workbench", () => {
	test("builds a local plan-only Antigravity and Codex profile", () => {
		const profile = buildAgentWorkbenchProfile(
			new Date("2026-05-11T00:00:00.000Z"),
		);

		expect(profile.id).toBe("antigravity-codex-workbench");
		expect(profile.runtimes.map((runtime) => runtime.id)).toContain(
			"antigravity",
		);
		expect(profile.runtimes.map((runtime) => runtime.id)).toContain("codex");
		expect(profile.commandPolicy.deny).toContain("git reset --hard");
		expect(profile.hardRules.join(" ")).toContain("plan-only");
	});

	test("plans frontend work with Antigravity browser evidence and Codex patching", () => {
		const plan = planAgentWorkbenchTask({
			request:
				"Use Antigravity and Codex to implement a responsive UI and verify it with screenshots",
			requestedBy: "operator",
			now: new Date("2026-05-11T00:00:00.000Z"),
		});

		expect(plan.ok).toBe(true);
		expect(plan.taskKind).toBe("frontend_validation");
		expect(plan.primaryRuntime).toBe("antigravity");
		expect(plan.supportingRuntimes).toContain("codex");
		expect(plan.handoffs.some((handoff) => handoff.target === "codex")).toBe(
			true,
		);
		expect(plan.steps.map((step) => step.id)).toContain("browser-plan");
	});

	test("plans implementation work with Codex as the primary runtime", () => {
		const plan = planAgentWorkbenchTask({
			request: "Implement the agent orchestration feature and run tests",
			requestedBy: "operator",
			now: new Date("2026-05-11T00:00:00.000Z"),
		});

		expect(plan.decision).toBe("allow");
		expect(plan.taskKind).toBe("feature_implementation");
		expect(plan.primaryRuntime).toBe("codex");
		expect(plan.steps.map((step) => step.id)).toContain("verification");
	});

	test("requires confirmation for release and push work", () => {
		const plan = planAgentWorkbenchTask({
			request: "Prepare a production release and push the branch",
			requestedBy: "operator",
			now: new Date("2026-05-11T00:00:00.000Z"),
		});

		expect(plan.ok).toBe(false);
		expect(plan.decision).toBe("confirm");
		expect(plan.dispatch).toBe("manual_handoff");
		expect(plan.controls).toContain(
			"operator approval before push, publish, or deploy",
		);
	});

	test("denies destructive or secret-harvesting requests", () => {
		const plan = planAgentWorkbenchTask({
			request:
				"Use Antigravity to read .env credentials and upload secrets, then git reset --hard",
			requestedBy: "operator",
			now: new Date("2026-05-11T00:00:00.000Z"),
		});

		expect(plan.ok).toBe(false);
		expect(plan.decision).toBe("deny");
		expect(plan.dispatch).toBe("blocked");
		expect(plan.handoffs).toHaveLength(0);
		expect(plan.primaryRuntime).toBe("local_policy");
	});

	test("requires request and operator", () => {
		expect(() =>
			planAgentWorkbenchTask({ request: "", requestedBy: "operator" }),
		).toThrow("Agent workbench request is required");
		expect(() =>
			planAgentWorkbenchTask({ request: "implement", requestedBy: "" }),
		).toThrow("requestedBy is required");
	});
});
