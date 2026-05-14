import { describe, expect, test } from "bun:test";
import {
	buildOllamaManifest,
	checkOllamaStatus,
	findConfiguredModel,
	normalizeOllamaBaseUrl,
	type OllamaModelSummary,
} from "./ollama-service";

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("Ollama service helpers", () => {
	test("normalizes Ollama base URLs and trims accidental /api suffixes", () => {
		expect(normalizeOllamaBaseUrl("http://localhost:11434/api/")).toBe(
			"http://localhost:11434",
		);
		expect(normalizeOllamaBaseUrl("not a url")).toBe("http://127.0.0.1:11434");
	});

	test("builds a manifest for the configured local model", () => {
		const manifest = buildOllamaManifest(
			"http://localhost:11434/api",
			"llama3.2",
		);

		expect(manifest.versionUrl).toBe("http://localhost:11434/api/version");
		expect(manifest.tagsUrl).toBe("http://localhost:11434/api/tags");
		expect(manifest.pullCommand).toBe("ollama pull llama3.2");
	});

	test("matches configured models against :latest tags", () => {
		const models: OllamaModelSummary[] = [{ name: "llama3.2:latest" }];
		expect(findConfiguredModel("llama3.2", models)?.name).toBe(
			"llama3.2:latest",
		);
	});

	test("reports online when Ollama and the configured model are ready", async () => {
		const status = await checkOllamaStatus({
			baseUrl: "http://ollama.test:11434/api",
			model: "llama3.2",
			fetcher: async (input) => {
				const url = input.toString();
				if (url.endsWith("/api/version")) {
					return jsonResponse({ version: "0.12.0" });
				}
				if (url.endsWith("/api/tags")) {
					return jsonResponse({
						models: [
							{
								name: "llama3.2:latest",
								size: 123,
								details: {
									family: "llama",
									parameter_size: "3.2B",
									quantization_level: "Q4_K_M",
								},
							},
						],
					});
				}
				throw new Error(`unexpected URL ${url}`);
			},
		});

		expect(status.status).toBe("online");
		expect(status.baseUrl).toBe("http://ollama.test:11434");
		expect(status.modelReady).toBe(true);
		expect(status.matchedModel).toBe("llama3.2:latest");
		expect(status.version).toBe("0.12.0");
	});

	test("reports degraded when the configured model is missing", async () => {
		const status = await checkOllamaStatus({
			model: "llama3.2",
			fetcher: async (input) => {
				const url = input.toString();
				if (url.endsWith("/api/version")) return jsonResponse({ version: "1" });
				return jsonResponse({ models: [{ name: "gemma3:latest" }] });
			},
		});

		expect(status.status).toBe("degraded");
		expect(status.modelReady).toBe(false);
		expect(status.recommendations[0]).toContain("ollama pull llama3.2");
	});
});
