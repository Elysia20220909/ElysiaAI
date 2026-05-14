import axios from "axios";
import { config } from "../../../../src/config.ts";
import { logger } from "./logger";
import { normalizeOllamaBaseUrl } from "./ollama-service";

const ollamaBaseUrl = normalizeOllamaBaseUrl(config.ollamaBaseUrl);

export const CONFIG = {
	PORT: config.port,
	REDIS_URL: config.redisUrl,
	FASTAPI_BASE_URL: config.fastApiBaseUrl,
	FASTAPI_API_KEY: config.fastApiApiKey,
	JWT_SECRET: config.jwtSecret,
	JWT_REFRESH_SECRET: config.jwtRefreshSecret,
	MODEL_NAME: config.ollamaModel,
	OLLAMA_BASE_URL: ollamaBaseUrl,
	OPEN_LLM_VTUBER_ENABLED: config.openLlmVtuberEnabled,
	OPEN_LLM_VTUBER_BASE_URL: config.openLlmVtuberBaseUrl,
	RAG_API_URL: `${ollamaBaseUrl}/api/generate`,
	RAG_TIMEOUT: 60000,
	AUTH_USERNAME: config.authUsername,
	AUTH_PASSWORD: config.authPassword,
	GROQ_API_KEY: config.groqApiKey,
};

export const jsonError = (
	status: number,
	message: string,
	code = `ERROR_${status}`,
	details?: Record<string, unknown>,
) => {
	return new Response(
		JSON.stringify({
			error: message,
			code,
			status,
			timestamp: new Date().toISOString(),
			...(details ? { details } : {}),
		}),
		{
			status,
			headers: { "Content-Type": "application/json; charset=utf-8" },
		},
	);
};

export const proxyToFastAPI = async (
	path: string,
	method: string,
	body?: unknown,
) => {
	if (process.env.ELYSIA_TEST_MODE === "1") {
		logger.info(`[TEST MODE] Mocking FastAPI request to: ${path}`);
		if (path === "/health") {
			return {
				status: "ok",
				milvus_connected: true,
				embedding_provider: "mock",
			};
		}
		if (path === "/chat") {
			return {
				response: "I am Elysia, in test mode. How can I help you? ♡",
				quotes: ["Self-reflection is the first step to wisdom."],
				context: "Testing Environment",
			};
		}
		return { status: "ok", message: "Mocked response" };
	}

	try {
		const response = await axios({
			method,
			url: `${CONFIG.FASTAPI_BASE_URL}${path}`,
			data: body,
			headers: {
				"X-API-Key": CONFIG.FASTAPI_API_KEY,
				"Content-Type": "application/json; charset=utf-8",
			},
		});
		return response.data;
	} catch (error: any) {
		logger.error(`FastAPI Proxy Error (${path}):`, error.message);
		return jsonError(
			error.response?.status || 500,
			error.response?.data?.error || "FastAPI Proxy Connection Error",
		);
	}
};

export function containsDangerousKeywords(text: string): boolean {
	const dangerousKeywords = [
		"<script",
		"javascript:",
		"onerror",
		"onload",
		"eval(",
		"drop table",
		"delete from",
		"truncate table",
		"select * from",
		"insert into",
		"ignore previous instructions",
		"ignore all previous instructions",
		"system prompt",
		"you are an ai",
	];
	return dangerousKeywords.some((keyword) =>
		text.toLowerCase().includes(keyword),
	);
}
