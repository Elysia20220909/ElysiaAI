import type { CoreEmotion } from "./elysia-core";

export type VoicePreset =
	| "auto"
	| CoreEmotion
	| "calm"
	| "bright"
	| "soft";

export type VoiceTuning = {
	speedScale: number;
	pitchScale: number;
	intonationScale: number;
	volumeScale: number;
};

export type VoiceTtsInput = Partial<VoiceTuning> & {
	text?: string;
	emotion?: string;
	preset?: string;
	speakerId?: number;
	speaker_id?: number;
};

export type VoiceDefaults = Partial<VoiceTuning> & {
	speakerId?: number;
};

export type VoiceTtsPayload = VoiceTuning & {
	text: string;
	emotion: CoreEmotion;
	speaker_id: number;
};

const CORE_EMOTIONS = new Set<CoreEmotion>([
	"neutral",
	"joy",
	"affection",
	"exhaustion",
	"loneliness",
	"focused",
]);

const PRESET_ALIAS: Record<string, CoreEmotion> = {
	auto: "neutral",
	calm: "neutral",
	bright: "joy",
	soft: "affection",
};

export const VOICE_EMOTION_PRESETS: Record<CoreEmotion, VoiceTuning> = {
	neutral: {
		speedScale: 1.04,
		pitchScale: 0,
		intonationScale: 1.08,
		volumeScale: 1,
	},
	joy: {
		speedScale: 1.12,
		pitchScale: 0.03,
		intonationScale: 1.24,
		volumeScale: 1,
	},
	affection: {
		speedScale: 1,
		pitchScale: 0.01,
		intonationScale: 1.14,
		volumeScale: 0.98,
	},
	exhaustion: {
		speedScale: 0.92,
		pitchScale: -0.03,
		intonationScale: 0.94,
		volumeScale: 0.96,
	},
	loneliness: {
		speedScale: 0.96,
		pitchScale: -0.02,
		intonationScale: 0.98,
		volumeScale: 0.97,
	},
	focused: {
		speedScale: 1.06,
		pitchScale: 0,
		intonationScale: 1.02,
		volumeScale: 1,
	},
};

function clamp(value: unknown, fallback: number, min: number, max: number) {
	const numberValue = Number(value);
	if (!Number.isFinite(numberValue)) return fallback;
	return Math.min(max, Math.max(min, numberValue));
}

function clampSpeaker(value: unknown, fallback: number) {
	return Math.round(clamp(value, fallback, 0, 999));
}

export function normalizeVoiceEmotion(value: unknown): CoreEmotion {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (CORE_EMOTIONS.has(normalized as CoreEmotion)) {
		return normalized as CoreEmotion;
	}
	return PRESET_ALIAS[normalized] || "neutral";
}

export function resolveVoicePresetEmotion(
	emotion: unknown,
	preset: unknown,
): CoreEmotion {
	const normalizedPreset = String(preset || "auto")
		.trim()
		.toLowerCase();
	if (!normalizedPreset || normalizedPreset === "auto") {
		return normalizeVoiceEmotion(emotion);
	}
	return normalizeVoiceEmotion(normalizedPreset);
}

export function buildVoiceTtsPayload(
	input: VoiceTtsInput,
	defaults: VoiceDefaults = {},
): VoiceTtsPayload {
	const text = String(input.text || "")
		.trim()
		.slice(0, 4000);
	if (!text) throw new Error("Voice text is required");

	const emotion = normalizeVoiceEmotion(input.emotion);
	const presetEmotion = resolveVoicePresetEmotion(emotion, input.preset);
	const preset = VOICE_EMOTION_PRESETS[presetEmotion];

	const speakerFallback = clampSpeaker(defaults.speakerId, 2);
	return {
		text,
		emotion,
		speaker_id: clampSpeaker(input.speaker_id ?? input.speakerId, speakerFallback),
		speedScale: clamp(
			input.speedScale ?? defaults.speedScale,
			preset.speedScale,
			0.75,
			1.4,
		),
		pitchScale: clamp(
			input.pitchScale ?? defaults.pitchScale,
			preset.pitchScale,
			-0.15,
			0.15,
		),
		intonationScale: clamp(
			input.intonationScale ?? defaults.intonationScale,
			preset.intonationScale,
			0.7,
			1.5,
		),
		volumeScale: clamp(
			input.volumeScale ?? defaults.volumeScale,
			preset.volumeScale,
			0,
			2,
		),
	};
}

export function summarizeVoicePayload(payload: VoiceTtsPayload) {
	return {
		emotion: payload.emotion,
		speakerId: payload.speaker_id,
		speedScale: payload.speedScale,
		pitchScale: payload.pitchScale,
		intonationScale: payload.intonationScale,
		volumeScale: payload.volumeScale,
		characters: payload.text.length,
	};
}
