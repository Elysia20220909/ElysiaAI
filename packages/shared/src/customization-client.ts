import type { ChatMode } from "./types";

export const DEFAULT_ELYSIA_API_BASE = "http://127.0.0.1:3000";

export type PromptTemplateMode = "sweet" | "normal" | "professional";
export type CustomizationChatMode = Exclude<ChatMode, "openai">;
export type TokenProvider = () =>
	| string
	| null
	| undefined
	| Promise<string | null | undefined>;

export interface PromptTemplate {
	id: string;
	name: string;
	description: string;
	template: string;
	variables: string[];
	mode: PromptTemplateMode;
}

export interface Theme {
	id: string;
	name: string;
	colors: {
		primary: string;
		secondary: string;
		background: string;
		text: string;
		accent: string;
	};
	fontFamily: string;
	borderRadius: string;
}

export interface ChatModeDescriptor {
	id: CustomizationChatMode;
	name: string;
	description: string;
	icon: string;
	promptPrefix: string;
	temperature: number;
	maxTokens: number;
}

export interface ExportFormat {
	id: string;
	name: string;
	extension: string;
	mimeType: string;
}

export interface CustomizationCatalog {
	templates: PromptTemplate[];
	themes: Theme[];
	modes: ChatModeDescriptor[];
	exportFormats: ExportFormat[];
}

export interface CustomizationSearchResponse {
	result: unknown;
}

export interface ElysiaCustomizationClientOptions {
	baseUrl?: string | URL;
	token?: string | TokenProvider;
	fetchImpl?: typeof fetch;
	defaultHeaders?: HeadersInit;
	timeoutMs?: number;
}

export interface RenderPromptTemplateInput {
	template: PromptTemplate | string;
	variables: Record<string, string | number | boolean | null | undefined>;
}

export class ElysiaCustomizationClientError extends Error {
	constructor(
		readonly status: number,
		readonly statusText: string,
		readonly details: unknown,
	) {
		super(`ElysiaAI customization request failed: ${status} ${statusText}`);
		this.name = "ElysiaCustomizationClientError";
	}
}

function normalizeBaseUrl(baseUrl: string | URL) {
	const text = baseUrl instanceof URL ? baseUrl.toString() : baseUrl;
	return text.endsWith("/") ? text : `${text}/`;
}

function normalizePath(path: string) {
	return path.replace(/^\/+/, "");
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTemplateValue(value: string | number | boolean | null | undefined) {
	return value === null || value === undefined ? "" : String(value);
}

function findById<T extends { id: string }>(items: T[], id: string) {
	return items.find((item) => item.id === id);
}

async function readResponseDetails(response: Response) {
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		return await response.json().catch(() => undefined);
	}
	return await response.text().catch(() => undefined);
}

export function renderPromptTemplate({
	template,
	variables,
}: RenderPromptTemplateInput) {
	let result = typeof template === "string" ? template : template.template;

	for (const [key, value] of Object.entries(variables)) {
		result = result.replace(
			new RegExp(`{${escapeRegExp(key)}}`, "g"),
			toTemplateValue(value),
		);
	}

	return result;
}

export function buildThemeCssVariables(theme: Theme) {
	return [
		`--color-primary: ${theme.colors.primary};`,
		`--color-secondary: ${theme.colors.secondary};`,
		`--color-background: ${theme.colors.background};`,
		`--color-text: ${theme.colors.text};`,
		`--color-accent: ${theme.colors.accent};`,
		`--font-family: ${theme.fontFamily};`,
		`--border-radius: ${theme.borderRadius};`,
	].join("\n");
}

export class ElysiaCustomizationClient {
	private readonly baseUrl: URL;
	private readonly fetchImpl: typeof fetch;
	private readonly defaultHeaders?: HeadersInit;
	private readonly timeoutMs?: number;
	private readonly token?: string | TokenProvider;

