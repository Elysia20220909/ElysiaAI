import { generateCasualResponse } from "./casual-chat";
import { ELYSIA_CORE_PROTOCOL } from "./elysia-core-protocol";

export type CoreEmotion =
	| "neutral"
	| "joy"
	| "affection"
	| "exhaustion"
	| "loneliness"
	| "focused";

export type CoreMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

export type CoreSession = {
	id: string;
	owner: string;
	startedAt: string;
	updatedAt: string;
	messageCount: number;
	emotion: CoreEmotion;
	mode: "kernel" | "local-fallback";
};

const sessions = new Map<string, CoreSession>();

export function normalizeCoreMessages(messages: unknown): CoreMessage[] {
	if (!Array.isArray(messages) || messages.length === 0) {
		throw new Error("Messages are required");
	}

	if (messages.length > 12) {
		throw new Error("Too many messages");
	}

	return messages.map((message: any) => {
		const role =
			message?.role === "system" ||
			message?.role === "assistant" ||
			message?.role === "user"
				? message.role
				: "user";
		const content = String(message?.content || "")
			.trim()
			.slice(0, 1200);
		if (!content) throw new Error("Empty messages are not allowed");
		return { role, content };
	});
}

export function detectCoreEmotion(text: string): CoreEmotion {
	const lower = text.toLowerCase();
	if (/[嬉楽幸]|ありがとう|最高|love|thanks/.test(lower)) return "joy";
	if (/好き|会いた|寂|さみ|lonely/.test(lower)) return "affection";
	if (/疲|しんど|眠|exhaust|tired/.test(lower)) return "exhaustion";
	if (/集中|実装|コード|設計|debug|fix|build/.test(lower)) return "focused";
	return "neutral";
}

export function touchCoreSession(
	sessionId: string,
	owner: string,
	messageCount: number,
	emotion: CoreEmotion,
	mode: CoreSession["mode"],
) {
	const now = new Date().toISOString();
	const current = sessions.get(sessionId);
	const session: CoreSession = {
		id: sessionId,
		owner,
		startedAt: current?.startedAt || now,
		updatedAt: now,
		messageCount: (current?.messageCount || 0) + messageCount,
		emotion,
		mode,
	};
	sessions.set(sessionId, session);
	return session;
}

export function getCoreStatus() {
	const activeSessions = [...sessions.values()]
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, 8);

	return {
		status: "online",
		name: "Elysia_AI_Core",
		capabilities: [
			"authenticated neural chat",
			"FastAPI/Ollama streaming bridge",
			"local-first fallback conversation",
			"session telemetry",
			"emotion signal",
			"signed Elysia Core Protocol frames",
		],
		protocol: ELYSIA_CORE_PROTOCOL.version,
		activeSessions,
		updatedAt: new Date().toISOString(),
	};
}

export async function buildLocalFallbackReply(
	messages: CoreMessage[],
	identity: string,
) {
	const lastUser =
		[...messages].reverse().find((message) => message.role === "user")
			?.content || "";
	const casual = await generateCasualResponse(lastUser);
	const emotion = detectCoreEmotion(`${lastUser}\n${casual}`);

	return {
		emotion,
		content: [
			`${identity}、いまはローカル中核で応答しています。`,
			casual,
			"必要なら、この会話をもとに次の一手まで一緒に整えます。",
		].join("\n"),
	};
}

export function createSseResponse(
	events: Array<Record<string, unknown>>,
	headers: Record<string, string> = {},
) {
	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			for (const event of events) {
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
				);
			}
			controller.enqueue(encoder.encode("data: [DONE]\n\n"));
			controller.close();
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream; charset=utf-8",
			"Cache-Control": "no-cache",
			...headers,
		},
	});
}
