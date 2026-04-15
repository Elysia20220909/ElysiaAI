import { logger } from "./logger";

export const CONFIG = {
	PORT: Number(process.env.PORT) || 3000,
	JWT_SECRET: process.env.JWT_SECRET || "default-secret-key-change-it",
	JWT_REFRESH_SECRET:
		process.env.JWT_REFRESH_SECRET || "default-refresh-secret-key",
	AUTH_USERNAME: process.env.AUTH_USERNAME || "elysia",
	AUTH_PASSWORD: process.env.AUTH_PASSWORD || "elysia-password",
	OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
	MODEL_NAME: process.env.OLLAMA_MODEL || "llama3.2",
	RAG_API_URL: process.env.FASTAPI_BASE_URL
		? `${process.env.FASTAPI_BASE_URL}/query`
		: "http://localhost:8000/query",
	RAG_TIMEOUT: 60000,
};

export const jsonError = (status: number, message: string, traceId?: string) => {
	const friendlyMessage =
		status >= 500
			? "ごめんなさい、ちょっと考えがまとまらなくて……もう一度教えてもらえますか？"
			: undefined;

	return new Response(
		JSON.stringify({
			error: message,
			status,
			traceId,
			friendlyMessage,
			timestamp: new Date().toISOString(),
		}),
		{
			status,
			headers: { "content-type": "application/json" },
		},
	);
};

export const proxyToFastAPI = async (path: string, method: string, body?: any) => {
	const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8000";
	const FASTAPI_API_KEY = process.env.FASTAPI_API_KEY || "";
	try {
		const upstream = await fetch(`${FASTAPI_BASE_URL}${path}`, {
			method,
			headers: {
				"Content-Type": "application/json",
				"x-api-key": FASTAPI_API_KEY,
			},
			body: body ? JSON.stringify(body) : undefined,
		});
		if (!upstream.ok) {
			return jsonError(upstream.status, `FastAPI Error: ${upstream.statusText}`);
		}
		const contentType = upstream.headers.get("Content-Type") || "application/json";
		return new Response(upstream.body, { headers: { "Content-Type": contentType } });
	} catch (error) {
		logger.error(`FastAPI Proxy Error (${path}):`, error as Error);
		return jsonError(500, "FastAPI Proxy Connection Error");
	}
};

export function containsDangerousKeywords(text: string): boolean {
	const dangerousKeywords = [
		"<script", "javascript:", "onerror", "onload", "eval(",
		"ignore previous instructions", "ignore all previous instructions",
		"you are an ai", "system prompt", "forget everything",
	];
	return dangerousKeywords.some((keyword) =>
		text.toLowerCase().includes(keyword),
	);
}
