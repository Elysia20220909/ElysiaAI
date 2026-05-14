import { config } from "../../../../src/config.ts";

export type OllamaRuntimeStatus = "online" | "degraded" | "offline";

export interface OllamaModelSummary {
	name: string;
	modifiedAt?: string;
	size?: number;
	digest?: string;
	family?: string;
	parameterSize?: string;
	quantizationLevel?: string;
}

export interface OllamaManifest {
	baseUrl: string;
	configuredModel: string;
	versionUrl: string;
	tagsUrl: string;
	pullCommand: string;
}

export interface OllamaStatus {
	status: OllamaRuntimeStatus;
	baseUrl: string;
	configuredModel: string;
	modelReady: boolean;
	matchedModel?: string;
	version?: string;
	responseTime: number;
	models: OllamaModelSummary[];
	error?: string;
	recommendations: string[];
	lastCheck: string;
}

type OllamaFetch = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

interface OllamaStatusOptions {
	baseUrl?: string;
	model?: string;
	timeoutMs?: number;
	fetcher?: OllamaFetch;
}

interface OllamaTagsResponse {
	models?: Array<{
		name?: string;
		model?: string;
		modified_at?: string;
		size?: number;
		digest?: string;
		details?: {
			family?: string;
			parameter_size?: string;
			quantization_level?: string;
		};
	}>;
}

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

export function normalizeOllamaBaseUrl(baseUrl = config.ollamaBaseUrl): string {
	try {
		const url = new URL(baseUrl || DEFAULT_OLLAMA_BASE_URL);
		const trimmedPath = url.pathname.replace(/\/+$/, "");
		url.pathname = trimmedPath === "/api" ? "" : trimmedPath;
		url.search = "";
		url.hash = "";
		return url.toString().replace(/\/$/, "");
	} catch {
		return DEFAULT_OLLAMA_BASE_URL;
	}
}

export function ollamaApiUrl(path: string, baseUrl = config.ollamaBaseUrl) {
	const normalizedBaseUrl = normalizeOllamaBaseUrl(baseUrl);
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${normalizedBaseUrl}${normalizedPath}`;
}

export function buildOllamaManifest(
	baseUrl = config.ollamaBaseUrl,
	model = config.ollamaModel,
): OllamaManifest {
	const normalizedBaseUrl = normalizeOllamaBaseUrl(baseUrl);
	const configuredModel = model.trim() || "llama3.2";

	return {
		baseUrl: normalizedBaseUrl,
		configuredModel,
		versionUrl: ollamaApiUrl("/api/version", normalizedBaseUrl),
		tagsUrl: ollamaApiUrl("/api/tags", normalizedBaseUrl),
		pullCommand: `ollama pull ${configuredModel}`,
	};
}

function normalizeModelName(name: string) {
	return name.trim().replace(/:latest$/, "");
}

export function findConfiguredModel(
	configuredModel: string,
	models: OllamaModelSummary[],
) {
	const expected = normalizeModelName(configuredModel);
	return models.find((model) => {
		const modelName = normalizeModelName(model.name);
		return modelName === expected || model.name === configuredModel;
	});
}

function summarizeModels(response: OllamaTagsResponse): OllamaModelSummary[] {
	return (response.models || [])
		.map((model) => ({
			name: model.name || model.model || "",
			modifiedAt: model.modified_at,
			size: model.size,
			digest: model.digest,
			family: model.details?.family,
			parameterSize: model.details?.parameter_size,
			quantizationLevel: model.details?.quantization_level,
		}))
		.filter((model) => model.name.length > 0)
		.sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchJson<T>(
	url: string,
	fetcher: OllamaFetch,
	timeoutMs: number,
): Promise<T> {
	const response = await fetcher(url, {
		headers: { accept: "application/json" },
		signal: AbortSignal.timeout(timeoutMs),
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	return (await response.json()) as T;
}

function buildRecommendations(
	status: OllamaRuntimeStatus,
	manifest: OllamaManifest,
	modelReady: boolean,
	models: OllamaModelSummary[],
	error?: string,
) {
	const recommendations: string[] = [];

	if (status === "offline") {
		recommendations.push(
			"Ollama を起動し、`OLLAMA_BASE_URL` がローカルの Ollama を指しているか確認してください。",
		);
	}

	if (models.length === 0 && status !== "offline") {
		recommendations.push(
			`ローカルモデルが見つかりません。まず \`${manifest.pullCommand}\` を実行してください。`,
		);
	} else if (!modelReady && status !== "offline") {
		recommendations.push(
			`設定モデル \`${manifest.configuredModel}\` が見つかりません。必要なら \`${manifest.pullCommand}\` を実行してください。`,
		);
	}

	if (error) {
		recommendations.push(`最後のエラー: ${error}`);
	}

	return recommendations;
}

export async function checkOllamaStatus(
	options: OllamaStatusOptions = {},
): Promise<OllamaStatus> {
	const timeoutMs = options.timeoutMs ?? 5000;
	const fetcher = options.fetcher ?? fetch;
	const manifest = buildOllamaManifest(options.baseUrl, options.model);
	const startedAt = Date.now();

	try {
		const versionResponse = await fetchJson<{ version?: string }>(
			manifest.versionUrl,
			fetcher,
			timeoutMs,
		);

		let models: OllamaModelSummary[] = [];
		let error: string | undefined;
		try {
			const tagsResponse = await fetchJson<OllamaTagsResponse>(
				manifest.tagsUrl,
				fetcher,
				timeoutMs,
			);
			models = summarizeModels(tagsResponse);
		} catch (tagsError) {
			error =
				tagsError instanceof Error
					? tagsError.message
					: "Failed to list Ollama models";
		}

		const matchedModel = findConfiguredModel(manifest.configuredModel, models);
		const modelReady = Boolean(matchedModel);
		const status: OllamaRuntimeStatus =
			error || !modelReady ? "degraded" : "online";

		return {
			status,
			baseUrl: manifest.baseUrl,
			configuredModel: manifest.configuredModel,
			modelReady,
			matchedModel: matchedModel?.name,
			version: versionResponse.version,
			responseTime: Date.now() - startedAt,
			models,
			error,
			recommendations: buildRecommendations(
				status,
				manifest,
				modelReady,
				models,
				error,
			),
			lastCheck: new Date().toISOString(),
		};
	} catch (statusError) {
		const error =
			statusError instanceof Error
				? statusError.message
				: "Failed to reach Ollama";
		return {
			status: "offline",
			baseUrl: manifest.baseUrl,
			configuredModel: manifest.configuredModel,
			modelReady: false,
			responseTime: Date.now() - startedAt,
			models: [],
			error,
			recommendations: buildRecommendations(
				"offline",
				manifest,
				false,
				[],
				error,
			),
			lastCheck: new Date().toISOString(),
		};
	}
}
