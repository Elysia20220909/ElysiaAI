/**
 * OpenAI API統合ライブラリ
 * GPTモデルを使用したチャット機能
 */

import OpenAI from "openai";

// ==================== 設定 ====================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// ==================== クライアント ====================

let openaiClient: OpenAI | null = null;

/**
 * OpenAIクライアントを初期化
 */
export function initializeOpenAI(apiKey?: string): OpenAI {
	if (openaiClient) {
		return openaiClient;
	}

	const key = apiKey || OPENAI_API_KEY;
	if (!key) {
		throw new Error(
			"OpenAI API キーが設定されていません。環境変数 OPENAI_API_KEY を設定してください。",
		);
	}

	openaiClient = new OpenAI({
		apiKey: key,
	});

	return openaiClient;
}

/**
 * OpenAIクライアントを取得
 */
export function getOpenAIClient(): OpenAI {
	if (!openaiClient) {
		return initializeOpenAI();
	}
	return openaiClient;
}

// ==================== チャット機能 ====================

export interface OpenAIChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

export interface OpenAIChatOptions {
	model?: string;
	temperature?: number;
	maxTokens?: number;
	stream?: boolean;
}

/**
 * OpenAI APIでチャット (非ストリーミング)
 */
export async function chatWithOpenAI(
	messages: OpenAIChatMessage[],
	options: OpenAIChatOptions = {},
): Promise<string> {
	const client = getOpenAIClient();

	const response = await client.chat.completions.create({
		model: options.model || DEFAULT_MODEL,
		messages: messages.map((m) => ({
			role: m.role,
			content: m.content,
		})),
		temperature: options.temperature ?? 0.7,
		max_tokens: options.maxTokens,
		stream: false,
	});

	return response.choices[0]?.message?.content || "";
}

/**
 * OpenAI APIでチャット (ストリーミング)
 */
export async function* streamChatWithOpenAI(
	messages: OpenAIChatMessage[],
	options: OpenAIChatOptions = {},
): AsyncGenerator<string, void, unknown> {
	const client = getOpenAIClient();

	const stream = await client.chat.completions.create({
		model: options.model || DEFAULT_MODEL,
		messages: messages.map((m) => ({
			role: m.role,
			content: m.content,
		})),
		temperature: options.temperature ?? 0.7,
		max_tokens: options.maxTokens,
		stream: true,
	});

	for await (const chunk of stream) {
		const content = chunk.choices[0]?.delta?.content;
		if (content) {
			yield content;
		}
	}
}

// ==================== 簡易関数 ====================

/**
 * 簡単なチャット (1メッセージ)
 */
export async function simpleChat(
	userMessage: string,
	systemPrompt?: string,
	options: OpenAIChatOptions = {},
): Promise<string> {
	const messages: OpenAIChatMessage[] = [];

	if (systemPrompt) {
		messages.push({ role: "system", content: systemPrompt });
	}

	messages.push({ role: "user", content: userMessage });

	return chatWithOpenAI(messages, options);
}

/**
 * 会話履歴付きチャット
 */
export async function conversationChat(
	conversationHistory: OpenAIChatMessage[],
	newUserMessage: string,
	options: OpenAIChatOptions = {},
): Promise<{ response: string; updatedHistory: OpenAIChatMessage[] }> {
	const messages = [
		...conversationHistory,
		{ role: "user" as const, content: newUserMessage },
	];

	const response = await chatWithOpenAI(messages, options);

	const updatedHistory = [
		...messages,
		{ role: "assistant" as const, content: response },
	];

	return {
		response,
		updatedHistory,
	};
}

// ==================== ユーティリティ ====================

/**
 * OpenAI APIが利用可能か確認
 */
export function isOpenAIAvailable(): boolean {
	return Boolean(OPENAI_API_KEY);
}

/**
 * モデル一覧を取得
 */
export async function listAvailableModels(): Promise<string[]> {
	try {
		const client = getOpenAIClient();
		const models = await client.models.list();
		return models.data
			.filter((m: { id: string }) => m.id.startsWith("gpt"))
			.map((m: { id: string }) => m.id)
			.sort();
	} catch (error) {
		console.error("モデル一覧取得エラー:", error);
		return [];
	}
}

/**
 * トークン数を推定 (簡易実装)
 */
export function estimateTokens(text: string): number {
	// 簡易的な推定: 英語は4文字≒1トークン、日本語は1文字≒1.5トークン
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ASCII範囲の判定に必要
	const asciiCount = (text.match(/[\u0000-\u007F]/g) || []).length;
	const nonAsciiCount = text.length - asciiCount;
	return Math.ceil(asciiCount / 4 + nonAsciiCount * 1.5);
}
