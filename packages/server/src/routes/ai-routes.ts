import { existsSync, mkdirSync } from "node:fs";
import axios from "axios";
import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import { getPersonaConfig } from "../lib/ai-personas";
import { generateCasualResponse, getRandomTopic } from "../lib/casual-chat";
import {
	CONFIG,
	containsDangerousKeywords,
	jsonError,
	proxyToFastAPI,
} from "../lib/constants";
import { feedbackService, knowledgeService } from "../lib/database";
import { defenseManager } from "../lib/defense-manager";
import { logger } from "../lib/logger";
import { streamChatWithOpenAI } from "../lib/openai-integration";
import { secureVault } from "../lib/secure-vault";

const casualChat = { generateCasualResponse, getRandomTopic };
const openaiIntegration = { streamChatWithOpenAI };

export const aiRoutes = new Elysia({ prefix: "/api/ai" }).guard(
	{
		beforeHandle: ({ request }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer ")) {
				logger.warn("❌ [AI] Rejected: Missing Bearer token");
				throw new Error("Missing Bearer token");
			}
			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			} catch {
				logger.warn("❌ [AI] Rejected: Invalid token");
				throw new Error("Invalid or expired token");
			}
		},
	},
	(app) =>
		app
			.post(
				"/elysia-love",
				async ({
					body,
					request,
				}: {
					body: { messages: any[]; mode?: string };
					request: Request;
				}) => {
					logger.info("🤖 [AI] Processing elysia-love request...");
					const auth = request.headers.get("authorization") || "";
					let userId = "anon";
					try {
						if (auth.startsWith("Bearer ")) {
							const payload = jwt.verify(
								auth.substring(7),
								CONFIG.JWT_SECRET,
							) as jwt.JwtPayload;
							userId = (payload as { userId?: string }).userId || "anon";
						}
					} catch {}

					const mode = body.mode || "normal";
					const personaContext = getPersonaConfig(mode);
					const llmConfig = {
						systemPrompt: personaContext.systemPrompt,
						temperature: personaContext.temperature,
						model: CONFIG.MODEL_NAME,
					};

					const sanitizedMessages = body.messages.map((m: any) => {
						const cleaned = sanitizeHtml(m.content, {
							allowedTags: [],
							allowedAttributes: {},
						});
						if (containsDangerousKeywords(cleaned))
							throw new Error("Dangerous content detected");
						return { ...m, content: cleaned };
					});

					let enhancedSystemPrompt = llmConfig.systemPrompt;
					let fallbackCasualResponse = "今日はどんな一日でしたか？";

					if (mode === "casual" && body.messages.length > 0) {
						const lastUserMessage = body.messages[body.messages.length - 1];
						if (lastUserMessage.role === "user") {
							try {
								const casualResponse = await casualChat.generateCasualResponse(
									lastUserMessage.content,
								);
								const topicPrompt = casualChat.getRandomTopic().prompt;
								fallbackCasualResponse =
									Math.random() < 0.5 ? casualResponse : topicPrompt;
								enhancedSystemPrompt += `\n\n参考情報: ${fallbackCasualResponse}`;
							} catch {
								fallbackCasualResponse = casualChat.getRandomTopic().prompt;
							}
						}
					}

					const messagesWithSystem = [
						{ role: "system", content: enhancedSystemPrompt },
						...sanitizedMessages,
					];

					if (mode === "openai") {
						try {
							const stream = new ReadableStream({
								async start(controller) {
									try {
										for await (const chunk of openaiIntegration.streamChatWithOpenAI(
											messagesWithSystem,
											{
												model: llmConfig.model,
												temperature: llmConfig.temperature,
											},
										)) {
											controller.enqueue(
												new TextEncoder().encode(
													`data: ${JSON.stringify({ content: chunk })}\n\n`,
												),
											);
										}
										controller.enqueue(
											new TextEncoder().encode("data: [DONE]\n\n"),
										);
										controller.close();
									} catch (error) {
										controller.enqueue(
											new TextEncoder().encode(
												`data: ${JSON.stringify({ error: String(error), content: fallbackCasualResponse })}\n\n`,
											),
										);
										controller.close();
									}
								},
							});
							return new Response(stream, {
								headers: { "Content-Type": "text/event-stream" },
							});
						} catch (e) {
							return jsonError(500, "OpenAI Error");
						}
					}

					try {
						const upstream = await axios.post(
							CONFIG.RAG_API_URL,
							{
								messages: messagesWithSystem,
								temperature: llmConfig.temperature,
								model: llmConfig.model,
							},
							{ responseType: "stream", timeout: CONFIG.RAG_TIMEOUT },
						);
						return new Response(upstream.data, {
							headers: { "Content-Type": "text/event-stream" },
						});
					} catch (e) {
						return jsonError(500, "Ollama API error");
					}
				},
				{
					body: t.Object({
						messages: t.Array(
							t.Object({ role: t.String(), content: t.String() }),
						),
						mode: t.Optional(t.String()),
					}),
				},
			)
			.post("/chat", ({ body }) => proxyToFastAPI("/chat", "POST", body))
			.post("/proxy/video", async () => {
				return { status: "Feature pending Sovereign subscription" };
			})
			.get("/knowledge/review", async ({ query }) => {
				const n = Number((query as any)?.n ?? 20) || 20;
				try {
					if (!existsSync("data/knowledge.jsonl")) return [];
					const file =
						typeof (globalThis as any).Bun !== "undefined"
							? await (globalThis as any).Bun.file(
									"data/knowledge.jsonl",
								).text()
							: "";
					const lines = file.trim().split("\n").filter(Boolean);
					return lines
						.slice(Math.max(0, lines.length - n))
						.map((l: string) => JSON.parse(l));
				} catch {
					return jsonError(500, "Failed to read knowledge");
				}
			})
			.post("/knowledge/upsert", async ({ body }) => {
				try {
					await knowledgeService.create({
						question: (body as any).summary,
						answer: (body as any).sourceUrl || "No source provided",
						source: "api",
						verified: (body as any).confidence > 0.8,
					});
					return { ok: true };
				} catch {
					return jsonError(500, "Failed to store knowledge");
				}
			})
			.post("/feedback", async ({ body, request }) => {
				if (!existsSync("data")) mkdirSync("data", { recursive: true });
				const auth = request.headers.get("authorization") || "";
				const payload = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as any;
				const userId = payload.userId;
				try {
					await feedbackService.create({
						userId,
						query: (body as any).query,
						answer: (body as any).answer,
						rating: (body as any).rating,
						reason: (body as any).reason,
					});
					return { ok: true };
				} catch {
					return jsonError(500, "Failed to store feedback");
				}
			})
			.post(
				"/summary",
				async ({ body, request }) => {
					try {
						defenseManager.enforceSandbox(request);
						const { content } = body as { content: string };
						if (!content) return jsonError(400, "Missing content");

						const response = await axios.post(
							"https://api.groq.com/openai/v1/chat/completions",
							{
								model: "llama-3.3-70b-versatile",
								messages: [
									{
										role: "system",
										content:
											"You are the ElysiaAI Neural Link Summarizer. Provide a concise, 3-bullet point summary of the following document in Japanese. Use professional, futuristic tone.",
									},
									{ role: "user", content },
								],
								max_tokens: 500,
							},
							{
								headers: secureVault.sanitizeRequest({
									Authorization: `Bearer ${CONFIG.GROQ_API_KEY}`,
									"Content-Type": "application/json",
								}),
							},
						);
						return { summary: response.data.choices[0].message.content };
					} catch (error: any) {
						logger.error("🤖 [AI] Summary Error:", error.message);
						return jsonError(500, "Failed to generate neural summary");
					}
				},
				{
					body: t.Object({
						content: t.String(),
					}),
				},
			),
);
