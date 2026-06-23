import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	buildPrivacyLedgerReport,
	buildPrivacyPosture,
	closePrivacyLedgerDatabases,
	listPrivacyEvents,
	recordPrivacyEvent,
} from "./privacy-ledger";

const tempDirs: string[] = [];

async function makeRoot() {
	const root = await mkdtemp(join(tmpdir(), "elysia-privacy-ledger-"));
	tempDirs.push(root);
	return root;
}

afterEach(async () => {
	closePrivacyLedgerDatabases();
	(Bun as any).gc?.(true);
	await new Promise((resolve) => setTimeout(resolve, 20));
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("privacy ledger store", () => {
	test("records local-only privacy events without storing payloads", async () => {
		const root = await makeRoot();
		const event = await recordPrivacyEvent({
			root,
			ownerKey: "operator",
			scope: "knowledge",
			provider: "sqlite-fts-local",
			purpose: "Knowledge import",
			dataClass: "documents",
			payload: "sensitive document body",
			metadata: { name: "private.pdf" },
		});
		const events = await listPrivacyEvents({ root, ownerKey: "operator" });

		expect(event.localOnly).toBe(true);
		expect(event.payloadHash).toHaveLength(64);
		expect(event.metadataJson).toContain("private.pdf");
		expect(events).toHaveLength(1);
		expect(JSON.stringify(events)).not.toContain("sensitive document body");
	});

	test("keeps privacy events isolated by owner", async () => {
		const root = await makeRoot();
		await recordPrivacyEvent({
			root,
			ownerKey: "operator",
			scope: "artifact",
			provider: "sqlite-local",
			purpose: "Artifact saved",
			dataClass: "artifacts",
		});

		const operatorEvents = await listPrivacyEvents({
			root,
			ownerKey: "operator",
		});
		const otherEvents = await listPrivacyEvents({ root, ownerKey: "other" });

		expect(operatorEvents).toHaveLength(1);
		expect(otherEvents).toHaveLength(0);
	});

	test("summarizes external and approval-required events", async () => {
		const root = await makeRoot();
		await recordPrivacyEvent({
			root,
			ownerKey: "operator",
			scope: "external-connector",
			provider: "slack",
			direction: "external",
			purpose: "Slack notification candidate",
			dataClass: "operator messages",
			localOnly: false,
			riskLevel: "high",
			approvalStatus: "pending",
		});
		const report = await buildPrivacyLedgerReport({
			root,
			ownerKey: "operator",
		});

		expect(report.summary.total).toBe(1);
		expect(report.summary.external).toBe(1);
		expect(report.summary.requiresApproval).toBe(1);
		expect(report.summary.highRisk).toBe(1);
	});

	test("builds posture with local and external service classes", async () => {
		const root = await makeRoot();
		const posture = await buildPrivacyPosture({
			root,
			ownerKey: "operator",
		});
		const knowledge = posture.find((item) => item.id === "knowledge-rag");
		const slack = posture.find((item) => item.id === "slack");

		expect(knowledge?.localOnly).toBe(true);
		expect(knowledge?.approvalStatus).toBe("not-required");
		expect(slack?.localOnly).toBe(false);
		expect(["required", "not-configured"]).toContain(slack?.approvalStatus);
	});
});
