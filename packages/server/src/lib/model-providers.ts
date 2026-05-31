import { config } from "../../../../src/config.ts";

const DEFAULT_TIMEOUT_MS = 60000;

export type LlmProviderId =
	| "fastapi"
	| "ollama"
	| "llama-cpp"
	| "openai-compatible"
	| "openai";

export type LlmProviderScope = "local" | "external";

export type LlmChatMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

export type LlmStreamEvent = {
	content?: string;
	metadata?: Record<string, unknown>;
};

export type LlmChatOptions = {
	model?: string;
	temperature?: number;
	maxTokens?: number;
	sessionId?: string;
	timeoutMs?: number;
	signal?: AbortSignal;
	mode?: string;
	provider?: string;
};

export type LlmChatResult = {
	content: string;
	provider: LlmProviderId;
	model: string;
	raw?: unknown;
};

export type LlmProviderFetch = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

export type LlmProviderConfig = {
	fastApiBaseUrl: string;
	fastApiApiKey: string;
	ollamaBaseUrl: string;
	ollamaModel: string;
	llamaCppBaseUrl: string;
	llamaCppApiKey: string;
	llamaCppModel: string;
	openaiCompatibleBaseUrl: string;
	openaiCompatibleApiKey: string;
	openaiCompatibleModel: string;
	openaiApiKey: string;
	openaiModel: string;
	providerPriority: LlmProviderId[];
	allowCloudFallback: boolean;
	timeoutMs: number;
	fetcher: LlmProviderFetch;
};

export type LlmProviderConfigOverrides = Partial<
	Omit<LlmProviderConfig, "providerPriority" | "fetcher">
> & {
	providerPriority?: Array<string | LlmProviderId>;
	fetcher?: LlmProviderFetch;
};

export type LlmProvider = {
	id: LlmProviderId;
	label: string;
	scope: LlmProviderScope;
	defaultModel: string;
	isConfigured: () => boolean;
	resolveModel: (options?: LlmChatOptions) => string;
	chat: (
		messages: LlmChatMessage[],
		options?: LlmChatOptions,
	) => Promise<LlmChatResult>;
	streamChat: (
		messages: LlmChatMessage[],
		options?: LlmChatOptions,
	) => AsyncGenerator<LlmStreamEvent, void, unknown>;
};

type ProviderAttemptError = {
	provider: LlmProviderId;
	message: string;
};

const providerAliases: Record<string, LlmProviderId> = {
	fastapi: "fastapi",
	kernel: "fastapi",
	"fast-api": "fastapi",
	ollama: "ollama",
	"llama.cpp": "llama-cpp",
	"llama-cpp": "llama-cpp",
	llamacpp: "llama-cpp",
	openai: "openai",
	"openai-compatible": "openai-compatible",
	openai_compatible: "openai-compatible",
	openaicompatible: "openai-compatible",
	lmstudio: "openai-compatible",
	"lm-studio": "openai-compatible",
	vllm: "openai-compatible",
};

const localFirstDefaults: LlmProviderId[] = [
	"fastapi",
	"ollama",
	"llama-cpp",
	"openai-compatible",
];

function uniqueProviders(providers: LlmProviderId[]): LlmProviderId[] {
	return [...new Set(providers)];
}

export function normalizeProviderId(value?: string): LlmProviderId | null {
	if (!value) return null;
	const normalized = value.trim().toLowerCase();
	return providerAliases[normalized] ?? null;
}

export function normalizeProviderPriority(
	values: Array<string | LlmProviderId> = localFirstDefaults,
): LlmProviderId[] {
	const providers = values
		.map((value) => normalizeProviderId(value))
		.filter((value): value is LlmProviderId => Boolean(value));

	return providers.length > 0 ? uniqueProviders(providers) : localFirstDefaults;
}

export function normalizeProviderBaseUrl(value: string, fallback = ""): string {
	const candidate = value || fallback;
	if (!candidate) return "";

	try {
		return new URL(candidate).toString().replace(/\/+$/, "");
	} catch {
		return fallback;
	}
}

