import { Elysia, t } from "elysia";
import { config } from "../../../../src/config.ts";
import { authErrorResponse } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import { getWorkspaceRoot } from "../lib/mvp-local-ai";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";
import { recordPrivacyEvent } from "../lib/privacy-ledger";
import {
	buildVoiceTtsPayload,
	summarizeVoicePayload,
	VOICE_EMOTION_PRESETS,
} from "../lib/voice-emotion";

function requireVoiceSession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Voice session required");
	}
}

async function postVoicevoxTts(
	payload: ReturnType<typeof buildVoiceTtsPayload>,
) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 45000);
	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json; charset=utf-8",
		};
		if (config.fastApiApiKey) headers["X-API-Key"] = config.fastApiApiKey;

		const response = await fetch(
			`${config.fastApiBaseUrl.replace(/\/$/, "")}/tts`,
			{
				method: "POST",
				headers,
				body: JSON.stringify(payload),
				signal: controller.signal,
			},
		);
		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			return {
				ok: false,
				status: response.status,
				error: data.detail || data.error || "VOICEVOX synthesis failed",
			};
		}
		if (typeof data.audio !== "string" || !data.audio) {
			return {
				ok: false,
				status: 502,
				error: "VOICEVOX returned no audio",
			};
		}
		return { ok: true, status: response.status, audio: data.audio };
	} catch (error) {
		return {
			ok: false,
			status: 502,
			error:
				error instanceof Error
					? error.message
					: "VOICEVOX Engine communication error",
		};
	} finally {
		clearTimeout(timeout);
	}
}

export const voiceRoutes = new Elysia({ prefix: "/api/voice" })
	.get("/settings", ({ request }) => {
		const session = requireVoiceSession(request);
		if (session instanceof Response) return session;

		return {
			provider: "voicevox-local",
			localOnly: true,
			presets: VOICE_EMOTION_PRESETS,
			defaults: {
				speakerId: config.voicevoxSpeakerId,
				speedScale: config.voicevoxSpeed,
				pitchScale: config.voicevoxPitch,
				intonationScale: config.voicevoxIntonation,
				volumeScale: config.voicevoxVolume,
			},
		};
	})
	.post(
		"/tts",
		async ({ request, body }) => {
			const session = requireVoiceSession(request);
			if (session instanceof Response) return session;

			const payloadBody = body as {
				text?: string;
				emotion?: string;
				preset?: string;
				readMode?: string;
				projectId?: string;
				speakerId?: number;
				speaker_id?: number;
				speedScale?: number;
				pitchScale?: number;
				intonationScale?: number;
				volumeScale?: number;
			};
			try {
				const payload = buildVoiceTtsPayload(payloadBody, {
					speakerId: config.voicevoxSpeakerId,
				});
				await recordPrivacyEvent({
					root: getWorkspaceRoot(),
					ownerKey: session.username,
					projectId: payloadBody.projectId || undefined,
					scope: "voice",
					provider: "voicevox-local",
					direction: "local-service",
					purpose: "Local voice synthesis request",
					dataClass: "text-to-speech",
					payload: payload.text,
					localOnly: true,
					riskLevel: "low",
					approvalStatus: "not-required",
					metadata: {
						...summarizeVoicePayload(payload),
						readMode: payloadBody.readMode || "summary",
					},
				}).catch(() => undefined);

				const result = await postVoicevoxTts(payload);
				if (!result.ok) {
					return jsonError(result.status, result.error);
				}

				return {
					audio: result.audio,
					mimeType: "audio/wav",
					provider: "voicevox-local",
					localOnly: true,
					...summarizeVoicePayload(payload),
				};
			} catch (error) {
				return jsonError(
					400,
					error instanceof Error ? error.message : "Voice synthesis failed",
				);
			}
		},
		{
			body: t.Object({
				text: t.String({ minLength: 1, maxLength: 4000 }),
				emotion: t.Optional(t.String({ maxLength: 40 })),
				preset: t.Optional(t.String({ maxLength: 40 })),
				readMode: t.Optional(t.String({ maxLength: 40 })),
				projectId: t.Optional(t.String({ maxLength: 120 })),
				speakerId: t.Optional(t.Number()),
				speaker_id: t.Optional(t.Number()),
				speedScale: t.Optional(t.Number()),
				pitchScale: t.Optional(t.Number()),
				intonationScale: t.Optional(t.Number()),
				volumeScale: t.Optional(t.Number()),
			}),
		},
	);
