import { Elysia } from "elysia";
import { jsonError } from "../lib/constants";
import * as customization from "../lib/customization";
import { searchRelevantInfo } from "../lib/web-search";

export const customizationRoutes = new Elysia({ prefix: "/customization" })
	.get("/templates", () => customization.defaultPromptTemplates)
	.get("/themes", () => customization.defaultThemes)
	.get("/modes", () => customization.chatModes)
	.get("/export-formats", () => customization.exportFormats)
	.get(
		"/api/search",
		async ({ query }: { query: Record<string, string | undefined> }) => {
			const q = query.q;
			if (!q) return jsonError(400, "Query required");
			try {
				const result = await searchRelevantInfo(q);
				return { result };
			} catch {
				return jsonError(500, "Search error");
			}
		},
	);