export function buildLlmProviderConfig(
	overrides: LlmProviderConfigOverrides = {},
): LlmProviderConfig {
	const ollamaModel = overrides.ollamaModel ?? config.ollamaModel;
	const openaiModel = overrides.openaiModel ?? config.openaiModel;

	return {
		fastApiBaseUrl:
			overrides.fastApiBaseUrl ??
			normalizeProviderBaseUrl(config.fastApiBaseUrl),
		fastApiApiKey: overrides.fastApiApiKey ?? config.fastApiApiKey,
		ollamaBaseUrl:
			overrides.ollamaBaseUrl ?? normalizeProviderBaseUrl(config.ollamaBaseUrl),
		ollamaModel,
		llamaCppBaseUrl:
			overrides.llamaCppBaseUrl ??
			normalizeProviderBaseUrl(config.llamaCppBaseUrl),
		llamaCppApiKey: overrides.llamaCppApiKey ?? config.llamaCppApiKey,
		llamaCppModel:
			(overrides.llamaCppModel ?? config.llamaCppModel) || ollamaModel,
		openaiCompatibleBaseUrl:
			overrides.openaiCompatibleBaseUrl ??
			normalizeProviderBaseUrl(config.openaiCompatibleBaseUrl),
		openaiCompatibleApiKey:
			overrides.openaiCompatibleApiKey ?? config.openaiCompatibleApiKey,
		openaiCompatibleModel:
			(overrides.openaiCompatibleModel ?? config.openaiCompatibleModel) ||
			openaiModel,
		openaiApiKey: overrides.openaiApiKey ?? config.openaiApiKey,
		openaiModel,
		providerPriority: normalizeProviderPriority(
			overrides.providerPriority ?? config.llmProviderPriority,
		),
		allowCloudFallback:
			overrides.allowCloudFallback ?? config.llmAllowCloudFallback,
		timeoutMs: overrides.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		fetcher: overrides.fetcher ?? fetch,
	};
}

export function resolveProviderPlan(
	modeOrProvider: string | undefined,
	providerConfig: Pick<
		LlmProviderConfig,
		"providerPriority" | "allowCloudFallback"
	>,
): LlmProviderId[] {
	const explicitProvider = normalizeProviderId(modeOrProvider);
	if (explicitProvider) return [explicitProvider];

	const priority = providerConfig.providerPriority.length
		? providerConfig.providerPriority
		: localFirstDefaults;
	const localPlan = priority.filter((provider) => provider !== "openai");

	if (!providerConfig.allowCloudFallback) return uniqueProviders(localPlan);
	return uniqueProviders([...localPlan, "openai"]);
}

function endpoint(baseUrl: string, path: string): string {
	const base = normalizeProviderBaseUrl(baseUrl);
	const suffix = path.startsWith("/") ? path : `/${path}`;
	return `${base}${suffix}`;
}

function jsonHeaders(apiKey?: string): Record<string, string> {
	return {
		"Content-Type": "application/json",
		...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
	};
}

function fastApiHeaders(apiKey: string): Record<string, string> {
	return {
		"Content-Type": "application/json",
		...(apiKey ? { "X-API-Key": apiKey } : {}),
	};
}

function compactOptions(options: LlmChatOptions = {}) {
	const payload: Record<string, unknown> = {};
	if (options.temperature !== undefined)
		payload.temperature = options.temperature;
	if (options.maxTokens !== undefined) payload.num_predict = options.maxTokens;
	return Object.keys(payload).length > 0 ? payload : undefined;
}

function openAiRequestBody(
	messages: LlmChatMessage[],
	model: string,
	options: LlmChatOptions = {},
	stream = false,
) {
	return {
		model,
		messages,
		stream,
		...(options.temperature !== undefined
			? { temperature: options.temperature }
			: {}),
		...(options.maxTokens !== undefined
			? { max_tokens: options.maxTokens }
			: {}),
	};
}

function timeoutSignal(timeoutMs: number, parent?: AbortSignal) {
	const controller = new AbortController();
	let timeout: ReturnType<typeof setTimeout> | undefined;
	const abortFromParent = () => controller.abort(parent?.reason);

	if (parent?.aborted) {
		abortFromParent();
	} else if (parent) {
		parent.addEventListener("abort", abortFromParent, { once: true });
	}

	if (timeoutMs > 0) {
		timeout = setTimeout(() => controller.abort(), timeoutMs);
	}

	return {
		signal: controller.signal,
		cleanup: () => {
			if (timeout) clearTimeout(timeout);
			parent?.removeEventListener("abort", abortFromParent);
		},
	};
}

