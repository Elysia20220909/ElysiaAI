import { describe, expect, test } from "bun:test";
import {
	buildOpenLlmVtuberManifest,
	normalizeOpenLlmVtuberBaseUrl,
	websocketUrl,
} from "./open-llm-vtuber";

describe("Open-LLM-VTuber bridge helpers", () => {
	test("normalizes the base URL without a trailing slash", () => {
		expect(normalizeOpenLlmVtuberBaseUrl("http://localhost:12393/")).toBe(
			"http://localhost:12393",
		);
	});

	test("falls back to the upstream default when the URL is invalid", () => {
		expect(normalizeOpenLlmVtuberBaseUrl("not a url")).toBe(
			"http://127.0.0.1:12393",
		);
	});

	test("derives websocket endpoints from the configured base URL", () => {
		expect(websocketUrl("https://example.test:12393", "/client-ws")).toBe(
			"wss://example.test:12393/client-ws",
		);
	});

	test("builds a manifest with the Open-LLM-VTuber endpoints", () => {
		const manifest = buildOpenLlmVtuberManifest();
		expect(manifest.upstream.repository).toBe(
			"Open-LLM-VTuber/Open-LLM-VTuber",
		);
		expect(manifest.urls.clientWebSocket.endsWith("/client-ws")).toBe(true);
		expect(manifest.urls.ttsWebSocket.endsWith("/tts-ws")).toBe(true);
		expect(manifest.urls.live2dModels.endsWith("/live2d-models/info")).toBe(
			true,
		);
	});
});
