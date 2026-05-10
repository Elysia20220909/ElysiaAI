import { Elysia, t } from "elysia";
import { CONFIG, jsonError } from "../lib/constants";
import {
	buildLocalFallbackReply,
	createSseResponse,
	detectCoreEmotion,
	getCoreStatus,
	normalizeCoreMessages,
	touchCoreSession,
} from "../lib/elysia-core";
import {
	buildProtocolEvent,
	buildProtocolHello,
	type ChatRequestPayload,
	ELYSIA_CORE_PROTOCOL,
	type ElysiaCoreFrame,
	normalizeProtocolRequest,
} from "../lib/elysia-core-protocol";
import { authErrorResponse } from "../lib/auth-cookies";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";

function requireCoreSession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Neural auth failed");
	}
}

function coreSystemPrompt(identity: string) {
	return [
		"You are Elysia_AI_Core, the local-first conversational core inside ElysiaAI.",
		"Speak warmly and practically in Japanese unless the user asks otherwise.",
		"Respect local privacy. Do not claim real-world control over devices.",
		"Use concise bullets for long explanations.",
		`The current linked operator identity is ${identity}.`,
	].join("\n");
}

export const elysiaCoreRoutes = new Elysia()
	.get("/api/elysia-core/protocol", ({ request }) => {
		const session = requireCoreSession(request);
		if (session instanceof Response) return session;
		return {
			protocol: ELYSIA_CORE_PROTOCOL,
			hello: buildProtocolHello(session.username),
		};
	})
	.get("/api/elysia-core/status", ({ request }) => {
		const session = requireCoreSession(request);
		if (session instanceof Response) return session;
		return {
			session,
			core: getCoreStatus(),
		};
	})
	.post(
		"/api/elysia-core/chat",
		async ({ request, body }) => {
			const session = requireCoreSession(request);
			if (session instanceof Response) return session;

			try {
				const incoming = body as {
					messages?: unknown;
					sessionId?: string;
					stream?: boolean;
					protocolFrame?: ElysiaCoreFrame<ChatRequestPayload>;
				};
				const messages = normalizeCoreMessages(
					incoming.protocolFrame?.payload?.messages || incoming.messages,
				);
				const protocolRequest = normalizeProtocolRequest(
					incoming,
					session.username,
					messages,
				);
				const { sessionId, requestId } = protocolRequest;
				const lastUser =
					[...messages].reverse().find((message) => message.role === "user")
						?.content || "";
				const emotion = detectCoreEmotion(lastUser);
				const kernelMessages = [
					{ role: "system", content: coreSystemPrompt(session.username) },
					...messages,
				];

				try {
					const abort = new AbortController();
					const timeout = setTimeout(() => abort.abort(), 25000);
					const upstream = await fetch(`${CONFIG.FASTAPI_BASE_URL}/chat`, {
						method: "POST",
						headers: {
							"X-API-Key": CONFIG.FASTAPI_API_KEY,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							messages: kernelMessages,
							session_id: sessionId,
							stream: false,
						}),
						signal: abort.signal,
					});
					clearTimeout(timeout);

					if (upstream.ok) {
						const data = await upstream.json();
						const content =
							typeof data.response === "string" && data.response.trim()
								? data.response
								: "Elysia core is online, but the kernel returned an empty resonance.";
						const kernelEmotion = data.emotion || emotion;
						touchCoreSession(sessionId, session.username, 1, emotion, "kernel");
						const accepted = buildProtocolEvent(
							"chat.accepted",
							{
								requestId,
								sessionId,
								actor: "Elysia_AI_Core",
							},
							protocolRequest.sequence + 1,
							{
								mode: "kernel",
								emotion: kernelEmotion,
								protocol: ELYSIA_CORE_PROTOCOL.version,
							},
						);
						const delta = buildProtocolEvent(
							"chat.delta",
							{
								requestId,
								sessionId,
								actor: "Elysia_AI_Core",
							},
							protocolRequest.sequence + 2,
							{ content },
						);
						const complete = buildProtocolEvent(
							"chat.complete",
							{
								requestId,
								sessionId,
								actor: "Elysia_AI_Core",
							},
							protocolRequest.sequence + 3,
							{
								context: data.context || "",
								mode: "kernel",
							},
						);
						return createSseResponse(
							[
								{
									emotion: kernelEmotion,
									mode: "kernel",
									sessionId,
									requestId,
									context: data.context || "",
									protocolFrame: accepted,
								},
								{ content, protocolFrame: delta },
								{ protocolFrame: complete },
							],
							{
								"x-elysia-core-mode": "kernel",
								"x-elysia-core-protocol": ELYSIA_CORE_PROTOCOL.version,
								"x-elysia-core-request-id": requestId,
							},
						);
					}
				} catch {
					// Fall through to the local-first fallback below.
				}

				const fallback = await buildLocalFallbackReply(
					messages,
					session.username,
				);
				touchCoreSession(
					sessionId,
					session.username,
					2,
					fallback.emotion,
					"local-fallback",
				);
				const accepted = buildProtocolEvent(
					"chat.accepted",
					{ requestId, sessionId, actor: "Elysia_AI_Core" },
					protocolRequest.sequence + 1,
					{
						mode: "local-fallback",
						emotion: fallback.emotion,
						protocol: ELYSIA_CORE_PROTOCOL.version,
					},
				);
				const delta = buildProtocolEvent(
					"chat.delta",
					{ requestId, sessionId, actor: "Elysia_AI_Core" },
					protocolRequest.sequence + 2,
					{ content: fallback.content },
				);
				const complete = buildProtocolEvent(
					"chat.complete",
					{ requestId, sessionId, actor: "Elysia_AI_Core" },
					protocolRequest.sequence + 3,
					{ mode: "local-fallback" },
				);

				return createSseResponse(
					[
						{
							emotion: fallback.emotion,
							mode: "local-fallback",
							sessionId,
							requestId,
							protocolFrame: accepted,
						},
						{ content: fallback.content, protocolFrame: delta },
						{ protocolFrame: complete },
					],
					{
						"x-elysia-core-mode": "local-fallback",
						"x-elysia-core-protocol": ELYSIA_CORE_PROTOCOL.version,
						"x-elysia-core-request-id": requestId,
					},
				);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Elysia core chat failed";
				if (
					message === "Messages are required" ||
					message === "Too many messages" ||
					message === "Empty messages are not allowed" ||
					message.startsWith("Protocol ")
				) {
					return jsonError(400, message);
				}
				return jsonError(500, message);
			}
		},
		{
			body: t.Object({
				messages: t.Optional(
					t.Array(
						t.Object({
							role: t.String(),
							content: t.String(),
						}),
					),
				),
				sessionId: t.Optional(t.String()),
				stream: t.Optional(t.Boolean()),
				protocolFrame: t.Optional(t.Any()),
			}),
		},
	);
