import { describe, expect, test } from "bun:test";
import { buildDailyDeskBrief, normalizeVoiceReadMode } from "./daily-desk-brief";
import type { PrivacyEventRecord } from "./privacy-ledger";
import type { ProjectMemoryRecord, ProjectRecord } from "./project-memory";

const project: ProjectRecord = {
	id: "proj-1",
	ownerKey: "operator",
	name: "Daily Desk",
	slug: "daily-desk",
	status: "active",
	localScope: "workspace",
	memoryPolicyJson: "{}",
	createdAt: "2026-06-23T00:00:00.000Z",
	updatedAt: "2026-06-23T00:00:00.000Z",
};

function memory(partial: Partial<ProjectMemoryRecord>): ProjectMemoryRecord {
	return {
		id: partial.id || "pmry-1",
		projectId: "proj-1",
		ownerKey: "operator",
		content: "Keep voice summaries concise.",
		source: "manual",
		status: "active",
		gardenState: "sprout",
		strength: 0.6,
		confidence: 0.7,
		useCount: 0,
		pinned: false,
		metadataJson: "{}",
		sourceTraceJson: "{}",
		createdAt: "2026-06-23T00:00:00.000Z",
		updatedAt: "2026-06-23T00:00:00.000Z",
		...partial,
	};
}

function voiceEvent(metadataJson: string): PrivacyEventRecord {
	return {
		id: "pevt-1",
		ownerKey: "operator",
		projectId: "proj-1",
		scope: "voice",
		provider: "voicevox-local",
		direction: "local-service",
		purpose: "Local voice synthesis request",
		dataClass: "text-to-speech",
		approvalStatus: "not-required",
		localOnly: true,
		riskLevel: "low",
		metadataJson,
		createdAt: "2026-06-23T00:00:00.000Z",
	};
}

describe("daily desk brief", () => {
	test("normalizes voice read modes", () => {
		expect(normalizeVoiceReadMode("full")).toBe("full");
		expect(normalizeVoiceReadMode("silent")).toBe("silent-badge");
		expect(normalizeVoiceReadMode("unknown")).toBe("summary");
	});

	test("summarizes voice and emotion metadata", () => {
		const brief = buildDailyDeskBrief({
			project,
			memories: [
				memory({
					pinned: true,
					gardenState: "rooted",
					metadataJson: JSON.stringify({ emotion: "focused" }),
				}),
				memory({
					id: "pmry-2",
					gardenState: "withered",
					metadataJson: JSON.stringify({ emotion: "exhaustion" }),
				}),
			],
			voiceEvents: [voiceEvent(JSON.stringify({ emotion: "focused" }))],
			setup: { status: "ready", score: 100, summary: "Local cockpit is ready." },
			voice: {
				enabled: true,
				readMode: "summary",
				lastEmotion: "focused",
			},
		});

		expect(brief.emotion.dominant).toBe("focused");
		expect(brief.voice.readMode).toBe("summary");
		expect(brief.project.pinnedCount).toBe(1);
		expect(brief.nextActions[0]).toContain("枯れ葉");
	});
});