async function assertOk(provider: LlmProviderId, response: Response) {
	if (response.ok) return;

	let detail = "";
	try {
		detail = await response.text();
	} catch {
		detail = response.statusText;
	}

	throw new Error(
		`${provider} returned HTTP ${response.status}${
			detail ? `: ${detail.slice(0, 200)}` : ""
		}`,
	);
}

async function requestJson(
	provider: LlmProviderId,
	providerConfig: LlmProviderConfig,
	url: string,
	init: RequestInit,
	options: LlmChatOptions = {},
): Promise<unknown> {
	const abort = timeoutSignal(
		options.timeoutMs ?? providerConfig.timeoutMs,
		options.signal,
	);

	try {
		const response = await providerConfig.fetcher(url, {
			...init,
			signal: abort.signal,
		});
		await assertOk(provider, response);
		return await response.json();
	} finally {
		abort.cleanup();
	}
}

async function requestStream(
	provider: LlmProviderId,
	providerConfig: LlmProviderConfig,
	url: string,
	init: RequestInit,
	options: LlmChatOptions = {},
): Promise<{ response: Response; cleanup: () => void }> {
	const abort = timeoutSignal(
		options.timeoutMs ?? providerConfig.timeoutMs,
		options.signal,
	);

	try {
		const response = await providerConfig.fetcher(url, {
			...init,
			signal: abort.signal,
		});
		await assertOk(provider, response);
		return { response, cleanup: abort.cleanup };
	} catch (error) {
		abort.cleanup();
		throw error;
	}
}

async function* readLines(
	body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<string, void, unknown> {
	if (!body) return;

	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split(/\r?\n/);
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed) yield trimmed;
			}
		}

		buffer += decoder.decode();
		const finalLine = buffer.trim();
		if (finalLine) yield finalLine;
	} finally {
		reader.releaseLock();
	}
}

function parseJsonLine(line: string): unknown | null {
	try {
		return JSON.parse(line);
	} catch {
		return null;
	}
}

function ssePayload(line: string): string | null {
	if (!line.startsWith("data:")) return null;
	return line.slice("data:".length).trim();
}

function contentFromOpenAiChunk(data: unknown): string {
	const chunk = data as {
		choices?: Array<{
			delta?: { content?: string };
			message?: { content?: string };
		}>;
	};
	return (
		chunk.choices?.[0]?.delta?.content ??
		chunk.choices?.[0]?.message?.content ??
		""
	);
}

function contentFromOllamaChunk(data: unknown): string {
	const chunk = data as { message?: { content?: string }; response?: string };
	return chunk.message?.content ?? chunk.response ?? "";
}

function contentFromFastApiPayload(data: unknown): LlmStreamEvent | null {
	if (!data || typeof data !== "object") return null;
	const payload = data as Record<string, unknown>;
	if (typeof payload.content === "string") return { content: payload.content };
	return { metadata: payload };
}

function providerNotConfigured(provider: LlmProvider): ProviderAttemptError {
	return {
		provider: provider.id,
		message: `${provider.label} is not configured`,
	};
}

function formatAttemptErrors(errors: ProviderAttemptError[]): string {
	if (errors.length === 0) return "No provider attempts were made";
	return errors
		.map((error) => `${error.provider}: ${error.message}`)
		.join("; ");
}

