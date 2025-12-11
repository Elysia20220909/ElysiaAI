/**
 * エラーハンドリングユーティリティ
 * ストリーミング、上流サービス障害、タイムアウトなどの包括的な処理
 */

import type { Response } from "elysia";
import { logger } from "./logger";

export interface ErrorResponse {
	error: string;
	code: string;
	timestamp: string;
	requestId?: string;
}

/**
 * JSONエラーレスポンスを生成
 */
export function createErrorResponse(
	status: number,
	message: string,
	code?: string,
	requestId?: string,
): Response {
	const errorBody: ErrorResponse = {
		error: message,
		code: code || `ERROR_${status}`,
		timestamp: new Date().toISOString(),
		requestId,
	};

	return new Response(JSON.stringify(errorBody), {
		status,
		headers: { "content-type": "application/json" },
	});
}

/**
 * ストリーミングエラーハンドラー
 * ストリーミング中にエラーが発生した場合の処理
 */
export async function* handleStreamingWithFallback<T>(
	streamGenerator: AsyncGenerator<T>,
	fallbackMessage: string,
): AsyncGenerator<T> {
	try {
		let hasYielded = false;
		for await (const chunk of streamGenerator) {
			hasYielded = true;
			yield chunk;
		}

		// ストリームが空だった場合
		if (!hasYielded) {
			logger.warn("ストリームが空でした。フォールバックメッセージを返します。");
			yield fallbackMessage as T;
		}
	} catch (error) {
		logger.error(
			"ストリーミング中にエラーが発生しました",
			error instanceof Error ? error : undefined,
		);

		// エラーメッセージをストリームに含める
		yield `\n\n[エラー] ${fallbackMessage}\n詳細: ${error instanceof Error ? error.message : "不明なエラー"}` as T;
	}
}

/**
 * 上流サービス（FastAPI/Ollama）の接続状態を確認
 */
export async function checkUpstreamHealth(
	url: string,
	timeout = 5000,
): Promise<{
	available: boolean;
	responseTime?: number;
	error?: string;
}> {
	const startTime = Date.now();

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		const response = await fetch(url, {
			method: "GET",
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		const responseTime = Date.now() - startTime;

		if (response.ok) {
			return { available: true, responseTime };
		}

		return {
			available: false,
			responseTime,
			error: `HTTP ${response.status}`,
		};
	} catch (error) {
		return {
			available: false,
			responseTime: Date.now() - startTime,
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * リトライロジック付きの上流サービス呼び出し
 */
export async function fetchWithRetry<T>(
	fetchFn: () => Promise<T>,
	maxRetries = 3,
	delayMs = 1000,
): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await fetchFn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			logger.warn(
				`上流サービス呼び出し失敗 (試行 ${attempt}/${maxRetries})`,
				lastError,
			);

			if (attempt < maxRetries) {
				// 指数バックオフ
				const delay = delayMs * 2 ** (attempt - 1);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError || new Error("上流サービスへの接続に失敗しました");
}

/**
 * タイムアウト付きPromise
 */
export function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	errorMessage = "タイムアウトしました",
): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
		),
	]);
}

/**
 * 長文クエリの分割処理
 * 400文字を超える場合、複数のチャンクに分割
 */
export function splitLongQuery(query: string, maxLength = 400): string[] {
	if (query.length <= maxLength) {
		return [query];
	}

	const chunks: string[] = [];
	let currentChunk = "";

	// 文で分割
	const sentences = query.split(/(?<=[。！？\n])/);

	for (const sentence of sentences) {
		if (currentChunk.length + sentence.length <= maxLength) {
			currentChunk += sentence;
		} else {
			if (currentChunk) {
				chunks.push(currentChunk.trim());
			}
			currentChunk = sentence;
		}
	}

	if (currentChunk) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
}

/**
 * グレースフルデグレード用のフォールバック応答生成
 */
export function createFallbackResponse(mode = "normal"): string {
	const fallbacks: Record<string, string> = {
		sweet: "ごめんね…今ちょっと調子が悪いみたい💦 もう一度話しかけてくれる？♡",
		normal:
			"申し訳ありません。現在サービスが一時的に利用できません。少し時間をおいて再度お試しください。",
		professional:
			"システムエラーが発生しました。技術チームに通知されています。ご不便をおかけして申し訳ございません。",
	};

	return fallbacks[mode] || fallbacks.normal;
}

/**
 * エラーの種類を判定
 */
export function categorizeError(error: unknown): {
	category: "network" | "timeout" | "upstream" | "validation" | "unknown";
	userMessage: string;
	logMessage: string;
} {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		if (message.includes("timeout") || message.includes("econnaborted")) {
			return {
				category: "timeout",
				userMessage: "処理がタイムアウトしました。もう一度お試しください。",
				logMessage: `タイムアウトエラー: ${error.message}`,
			};
		}

		if (
			message.includes("econnrefused") ||
			message.includes("network") ||
			message.includes("fetch failed")
		) {
			return {
				category: "network",
				userMessage:
					"ネットワークエラーが発生しました。接続を確認してください。",
				logMessage: `ネットワークエラー: ${error.message}`,
			};
		}

		if (message.includes("503") || message.includes("unavailable")) {
			return {
				category: "upstream",
				userMessage: "サービスが一時的に利用できません。後ほどお試しください。",
				logMessage: `上流サービスエラー: ${error.message}`,
			};
		}

		if (message.includes("validation") || message.includes("invalid")) {
			return {
				category: "validation",
				userMessage: "入力内容に問題があります。確認して再送信してください。",
				logMessage: `バリデーションエラー: ${error.message}`,
			};
		}
	}

	return {
		category: "unknown",
		userMessage: "予期しないエラーが発生しました。",
		logMessage: `不明なエラー: ${String(error)}`,
	};
}