	constructor(options: ElysiaCustomizationClientOptions = {}) {
		this.baseUrl = new URL(
			normalizeBaseUrl(options.baseUrl ?? DEFAULT_ELYSIA_API_BASE),
		);
		this.fetchImpl = options.fetchImpl ?? fetch;
		this.defaultHeaders = options.defaultHeaders;
		this.timeoutMs = options.timeoutMs;
		this.token = options.token;
	}

	async listTemplates() {
		return await this.request<PromptTemplate[]>("/customization/templates");
	}

	async listThemes() {
		return await this.request<Theme[]>("/customization/themes");
	}

	async listModes() {
		return await this.request<ChatModeDescriptor[]>("/customization/modes");
	}

	async listExportFormats() {
		return await this.request<ExportFormat[]>("/customization/export-formats");
	}

	async getCatalog(): Promise<CustomizationCatalog> {
		const [templates, themes, modes, exportFormats] = await Promise.all([
			this.listTemplates(),
			this.listThemes(),
			this.listModes(),
			this.listExportFormats(),
		]);

		return { templates, themes, modes, exportFormats };
	}

	async getTemplate(id: string) {
		return findById(await this.listTemplates(), id);
	}

	async getTheme(id: string) {
		return findById(await this.listThemes(), id);
	}

	async getMode(id: string) {
		return findById(await this.listModes(), id);
	}

	async getExportFormat(id: string) {
		return findById(await this.listExportFormats(), id);
	}

	async renderTemplateById(
		id: string,
		variables: RenderPromptTemplateInput["variables"],
	) {
		const template = await this.getTemplate(id);
		if (!template) {
			throw new Error(`Unknown prompt template: ${id}`);
		}
		return renderPromptTemplate({ template, variables });
	}

	async search(query: string) {
		const trimmed = query.trim();
		if (!trimmed) {
			throw new Error("Search query is required");
		}

		const params = new URLSearchParams({ q: trimmed });
		return await this.request<CustomizationSearchResponse>(
			`/customization/api/search?${params.toString()}`,
		);
	}

	private async resolveToken() {
		if (typeof this.token === "function") {
			return await this.token();
		}
		return this.token;
	}

	private async request<T>(path: string, init: RequestInit = {}) {
		const url = new URL(normalizePath(path), this.baseUrl);
		const headers = new Headers(this.defaultHeaders);
		const initHeaders = new Headers(init.headers);

		for (const [key, value] of initHeaders.entries()) {
			headers.set(key, value);
		}

		if (init.body && !headers.has("content-type")) {
			headers.set("content-type", "application/json");
		}

		const token = await this.resolveToken();
		if (token) {
			headers.set("authorization", `Bearer ${token}`);
		}

		const { signal, cleanup } = this.createRequestSignal(init.signal);

		try {
			const response = await this.fetchImpl(url, {
				...init,
				headers,
				signal,
			});

			if (!response.ok) {
				throw new ElysiaCustomizationClientError(
					response.status,
					response.statusText,
					await readResponseDetails(response),
				);
			}

			return (await response.json()) as T;
		} finally {
			cleanup();
		}
	}

	private createRequestSignal(parentSignal?: AbortSignal | null) {
		if (!this.timeoutMs) {
			return {
				signal: parentSignal ?? undefined,
				cleanup: () => undefined,
			};
		}

		const controller = new AbortController();
		const abortFromParent = () => controller.abort(parentSignal?.reason);

		if (parentSignal?.aborted) {
			abortFromParent();
		} else {
			parentSignal?.addEventListener("abort", abortFromParent, { once: true });
		}

		const timer = setTimeout(() => {
			controller.abort(
				new Error(`Request timed out after ${this.timeoutMs}ms`),
			);
		}, this.timeoutMs);

		return {
			signal: controller.signal,
			cleanup: () => {
				clearTimeout(timer);
				parentSignal?.removeEventListener("abort", abortFromParent);
			},
		};
	}
}

export function createElysiaCustomizationClient(
	options: ElysiaCustomizationClientOptions = {},
) {
	return new ElysiaCustomizationClient(options);
}
