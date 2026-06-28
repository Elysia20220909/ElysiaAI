import type { PrivacyEventRecord } from "./privacy-ledger";
import { listPrivacyEvents } from "./privacy-ledger";
import type { ProjectMemoryRecord, ProjectRecord } from "./project-memory";
import {
	ensureDefaultProject,
	listProjectMemories,
	listProjects,
} from "./project-memory";
import { collectSetupWizardReadiness } from "./setup-wizard";

export type VoiceReadMode = "full" | "summary" | "silent-badge";

export type DailyDeskBrief = {
	generatedAt: string;
	title: string;
	summary: string;
	project: {
		id: string;
		name: string;
		memoryCount: number;
		pinnedCount: number;
		garden: Record<string, number>;
	};
	setup: {
		status: string;
		score: number;
		summary: string;
	};
	emotion: {
		current: string;
		dominant: string;
		counts: Record<string, number>;
		sourceCount: number;
		summary: string;
	};
	voice: {
		enabled: boolean;
		readMode: VoiceReadMode;
		recentRequests: number;
		summary: string;
	};
	notes: string[];
	nextActions: string[];
};

type BuildDailyDeskBriefInput = {
	now?: string;
	project: ProjectRecord;
	memories: ProjectMemoryRecord[];
	voiceEvents: PrivacyEventRecord[];
	setup: {
		status: string;
		score: number;
		summary: string;
	};
	voice?: {
		enabled?: boolean;
		readMode?: string;
		lastEmotion?: string;
	};
};

const KNOWN_EMOTIONS = new Set([
	"neutral",
	"joy",
	"affection",
	"exhaustion",
	"loneliness",
	"focused",
]);

export function normalizeVoiceReadMode(value: unknown): VoiceReadMode {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (normalized === "full" || normalized === "summary") return normalized;
	if (normalized === "silent" || normalized === "silent-badge") {
		return "silent-badge";
	}
	return "summary";
}

function normalizeEmotion(value: unknown) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	return KNOWN_EMOTIONS.has(normalized) ? normalized : "neutral";
}

