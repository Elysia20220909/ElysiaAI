import { existsSync, mkdirSync } from "node:fs";
import axios from "axios";
import { Elysia, t } from "elysia";
import type jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import { getPersonaConfig } from "../lib/ai-personas";
import { authErrorResponse, requireAccessToken } from "../lib/auth-cookies";
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
import {
	type OpenAIChatMessage,
	streamChatWithOpenAI,
} from "../lib/openai-integration";
import { secureVault } from "../lib/secure-vault";

const casualChat = { generateCasualResponse, getRandomTopic };
const openaiIntegration = { streamChatWithOpenAI };
const validationErrors = new Set([
	"Messages are required",
	"Too many messages",
	"Empty messages are not allowed",
	"Messages must be 400 characters or fewer",
]);

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type IncomingChatMessage = { role?: string; content?: string };
type ElysiaLoveBody = {
	messages: IncomingChatMessage[];
	mode?: string;
	sessionId?: string;
};
type FeedbackBody = {
	query?: string;
	answer?: string;
	rating?: string;
	reason?: string;
};

export function requireBearerToken(request: Request) {
	try {
		return requireAccessToken(request) as jwt.JwtPayload & {
			userId?: string;
		};
	} catch (error) {
		logger.warn("❌ [AI] Rejected auth request", {
			error: error instanceof Error ? error.message : "unknown",
		});
		throw error;
	}
}

function normalizeRole(role: string | undefined): ChatRole {
	return role === "system" || role === "assistant" || role === "user"
		? role
		: "user";
}

function validateAndSanitizeMessages(
	messages: IncomingChatMessage[],
): ChatMessage[] {
	if (!Array.isArray(messages) || messages.length === 0) {
		throw new Error("Messages are required");
	}

	if (messages.length > 8) {
		throw new Error("Too many messages");
	}

	return messages.map((message) => {
		const content = sanitizeHtml(message.content || "", {
			allowedTags: [],
			allowedAttributes: {},
		}).trim();

		if (!content) {
			throw new Error("Empty messages are not allowed");
		}

		if (content.length > 400) {
			throw new Error("Messages must be 400 characters or fewer");
		}

		if (containsDangerousKeywords(content)) {
			throw new Error("Dangerous content detected");
		}

		return {
			role: normalizeRole(message.role),
			content,
		};
	});
}

async function buildChatContext(body: ElysiaLoveBody) {
	const mode = body.mode || "normal";
	const personaContext = getPersonaConfig(mode);
	const llmConfig = {
		systemPrompt: personaContext.systemPrompt,
		temperature: personaContext.temperature,
		model: CONFIG.MODEL_NAME,
	};

	const sanitizedMessages = validateAndSanitizeMessages(body.messages);
	let enhancedSystemPrompt = llmConfig.systemPrompt;
	let fallbackCasualResponse = "今日はどんな一日でしたか？";

	if (mode === "casual" && sanitizedMessages.length > 0) {
		const lastUserMessage = sanitizedMessages[sanitizedMessages.length - 1];
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

	return {
		mode,
		llmConfig,
		fallbackCasualResponse,
		messagesWithSystem: [
			{ role: "system", content: enhancedSystemPrompt },
			...sanitizedMessages,
		] satisfies OpenAIChatMessage[],
	};
}

export async function handleElysiaLove(body: ElysiaLoveBody, request: Request) {
	logger.info("🤖 [AI] Processing elysia-love request...");

	let payload: jwt.JwtPayload & { userId?: string };
	try {
		payload = requireBearerToken(request);
	} catch (error) {
		return authErrorResponse(error);
	}

	try {
		const { mode, llmConfig, fallbackCasualResponse, messagesWithSystem } =
			await buildChatContext(body);
		const sessionId = body.sessionId || payload.userId || "default";

		if (mode === "openai") {
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
						controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
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
				headers: {
					"Content-Type": "text/event-stream",
					"x-elysia-mode": mode,
				},
			});
		}

		const upstream = await axios.post(
			`${CONFIG.FASTAPI_BASE_URL}/chat`,
			{
				messages: messagesWithSystem,
				session_id: sessionId,
				stream: true,
			},
			{
				headers: {
					"X-API-Key": CONFIG.FASTAPI_API_KEY,
					"Content-Type": "application/json",
				},
				responseType: "stream",
				timeout: CONFIG.RAG_TIMEOUT,
			},
		);

		return new Response(upstream.data, {
			status: upstream.status,
			headers: {
				"Content-Type": String(
					upstream.headers["content-type"] || "text/event-stream",
				),
				"x-elysia-mode": mode,
			},
		});
	} catch (error: any) {
		const message =
			error instanceof Error ? error.message : "FastAPI chat upstream error";

		if (message === "Dangerous content detected") {
			return jsonError(500, message);
		}

		if (validationErrors.has(message)) {
			return jsonError(400, message);
		}

		const status =
			error.response?.status || (error.code === "ECONNREFUSED" ? 503 : 500);
		logger.error(
			"🤖 [AI] Chat Error:",
			error instanceof Error ? error : undefined,
		);
		return jsonError(status, message);
	}
}

function validateFeedback(body: FeedbackBody) {
	const query = (body.query || "").trim();
	const answer = (body.answer || "").trim();
	const rating = (body.rating || "").trim();

	if (!query || !answer || !rating) {
		return "Missing feedback fields";
	}

	if (query.length > 400) {
		return "Feedback query must be 400 characters or fewer";
	}

	if (!["up", "down"].includes(rating)) {
		return "Invalid feedback rating";
	}

	return null;
}

export async function handleFeedback(body: FeedbackBody, request: Request) {
	let payload: jwt.JwtPayload & { userId?: string };
	try {
		payload = requireBearerToken(request);
	} catch (error) {
		return authErrorResponse(error);
	}

	const validationError = validateFeedback(body);
	if (validationError) {
		return jsonError(400, validationError);
	}

	if (!existsSync("data")) mkdirSync("data", { recursive: true });

	try {
		await feedbackService.create({
			userId: payload.userId || "anon",
			query: body.query!,
			answer: body.answer!,
			rating: body.rating!,
			reason: body.reason,
		});
		return { ok: true };
	} catch {
		return jsonError(500, "Failed to store feedback");
	}
}

export const aiRoutes = new Elysia({ prefix: "/api/ai" }).guard(
	{
		beforeHandle: ({ request }) => {
			try {
				requireBearerToken(request);
			} catch (error) {
				return authErrorResponse(error);
			}
		},
	},
	(app) =>
		app
			.post(
				"/elysia-love",
				({ body, request }) =>
					handleElysiaLove(body as ElysiaLoveBody, request),
				{
					body: t.Object({
						messages: t.Array(
							t.Object({ role: t.String(), content: t.String() }),
						),
						mode: t.Optional(t.String()),
						sessionId: t.Optional(t.String()),
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
						.map((line: string) => JSON.parse(line));
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
			.post(
				"/feedback",
				({ body, request }) => handleFeedback(body as FeedbackBody, request),
				{
					body: t.Object({
						query: t.String(),
						answer: t.String(),
						rating: t.String(),
						reason: t.Optional(t.String()),
					}),
				},
			)
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
						logger.error("🤖 [AI] Summary Error:", error);
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
