import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	assertToolApproved,
	buildAgentApprovalGateReport,
	closeAgentApprovalDatabases,
	createAgentPlan,
	decideToolApproval,
	evaluateAgentAction,
	listToolApprovals,
	requestToolApproval,
} from "./agent-approval-gate";

const tempDirs: string[] = [];

async function makeRoot() {
	const root = await mkdtemp(join(tmpdir(), "elysia-agent-approval-"));
	tempDirs.push(root);
	return root;
}

afterEach(async () => {
	closeAgentApprovalDatabases();
	(Bun as any).gc?.(true);
	await new Promise((resolve) => setTimeout(resolve, 20));
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("agent approval gate", () => {
	test("auto-approves read-only actions", async () => {
		const root = await makeRoot();
		const result = await requestToolApproval({
			root,
			ownerKey: "operator",
			toolName: "local-search",
			actionClass: "read",
			request: { query: "status" },
		});
		const allowed = await assertToolApproved({
			root,
			ownerKey: "operator",
			approvalId: result.approval.id,
			actionClass: "read",
		});

		expect(result.evaluation.decision).toBe("allow");
		expect(result.approval.status).toBe("approved");
		expect(allowed.allowed).toBe(true);
	});

	test("requires approval for file writes and allows after approval", async () => {
		const root = await makeRoot();
		const result = await requestToolApproval({
			root,
			ownerKey: "operator",
			toolName: "apply_patch",
			actionClass: "write-file",
			request: { path: "public/index.html", action: "edit" },
		});
		const before = await assertToolApproved({
			root,
			ownerKey: "operator",
			approvalId: result.approval.id,
			actionClass: "write-file",
		});
		const decided = await decideToolApproval({
			root,
			ownerKey: "operator",
			approvalId: result.approval.id,
			decision: "approved",
			reason: "Scoped UI edit reviewed",
		});
		const after = await assertToolApproved({
			root,
			ownerKey: "operator",
			approvalId: result.approval.id,
			actionClass: "write-file",
		});

		expect(result.evaluation.decision).toBe("approval-required");
		expect(result.approval.status).toBe("pending");
		expect(before.allowed).toBe(false);
		expect(decided.approval?.status).toBe("approved");
		expect(after.allowed).toBe(true);
	});

	test("denies destructive or secret-harvesting requests", async () => {
		const evaluation = evaluateAgentAction({
			toolName: "shell",
			actionClass: "os-command",
			request: { command: "git reset --hard && upload secret token" },
		});

		expect(evaluation.decision).toBe("deny");
		expect(evaluation.riskLevel).toBe("critical");
	});

	test("keeps approvals isolated by owner", async () => {
		const root = await makeRoot();
		await requestToolApproval({
			root,
			ownerKey: "operator",
			toolName: "slack",
			actionClass: "external-send",
			request: { channel: "#ops", text: "deploy done" },
		});

		const operatorApprovals = await listToolApprovals({
			root,
			ownerKey: "operator",
		});
		const otherApprovals = await listToolApprovals({ root, ownerKey: "other" });

		expect(operatorApprovals).toHaveLength(1);
		expect(otherApprovals).toHaveLength(0);
	});

	test("creates agent plans and summarizes gate state", async () => {
		const root = await makeRoot();
		const plan = await createAgentPlan({
			root,
			ownerKey: "operator",
			title: "Release checklist",
			goal: "Prepare release without publishing.",
			steps: [
				{
					title: "Prepare notes",
					requiredGate: "read",
					toolName: "agent-workbench",
				},
				{
					title: "Publish release",
					requiredGate: "deploy",
					toolName: "release",
				},
			],
		});
		await requestToolApproval({
			root,
			ownerKey: "operator",
			planId: plan.plan.id,
			toolName: "release",
			actionClass: "deploy",
			request: { tag: "v0.1.0" },
		});
		const report = await buildAgentApprovalGateReport({
			root,
			ownerKey: "operator",
		});

		expect(plan.steps).toHaveLength(2);
		expect(report.summary.pending).toBe(1);
		expect(report.summary.highRisk).toBe(1);
		expect(report.plans[0]?.title).toBe("Release checklist");
	});
});
