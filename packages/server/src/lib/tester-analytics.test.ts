import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	buildTesterAnalyticsReport,
	closeTesterAnalyticsDatabases,
	listTesterEvents,
	recordTesterEvent,
} from "./tester-analytics";

const tempDirs: string[] = [];

async function makeRoot() {
	const root = await mkdtemp(join(tmpdir(), "elysia-tester-analytics-"));
	tempDirs.push(root);
	return root;
}

afterEach(async () => {
	closeTesterAnalyticsDatabases();
	(Bun as any).gc?.(true);
	await new Promise((resolve) => setTimeout(resolve, 20));
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("tester analytics", () => {
	test("records tester events without storing payload text", async () => {
		const root = await makeRoot();
		const event = await recordTesterEvent({
			root,
			ownerKey: "operator",
			projectId: "proj-1",
			testerId: "tester@example.com",
			sessionId: "session-1",
			eventType: "feedback",
			area: "setup",
			action: "first-run",
			outcome: "blocked",
			severity: "high",
			durationMs: 120000,
			metadata: { tag: "ollama" },
			payload: "secret error log body",
		});
		const events = await listTesterEvents({ root, ownerKey: "operator" });

		expect(event.payloadHash).toHaveLength(64);
		expect(event.testerHash).toHaveLength(64);
		expect(JSON.stringify(events)).not.toContain("secret error log body");
		expect(events[0]?.area).toBe("setup");
	});

	test("keeps tester events isolated by owner and summarizes friction", async () => {
		const root = await makeRoot();
		await recordTesterEvent({
			root,
			ownerKey: "operator",
			sessionId: "session-1",
			eventType: "session",
			area: "setup",
			action: "boot",
			outcome: "started",
		});
		await recordTesterEvent({
			root,
			ownerKey: "operator",
			sessionId: "session-1",
			eventType: "feature",
			area: "chat",
			action: "send-message",
			outcome: "success",
		});
		await recordTesterEvent({
			root,
			ownerKey: "operator",
			sessionId: "session-1",
			eventType: "friction",
			area: "knowledge",
			action: "import-pdf",
			outcome: "error",
			severity: "medium",
		});
		await recordTesterEvent({
			root,
			ownerKey: "other",
			eventType: "feature",
			area: "voice",
			action: "test",
		});

		const report = await buildTesterAnalyticsReport({
			root,
			ownerKey: "operator",
		});
		const other = await listTesterEvents({ root, ownerKey: "other" });

		expect(report.summary.totalEvents).toBe(3);
		expect(report.summary.sessions).toBe(1);
		expect(report.summary.frictions).toBe(1);
		expect(
			report.featureUsage.find((item) => item.area === "chat")?.successes,
		).toBe(1);
		expect(report.frictionAreas[0]?.area).toBe("knowledge");
		expect(other).toHaveLength(1);
	});
});