function createFastApiProvider(providerConfig: LlmProviderConfig): LlmProvider {
	const provider: LlmProvider = {
		id: "fastapi",
		label: "FastAPI AI Kernel",
		scope: "local",
		defaultModel: "kernel",
		isConfigured: () => Boolean(providerConfig.fastApiBaseUrl),
		resolveModel: () => "kernel",
		chat: async (messages, options = {}) => {
			const data = (await requestJson(
				"fastapi",
				providerConfig,
				endpoint(providerConfig.fastApiBaseUrl, "/chat"),
				{
					method: "POST",
					headers: fastApiHeaders(providerConfig.fastApiApiKey),
					body: JSON.stringify({
						messages,
						session_id: options.sessionId ?? "default",
						stream: false,
					}),
				},
				options,
			)) as { response?: string };

			return {
				content: data.response ?? "",
				provider: "fastapi",
				model: "kernel",
				raw: data,
			};
		},
		streamChat: async function* (messages, options = {}) {
			const { response, cleanup } = await requestStream(
				"fastapi",
				providerConfig,
				endpoint(providerConfig.fastApiBaseUrl, "/chat"),
				{
					method: "POST",
					headers: fastApiHeaders(providerConfig.fastApiApiKey),
					body: JSON.stringify({
						messages,
						session_id: options.sessionId ?? "default",
						stream: true,
					}),
				},
				options,
			);

			try {
				for await (const line of readLines(response.body)) {
					const payload = ssePayload(line);
					if (!payload || payload === "[DONE]") continue;
					const data = parseJsonLine(payload);
					const event = contentFromFastApiPayload(data);
					if (event) yield event;
				}
			} finally {
				cleanup();
			}
		},
	};

	return provider;
}

function createOllamaProvider(providerConfig: LlmProviderConfig): LlmProvider {
	const provider: LlmProvider = {
		id: "ollama",
		label: "Ollama",
		scope: "local",
		defaultModel: providerConfig.ollamaModel,
		isConfigured: () =>
			Boolean(providerConfig.ollamaBaseUrl && providerConfig.ollamaModel),
		resolveModel: (options = {}) => options.model || providerConfig.ollamaModel,
		chat: async (messages, options = {}) => {
			const model = provider.resolveModel(options);
			const data = (await requestJson(
				"ollama",
				providerConfig,
				endpoint(providerConfig.ollamaBaseUrl, "/api/chat"),
				{
					method: "POST",
					headers: jsonHeaders(),
					body: JSON.stringify({
						model,
						messages,
						stream: false,
						...(compactOptions(options)
							? { options: compactOptions(options) }
							: {}),
					}),
				},
				options,
			)) as { message?: { content?: string }; response?: string };

			return {
				content: data.message?.content ?? data.response ?? "",
				provider: "ollama",
				model,
				raw: data,
			};
		},
		streamChat: async function* (messages, options = {}) {
			const model = provider.resolveModel(options);
			const { response, cleanup } = await requestStream(
				"ollama",
				providerConfig,
				endpoint(providerConfig.ollamaBaseUrl, "/api/chat"),
				{
					method: "POST",
					headers: jsonHeaders(),
					body: JSON.stringify({
						model,
						messages,
						stream: true,
						...(compactOptions(options)
							? { options: compactOptions(options) }
							: {}),
					}),
				},
				options,
			);

			try {
				for await (const line of readLines(response.body)) {
					const data = parseJsonLine(line);
					const content = contentFromOllamaChunk(data);
					if (content) yield { content };
				}
			} finally {
				cleanup();
			}
		},
	};

	return provider;
}

function createOpenAiCompatibleProvider(
	id: Extract<LlmProviderId, "llama-cpp" | "openai-compatible" | "openai">,
	label: string,
	scope: LlmProviderScope,
	baseUrl: string,
	apiKey: string,
	defaultModel: string,
	providerConfig: LlmProviderConfig,
): LlmProvider {
	const provider: LlmProvider = {
		id,
		label,
		scope,
		defaultModel,
		isConfigured: () =>
			id === "openai"
				? Boolean(apiKey && defaultModel)
				: Boolean(baseUrl && defaultModel),
		resolveModel: (options = {}) => options.model || defaultModel,
		chat: async (messages, options = {}) => {
			const model = provider.resolveModel(options);
			const data = (await requestJson(
				id,
				providerConfig,
				endpoint(baseUrl || "https://api.openai.com", "/v1/chat/completions"),
				{
					method: "POST",
					headers: jsonHeaders(apiKey),
					body: JSON.stringify(
						openAiRequestBody(messages, model, options, false),
					),
				},
				options,
			)) as { choices?: Array<{ message?: { content?: string } }> };

			return {
				content: data.choices?.[0]?.message?.content ?? "",
				provider: id,
				model,
				raw: data,
			};
		},
		streamChat: async function* (messages, options = {}) {
			const model = provider.resolveModel(options);
			const { response, cleanup } = await requestStream(
				id,
				providerConfig,
				endpoint(baseUrl || "https://api.openai.com", "/v1/chat/completions"),
				{
					method: "POST",
					headers: jsonHeaders(apiKey),
					body: JSON.stringify(
						openAiRequestBody(messages, model, options, true),
					),
				},
				options,
			);

			try {
				for await (const line of readLines(response.body)) {
					const payload = ssePayload(line);
					if (!payload) continue;
					if (payload === "[DONE]") break;

					const data = parseJsonLine(payload);
					const content = contentFromOpenAiChunk(data);
					if (content) yield { content };
				}
			} finally {
				cleanup();
			}
		},
	};

	return provider;
}

