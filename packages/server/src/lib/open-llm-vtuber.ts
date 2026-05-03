import { CONFIG } from "./constants";

export type OpenLlmVtuberManifest = {
	enabled: boolean;
	baseUrl: string;
	urls: {
		frontend: string;
		webTool: string;
		clientWebSocket: string;
		ttsWebSocket: string;
		asr: string;
		live2dModels: string;
	};
	capabilities: string[];
	upstream: {
		repository: string;
		defaultPort: number;
		licenseNote: string;
	};
};

function trimTrailingSlash(value: string) {
	return value.replace(/\/+$/, "");
}

export function normalizeOpenLlmVtuberBaseUrl(
	value = CONFIG.OPEN_LLM_VTUBER_BASE_URL,
) {
	const fallback = "http://127.0.0.1:12393";
	try {
		return trimTrailingSlash(new URL(value || fallback).toString());
	} catch {
		return fallback;
	}
}

export function websocketUrl(baseUrl: string, path: string) {
	const url = new URL(path, `${normalizeOpenLlmVtuberBaseUrl(baseUrl)}/`);
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	return url.toString();
}

export function buildOpenLlmVtuberManifest(): OpenLlmVtuberManifest {
	const baseUrl = normalizeOpenLlmVtuberBaseUrl();
	const httpUrl = (path: string) => new URL(path, `${baseUrl}/`).toString();

	return {
		enabled: CONFIG.OPEN_LLM_VTUBER_ENABLED,
		baseUrl,
		urls: {
			frontend: httpUrl("/"),
			webTool: httpUrl("/web-tool"),
			clientWebSocket: websocketUrl(baseUrl, "/client-ws"),
			ttsWebSocket: websocketUrl(baseUrl, "/tts-ws"),
			asr: httpUrl("/asr"),
			live2dModels: httpUrl("/live2d-models/info"),
		},
		capabilities: [
			"Live2D avatar frontend",
			"voice conversation websocket",
			"text-to-speech websocket",
			"audio transcription endpoint",
			"local/offline model backends",
		],
		upstream: {
			repository: "Open-LLM-VTuber/Open-LLM-VTuber",
			defaultPort: 12393,
			licenseNote:
				"Open-LLM-VTuber code is MIT licensed; bundled Live2D sample assets have separate Live2D terms.",
		},
	};
}

export async function checkOpenLlmVtuberStatus() {
	const manifest = buildOpenLlmVtuberManifest();

	if (!manifest.enabled) {
		return {
			status: "disabled",
			manifest,
		};
	}

	try {
		const response = await fetch(manifest.urls.live2dModels, {
			headers: { accept: "application/json" },
		});

		if (!response.ok) {
			return {
				status: "degraded",
				statusCode: response.status,
				manifest,
			};
		}

		const live2d = await response.json();
		return {
			status: "online",
			live2d,
			manifest,
		};
	} catch (error) {
		return {
			status: "offline",
			error: error instanceof Error ? error.message : "Unknown error",
			manifest,
		};
	}
}
