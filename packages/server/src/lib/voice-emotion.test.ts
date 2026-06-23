import { describe, expect, test } from "bun:test";
import {
	buildVoiceTtsPayload,
	normalizeVoiceEmotion,
	resolveVoicePresetEmotion,
	VOICE_EMOTION_PRESETS,
} from "./voice-emotion";

describe("voice emotion presets", () => {
	test("normalizes supported emotions and aliases", () => {
		expect(normalizeVoiceEmotion("joy")).toBe("joy");
		expect(normalizeVoiceEmotion("bright")).toBe("joy");
		expect(normalizeVoiceEmotion("unknown")).toBe("neutral");
	});

	test("auto preset follows the detected emotion", () => {
		expect(resolveVoicePresetEmotion("focused", "auto")).toBe("focused");
		expect(resolveVoicePresetEmotion("joy", "soft")).toBe("affection");
	});

	test("builds a VOICEVOX payload with emotion tuning", () => {
		const payload = buildVoiceTtsPayload({
			text: "今日の作業を読み上げます。",
			emotion: "joy",
			preset: "auto",
			speakerId: 3,
		});

		expect(payload.emotion).toBe("joy");
		expect(payload.speaker_id).toBe(3);
		expect(payload.speedScale).toBe(VOICE_EMOTION_PRESETS.joy.speedScale);
		expect(payload.intonationScale).toBe(
			VOICE_EMOTION_PRESETS.joy.intonationScale,
		);
	});

	test("manual controls override safely and clamp to supported ranges", () => {
		const payload = buildVoiceTtsPayload({
			text: "slow",
			speedScale: 9,
			pitchScale: -9,
			intonationScale: 9,
			volumeScale: -2,
			speakerId: 2000,
		});

		expect(payload.speedScale).toBe(1.4);
		expect(payload.pitchScale).toBe(-0.15);
		expect(payload.intonationScale).toBe(1.5);
		expect(payload.volumeScale).toBe(0);
		expect(payload.speaker_id).toBe(999);
	});

	test("rejects empty text", () => {
		expect(() => buildVoiceTtsPayload({ text: "   " })).toThrow(
			"Voice text is required",
		);
	});
});