export function createLlmProviderRegistry(
	providerConfig = buildLlmProviderConfig(),
): Record<LlmProviderId, LlmProvider> {
	return {
		fastapi: createFastApiProvider(providerConfig),
		ollama: createOllamaProvider(providerConfig),
		"llama-cpp": createOpenAiCompatibleProvider(
			"llama-cpp",
			"llama.cpp",
			"local",
			providerConfig.llamaCppBaseUrl,
			providerConfig.llamaCppApiKey,
			providerConfig.llamaCppModel,
			providerConfig,
		),
		"openai-compatible": createOpenAiCompatibleProvider(
			"openai-compatible",
			"OpenAI-compatible endpoint",
			"local",
			providerConfig.openaiCompatibleBaseUrl,
			providerConfig.openaiCompatibleApiKey,
			providerConfig.openaiCompatibleModel,
			providerConfig,
		),
		openai: createOpenAiCompatibleProvider(
			"openai",
			"OpenAI",
			"external",
			"https://api.openai.com",
			providerConfig.openaiApiKey,
			providerConfig.openaiModel,
			providerConfig,
		),
	};
}

function providersForPlan(
	options: LlmChatOptions,
	providerConfig: LlmProviderConfig,
) {
	const plan = resolveProviderPlan(
		options.provider ?? options.mode,
		providerConfig,
	);
	const registry = createLlmProviderRegistry(providerConfig);
	return plan.map((providerId) => registry[providerId]);
}

export async function chatWithModelProvider(
	messages: LlmChatMessage[],
	options: LlmChatOptions = {},
	providerConfig = buildLlmProviderConfig(),
): Promise<LlmChatResult> {
	const errors: ProviderAttemptError[] = [];

	for (const provider of providersForPlan(options, providerConfig)) {
		if (!provider.isConfigured()) {
			errors.push(providerNotConfigured(provider));
			continue;
		}

		try {
			return await provider.chat(messages, options);
		} catch (error) {
			errors.push({
				provider: provider.id,
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}

	throw new Error(`No LLM provider succeeded: ${formatAttemptErrors(errors)}`);
}

export async function* streamChatWithModelProvider(
	messages: LlmChatMessage[],
	options: LlmChatOptions = {},
	providerConfig = buildLlmProviderConfig(),
): AsyncGenerator<LlmStreamEvent, void, unknown> {
	const errors: ProviderAttemptError[] = [];

	for (const provider of providersForPlan(options, providerConfig)) {
		if (!provider.isConfigured()) {
			errors.push(providerNotConfigured(provider));
			continue;
		}

		let started = false;
		try {
			for await (const event of provider.streamChat(messages, options)) {
				if (!started) {
					yield {
						metadata: {
							provider: provider.id,
							model: provider.resolveModel(options),
							scope: provider.scope,
						},
					};
					started = true;
				}
				yield event;
			}

			if (!started) {
				yield {
					metadata: {
						provider: provider.id,
						model: provider.resolveModel(options),
						scope: provider.scope,
					},
				};
			}
			return;
		} catch (error) {
			if (started) throw error;
			errors.push({
				provider: provider.id,
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}

	throw new Error(`No LLM provider succeeded: ${formatAttemptErrors(errors)}`);
}
