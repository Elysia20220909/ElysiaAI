import { describe, expect, test } from "bun:test";
import {
	buildLlmProviderConfig,
	type LlmProviderFetch,
	normalizeProviderBaseUrl,
	resolveProviderPlan,
	streamChatWithModelProvider,
} from "./model-providers";

const messages = [{ role: "user" as const, content: "hello" }];

function testConfig(fetcher: LlmProviderFetch, overrides = {}) {
	return buildLlmProviderConfig({
		fastApiBaseUrl: "",
		ollamaBaseUrl: "http://ollama.test/",
		ollamaModel: "llama3.2",
		llamaCppBaseUrl: "http://llama.test/",
		llamaCppModel: "local-model",
		openaiCompatibleBaseUrl: "http://compat.test/",
		openaiCompatibleModel: "compat-model",
		openaiApiKey: "sk-test",
		openaiModel: "gpt-test",
		providerPriority: ["ollama", "openai"],
		allowCloudFallback: false,
		fetcher,
		...overrides,
	});
}

async function collectStream(
	config: ReturnType<typeof buildLlmProviderConfig>,
	provider?: string,
) {
	const events = [];
	for await (const event of streamChatWithModelProvider(
		messages,
		{ provider },
		config,
	)) {
		events.push(event);
	}
	return events;
}

describe("LLM model providers", () => {
	test("normalizes provider URLs and keeps cloud fallback opt-in", () => {
		expect(normalizeProviderBaseUrl("http://localhost:11434/")).toBe(
			"http://localhost:11434",
		);

		const config = testConfig(async () => Response.json({}));
		expect(resolveProviderPlan(undefined, config)).toEqual(["ollama"]);
		expect(resolveProviderPlan("llama.cpp", config)).toEqual(["llama-cpp"]);
		expect(resolveProviderPlan("openai", config)).toEqual(["openai"]);

		expect(
			resolveProviderPlan(undefined, {
				...config,
				allowCloudFallback: true,
			}),
		).toEqual(["ollama", "openai"]);
	});

	test("streams Ollama NDJSON through the common interface", async () => {
		const config = testConfig(async (input, init) => {
			expect(String(input)).toBe("http://ollama.test/api/chat");
			const body = JSON.parse(String(init?.body));
			expect(body.model).toBe("llama3.2");
			expect(body.stream).toBe(true);

			return new Response(
				'{"message":{"content":"こん"}}\n{"message":{"content":"にちは"}}\n',
			);
		});

		await expect(collectStream(config, "ollama")).resolves.toEqual([
			{
				metadata: {
					provider: "ollama",
					model: "llama3.2",
					scope: "local",
				},
			},
			{ content: "こん" },
			{ content: "にちは" },
		]);
	});

	test("falls back from a failed local provider to the next local endpoint", async () => {
		const calls: string[] = [];
		const config = testConfig(
			async (input) => {
				calls.push(String(input));
				if (String(input).includes("ollama.test")) {
					return new Response("offline", { status: 503 });
				}

				return new Response(
					'data: {"choices":[{"delta":{"content":"fallback"}}]}\n\ndata: [DONE]\n\n',
				);
			},
			{
				providerPriority: ["ollama", "openai-compatible"],
			},
		);

		await expect(collectStream(config)).resolves.toEqual([
			{
				metadata: {
					provider: "openai-compatible",
					model: "compat-model",
					scope: "local",
				},
			},
			{ content: "fallback" },
		]);
		expect(calls).toEqual([
			"http://ollama.test/api/chat",
			"http://compat.test/v1/chat/completions",
		]);
	});
});
