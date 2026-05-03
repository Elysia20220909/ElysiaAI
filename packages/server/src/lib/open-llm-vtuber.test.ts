import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { vtuberRoutes } from "../routes/vtuber-routes";
import {
	buildOpenLlmVtuberManifest,
	checkOpenLlmVtuberStatus,
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

	test("returns disabled status without calling upstream fetch", async () => {
		const manifest = buildOpenLlmVtuberManifest({ enabled: false });
		const status = await checkOpenLlmVtuberStatus({
			manifest,
			fetcher: async () => {
				throw new Error("fetch should not be called when disabled");
			},
		});

		expect(status.status).toBe("disabled");
	});

	test("reports online when the upstream model endpoint responds", async () => {
		const manifest = buildOpenLlmVtuberManifest({
			baseUrl: "http://vtuber.test:12393",
			enabled: true,
		});
		const status = await checkOpenLlmVtuberStatus({
			manifest,
			fetcher: async (input, init) => {
				expect(input.toString()).toBe(
					"http://vtuber.test:12393/live2d-models/info",
				);
				expect(init?.headers).toEqual({ accept: "application/json" });
				return Response.json({ models: ["sample"] });
			},
		});

		expect(status.status).toBe("online");
		expect(status.live2d).toEqual({ models: ["sample"] });
	});

	test("reports degraded when upstream responds with an error status", async () => {
		const manifest = buildOpenLlmVtuberManifest({ enabled: true });
		const status = await checkOpenLlmVtuberStatus({
			manifest,
			fetcher: async () =>
				new Response(JSON.stringify({ error: "missing" }), { status: 404 }),
		});

		expect(status.status).toBe("degraded");
		expect(status.statusCode).toBe(404);
	});
});

describe("Open-LLM-VTuber bridge routes", () => {
	const app = new Elysia().use(vtuberRoutes);

	test("serves manifest through /api/vtuber/manifest", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/vtuber/manifest"),
		);
		const manifest = await response.json();

		expect(response.status).toBe(200);
		expect(manifest.urls.clientWebSocket).toContain("/client-ws");
		expect(manifest.urls.live2dModels).toContain("/live2d-models/info");
	});

	test("serves disabled status through /api/vtuber/status by default", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/vtuber/status"),
		);
		const status = await response.json();

		expect(response.status).toBe(200);
		expect(status.status).toBe("disabled");
		expect(status.manifest.urls.ttsWebSocket).toContain("/tts-ws");
	});
});