function parseJsonObject(value: string | undefined) {
	if (!value) return {};
	try {
		const parsed = JSON.parse(value);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function increment(counts: Record<string, number>, emotion: string) {
	counts[emotion] = (counts[emotion] || 0) + 1;
}

function dominantEmotion(counts: Record<string, number>, fallback: string) {
	return (
		Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] ||
		fallback
	);
}

function gardenCounts(memories: ProjectMemoryRecord[]) {
	return memories.reduce<Record<string, number>>((counts, memory) => {
		counts[memory.gardenState] = (counts[memory.gardenState] || 0) + 1;
		return counts;
	}, {});
}

function emotionSummary(emotion: string, sourceCount: number) {
	if (sourceCount === 0) {
		return "感情メタデータはまだ静かです。次の会話や記憶から少しずつ育ちます。";
	}
	if (emotion === "focused")
		return "集中の気配が強めです。短く、実装に寄せた返答が合います。";
	if (emotion === "exhaustion")
		return "疲れの気配があります。声は少し遅く、返答は要点中心が合います。";
	if (emotion === "joy")
		return "明るい反応が増えています。達成感を崩さず、次の一手へ橋をかけます。";
	if (emotion === "affection")
		return "寄り添いの文脈が濃い日です。柔らかい声色が自然です。";
	if (emotion === "loneliness")
		return "静かな余白が目立ちます。急がず、短い確認を重ねる設計が合います。";
	return "平常運転です。声は控えめに、必要な時だけ前へ出ます。";
}

function voiceSummary({
	enabled,
	readMode,
	recentRequests,
}: {
	enabled: boolean;
	readMode: VoiceReadMode;
	recentRequests: number;
}) {
	if (!enabled) return "音声はOFFです。感情表示だけが静かに残ります。";
	if (readMode === "silent-badge") {
		return "Silent Badgeです。読み上げず、感情の灯りだけを表示します。";
	}
	if (readMode === "full") {
		return `Full読み上げです。直近の音声リクエストは${recentRequests}件です。`;
	}
	return `Summary読み上げです。直近の音声リクエストは${recentRequests}件です。`;
}

export function buildDailyDeskBrief({
	now = new Date().toISOString(),
	project,
	memories,
	voiceEvents,
	setup,
	voice = {},
}: BuildDailyDeskBriefInput): DailyDeskBrief {
	const readMode = normalizeVoiceReadMode(voice.readMode);
	const current = normalizeEmotion(voice.lastEmotion);
	const counts: Record<string, number> = {};
	if (voice.lastEmotion) increment(counts, current);

	for (const memory of memories) {
		const metadata = parseJsonObject(memory.metadataJson);
		if (metadata.emotion) increment(counts, normalizeEmotion(metadata.emotion));
	}
	for (const event of voiceEvents) {
		const metadata = parseJsonObject(event.metadataJson);
		if (metadata.emotion) increment(counts, normalizeEmotion(metadata.emotion));
	}

	const dominant = dominantEmotion(counts, current);
	const activeMemories = memories.filter(
		(memory) => memory.status === "active",
	);
	const pinnedCount = memories.filter((memory) => memory.pinned).length;
	const withered = memories.filter(
		(memory) => memory.gardenState === "withered",
	);
	const recentKnowledge = memories.filter(
		(memory) => memory.source === "knowledge",
	).length;
	const voiceEnabled = Boolean(voice.enabled);
	const briefVoiceSummary = voiceSummary({
		enabled: voiceEnabled,
		readMode,
		recentRequests: voiceEvents.length,
	});
	const briefEmotionSummary = emotionSummary(
		dominant,
		Object.values(counts).reduce((sum, count) => sum + count, 0),
	);

	const notes = [
		`${project.name}には${activeMemories.length}件の有効な記憶があります。`,
		briefEmotionSummary,
		briefVoiceSummary,
		setup.summary,
	];
	if (recentKnowledge > 0) {
		notes.push(`Knowledge由来の記憶が${recentKnowledge}件あります。`);
	}

	const nextActions = [
		withered.length > 0
			? `${withered.length}件の枯れ葉記憶を見直す`
			: "今日使うProject Memoryを1件だけ根づかせる",
		readMode === "silent-badge"
			? "必要ならSummary読み上げへ戻す"
			: "長文回答はSummary読み上げで作業の邪魔を減らす",
		setup.status === "ready"
			? "準備は整っています。最初の作業を短く投げる"
			: "Setup Wizardのattention項目を1つだけ片づける",
	];

	return {
		generatedAt: now,
		title: "Daily Desk Brief",
		summary: `${project.name}: ${setup.status} / ${dominant} / voice ${voiceEnabled ? readMode : "off"}`,
		project: {
			id: project.id,
			name: project.name,
			memoryCount: memories.length,
			pinnedCount,
			garden: gardenCounts(memories),
		},
		setup: {
			status: setup.status,
			score: setup.score,
			summary: setup.summary,
		},
		emotion: {
			current,
			dominant,
			counts,
			sourceCount: Object.values(counts).reduce((sum, count) => sum + count, 0),
			summary: briefEmotionSummary,
		},
		voice: {
			enabled: voiceEnabled,
			readMode,
			recentRequests: voiceEvents.length,
			summary: briefVoiceSummary,
		},
		notes,
		nextActions,
	};
}

export async function collectDailyDeskBrief({
	root,
	ownerKey,
	projectId,
	voice,
}: {
	root: string;
	ownerKey: string;
	projectId?: string;
	voice?: BuildDailyDeskBriefInput["voice"];
}) {
	const projects = await listProjects({ root, ownerKey });
	const project =
		(projectId && projects.find((candidate) => candidate.id === projectId)) ||
		(await ensureDefaultProject(root, ownerKey));
	const [memories, voiceEvents, setup] = await Promise.all([
		listProjectMemories({
			root,
			ownerKey,
			projectId: project.id,
			includeInactive: true,
			limit: 40,
		}),
		listPrivacyEvents({
			root,
			ownerKey,
			projectId: project.id,
			provider: "voicevox-local",
			limit: 12,
		}),
		collectSetupWizardReadiness({ root }),
	]);

	return buildDailyDeskBrief({
		project,
		memories,
		voiceEvents,
		setup,
		voice,
	});
}
