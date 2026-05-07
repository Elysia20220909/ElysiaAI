import { describe, expect, test } from "bun:test";
import {
	buildThemeCssVariables,
	ElysiaCustomizationClient,
	ElysiaCustomizationClientError,
	renderPromptTemplate,
} from "../packages/shared/src/customization-client";

type MockResponses = Record<string, Response | unknown>;

function createMockFetch(responses: MockResponses) {
	const calls: Array<{ url: string; init?: RequestInit }> = [];
	const fetchImpl: typeof fetch = async (input, init) => {
		const url =
			input instanceof URL
				? input.toString()
				: typeof input === "string"
					? input
					: input.url;
		const parsed = new URL(url);
		const key = `${parsed.pathname}${parsed.search}`;
		calls.push({ url, init });

		const response = responses[key];
		if (response instanceof Response) {
			return response;
		}

		return new Response(JSON.stringify(response ?? null), {
			headers: { "content-type": "application/json" },
		});
	};

	return { calls, fetchImpl };
}

describe("Elysia customization client", () => {
	test("loads the customization catalog from the local API", async () => {
		const { fetchImpl } = createMockFetch({
			"/customization/templates": [
				{
					id: "normal-default",
					name: "Normal",
					description: "Balanced",
					template: "{query}",
					variables: ["query"],
					mode: "normal",
				},
			],
			"/customization/themes": [
				{
					id: "blue-professional",
					name: "Blue",
					colors: {
						primary: "#3b82f6",
						secondary: "#60a5fa",
						background: "#eff6ff",
						text: "#1f2937",
						accent: "#2563eb",
					},
					fontFamily: "system-ui, sans-serif",
					borderRadius: "0.5rem",
				},
			],
			"/customization/modes": [
				{
					id: "normal",
					name: "Normal",
					description: "Balanced",
					icon: "N",
					promptPrefix: "Be helpful.",
					temperature: 0.7,
					maxTokens: 2000,
				},
			],
			"/customization/export-formats": [
				{
					id: "json",
					name: "JSON",
					extension: ".json",
					mimeType: "application/json",
				},
			],
		});
		const client = new ElysiaCustomizationClient({ fetchImpl });

		const catalog = await client.getCatalog();

		expect(catalog.templates[0]?.id).toBe("normal-default");
		expect(catalog.themes[0]?.id).toBe("blue-professional");
		expect(catalog.modes[0]?.id).toBe("normal");
		expect(catalog.exportFormats[0]?.id).toBe("json");
	});

	test("sends bearer tokens when configured", async () => {
		const { calls, fetchImpl } = createMockFetch({
			"/customization/templates": [],
		});
		const client = new ElysiaCustomizationClient({
			fetchImpl,
			token: async () => "test-token",
		});

		await client.listTemplates();

		const headers = new Headers(calls[0]?.init?.headers);
		expect(headers.get("authorization")).toBe("Bearer test-token");
	});

	test("renders prompt templates without touching unknown variables", () => {
		const rendered = renderPromptTemplate({
			template: "Question: {query}. Count: {count}. Left: {missing}",
			variables: { query: "TypeScript", count: 2 },
		});

		expect(rendered).toBe("Question: TypeScript. Count: 2. Left: {missing}");
	});

	test("builds CSS variables from a theme", () => {
		const css = buildThemeCssVariables({
			id: "blue-professional",
			name: "Blue",
			colors: {
				primary: "#3b82f6",
				secondary: "#60a5fa",
				background: "#eff6ff",
				text: "#1f2937",
				accent: "#2563eb",
			},
			fontFamily: "system-ui, sans-serif",
			borderRadius: "0.5rem",
		});

		expect(css).toContain("--color-primary: #3b82f6;");
		expect(css).toContain("--border-radius: 0.5rem;");
	});

	test("raises structured errors for failed API responses", async () => {
		const { fetchImpl } = createMockFetch({
			"/customization/templates": new Response(
				JSON.stringify({ error: "Unavailable" }),
				{
					status: 503,
					statusText: "Service Unavailable",
					headers: { "content-type": "application/json" },
				},
			),
		});
		const client = new ElysiaCustomizationClient({ fetchImpl });

		try {
			await client.listTemplates();
			throw new Error("Expected request to fail");
		} catch (error) {
			expect(error).toBeInstanceOf(ElysiaCustomizationClientError);
			expect((error as ElysiaCustomizationClientError).status).toBe(503);
			expect((error as ElysiaCustomizationClientError).details).toEqual({
				error: "Unavailable",
			});
		}
	});
});
