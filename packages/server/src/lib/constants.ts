import axios from "axios";
import { t } from "elysia";
import { logger } from "./logger";

export const CONFIG = {
	PORT: process.env.PORT || 3000,
	FASTAPI_BASE_URL: process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8000",
	FASTAPI_API_KEY: process.env.FASTAPI_API_KEY || "",
	JWT_SECRET: process.env.JWT_SECRET || "elysia-sovereign-secret",
	JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "elysia-refresh-secret",
	MODEL_NAME: process.env.MODEL_NAME || "elysia-v2",
	RAG_API_URL: process.env.RAG_API_URL || "http://localhost:11434/api/generate",
	RAG_TIMEOUT: 60000,
	AUTH_USERNAME: process.env.AUTH_USERNAME || "admin",
	AUTH_PASSWORD: process.env.AUTH_PASSWORD || "elysiatest-001",
	GROQ_API_KEY: process.env.GROQ_API_KEY || "",
};

export const jsonError = (status: number, message: string) => {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { "Content-Type": "application/json" },
	});
};

export const proxyToFastAPI = async (
	path: string,
	method: string,
	body?: unknown,
) => {
	try {
		const response = await axios({
			method,
			url: `${CONFIG.FASTAPI_BASE_URL}${path}`,
			data: body,
			headers: {
				"X-API-Key": CONFIG.FASTAPI_API_KEY,
				"Content-Type": "application/json",
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
		"ignore previous instructions",
		"ignore all previous instructions",
		"you are an ai",
	];
	return dangerousKeywords.some((keyword) =>
		text.toLowerCase().includes(keyword),
	);
}
