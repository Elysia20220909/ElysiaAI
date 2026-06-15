import { existsSync } from "node:fs";
import { join } from "node:path";
import { Elysia, t } from "elysia";
import { authErrorResponse } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import {
	appendMvpMemory,
	buildLocalRagContext,
	checkOllamaStatus,
	clearMvpMemory,
	deleteMvpMemoryRecord,
	getMvpMemoryStats,
	getWorkspaceRoot,
	readRecentMvpMemory,
	searchLocalWorkspace,
} from "../lib/mvp-local-ai";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";
import { buildSecurityAgentReport } from "../lib/security-agent";

function requireMvpSession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "MVP local session required");
	}
}

function buildOllamaGate(
	ollama: Awaited<ReturnType<typeof checkOllamaStatus>>,
) {
	if (ollama.status !== "up") {
		return {
			id: "ollama",
			label: "Ollama local inference",
			status: "blocked",
			detail: [
				"Ollamaはまだ起動していません。",
				"別ターミナルで `ollama serve` を起動し、必要なら `ollama pull llama3.2` を実行してください。",
				"クラウドへ逃げず、ローカルのまま復帰できます。",
			].join(" "),
		};
	}

	if (ollama.modelAvailable === false) {
		return {
			id: "ollama",
			label: "Ollama local inference",
			status: "attention",
			detail: `Ollamaは起動していますが、対象モデル ${ollama.model} が見つかりません。まず \`ollama pull ${ollama.model}\` を実行してください。`,
		};
	}

	return {
		id: "ollama",
		label: "Ollama local inference",
		status: "ready",
		detail: `Ollama is reachable. Model target: ${ollama.model}.`,
	};
}

export const mvpRoutes = new Elysia({ prefix: "/api/mvp" })
	.get("/readiness", async () => {
		const root = getWorkspaceRoot();
		const ollama = await checkOllamaStatus(1500);
		const memory = await getMvpMemoryStats({ root });
		const searchProbe = await searchLocalWorkspace("ElysiaAI MVP", {
			root,
			limit: 1,
		});

		const gates = [
			{
				id: "local-server",
				label: "Bun / Elysia local server",
				status: "ready",
				detail: "This endpoint is served by the local Bun / Elysia API.",
			},
			buildOllamaGate(ollama),
			{
				id: "rag",
				label: "Local RAG context",
				status: searchProbe.length > 0 ? "ready" : "attention",
				detail:
					searchProbe.length > 0
						? "Workspace search can return local reference snippets."
						: "Workspace search is available, but no probe result was found.",
			},
			{
				id: "memory",
				label: "Runtime memory",
				status: "ready",
				detail: memory.exists
					? `${memory.records} records in local runtime memory.`
					: "Memory file will be created on the first chat.",
			},
			{
				id: "tauri",
				label: "Tauri shell",
				status: existsSync(join(root, "src-tauri", "tauri.conf.json"))
					? "ready"
					: "blocked",
				detail: existsSync(join(root, "src-tauri", "tauri.conf.json"))
					? "Tauri configuration is present."
					: "src-tauri/tauri.conf.json is missing.",
			},
			{
				id: "security",
				label: "Security gate",
				status:
					existsSync(join(root, ".gitleaks.toml")) &&
					existsSync(join(root, ".github", "workflows", "gitleaks.yml"))
						? "ready"
						: "attention",
				detail:
					existsSync(join(root, ".gitleaks.toml")) &&
					existsSync(join(root, ".github", "workflows", "gitleaks.yml"))
						? "Gitleaks policy and workflow are present."
						: "Secret scanning policy or workflow needs review.",
			},
		];

		const blocked = gates.filter((gate) => gate.status === "blocked");
		const attention = gates.filter((gate) => gate.status === "attention");

		return {
			status:
				blocked.length > 0
					? "blocked"
					: attention.length > 0
						? "attention"
						: "ready",
			updatedAt: new Date().toISOString(),
			gates,
			ollama,
			memory,
		};
	})
	.post(
		"/search",
		async ({ request, body }) => {
			const session = requireMvpSession(request);
			if (session instanceof Response) return session;

			const query = String((body as { query?: string }).query || "").trim();
			if (!query) return jsonError(400, "Missing query");

			const results = await searchLocalWorkspace(query, {
				limit: (body as { limit?: number }).limit,
			});
			return {
				query,
				results,
			};
		},
		{
			body: t.Object({
				query: t.String({ minLength: 1, maxLength: 400 }),
				limit: t.Optional(t.Number()),
			}),
		},
	)
	.post(
		"/rag",
		async ({ request, body }) => {
			const session = requireMvpSession(request);
			if (session instanceof Response) return session;

			const query = String((body as { query?: string }).query || "").trim();
			if (!query) return jsonError(400, "Missing query");

			return await buildLocalRagContext(query, {
				limit: (body as { limit?: number }).limit,
			});
		},
		{
			body: t.Object({
				query: t.String({ minLength: 1, maxLength: 400 }),
				limit: t.Optional(t.Number()),
			}),
		},
	)
	.get("/memory", async ({ request, query }) => {
		const session = requireMvpSession(request);
		if (session instanceof Response) return session;

		const sessionId = String(query.sessionId || "mvp-local-session");
		return {
			stats: await getMvpMemoryStats(),
			recent: await readRecentMvpMemory(sessionId, { limit: 8 }),
		};
	})
	.post(
		"/memory",
		async ({ request, body }) => {
			const session = requireMvpSession(request);
			if (session instanceof Response) return session;

			const payload = body as {
				sessionId?: string;
				role?: "user" | "assistant";
				content?: string;
			};
			const content = String(payload.content || "").trim();
			if (!content) return jsonError(400, "Missing content");

			return {
				memory: await appendMvpMemory({
					sessionId: payload.sessionId || "mvp-local-session",
					role: payload.role || "user",
					content,
				}),
			};
		},
		{
			body: t.Object({
				sessionId: t.Optional(t.String()),
				role: t.Optional(t.Union([t.Literal("user"), t.Literal("assistant")])),
				content: t.String({ minLength: 1, maxLength: 4000 }),
			}),
		},
	)
	.delete(
		"/memory/:id",
		async ({ request, params, query }) => {
			const session = requireMvpSession(request);
			if (session instanceof Response) return session;

			const sessionId = String(query.sessionId || "mvp-local-session");
			const result = await deleteMvpMemoryRecord(sessionId, params.id);
			if (!result.deleted) return jsonError(404, "Memory record not found");
			return result;
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1, maxLength: 120 }),
			}),
			query: t.Object({
				sessionId: t.Optional(t.String()),
			}),
		},
	)
	.delete(
		"/memory",
		async ({ request, query }) => {
			const session = requireMvpSession(request);
			if (session instanceof Response) return session;

			const sessionId = String(query.sessionId || "mvp-local-session");
			return await clearMvpMemory(sessionId);
		},
		{
			query: t.Object({
				sessionId: t.Optional(t.String()),
			}),
		},
	)
	.get("/security-agent", async ({ request }) => {
		const session = requireMvpSession(request);
		if (session instanceof Response) return session;

		return await buildSecurityAgentReport();
	});
