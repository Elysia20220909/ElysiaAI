/**
 * マルチモデルアンサンブルシステム
 * 複数のLLMを並列実行し、最良の回答を自動選択
 */

import { logger } from "./logger";

// モデル設定型
export type ModelConfig = {
	name: string;
	endpoint: string;
	apiKey?: string;
	timeout: number;
	weight: number; // 評価時の重み
	enabled: boolean;
};

// アンサンブル応答型
export type EnsembleResponse = {
	selectedModel: string;
	selectedResponse: string;
	confidence: number;
	allResponses: ModelResponse[];
	executionTimeMs: number;
	strategy: "quality" | "speed" | "consensus";
};

// 各モデルの応答型
export type ModelResponse = {
	model: string;
	response: string;
	latencyMs: number;
	qualityScore: number;
	error?: string;
	metadata?: {
		tokens?: number;
		cost?: number;
	};
};

// 品質評価基準
type QualityMetrics = {
	length: number;
	sentiment: number;
	coherence: number;
	relevance: number;
};

export class MultiModelEnsemble {
	private models: ModelConfig[] = [];
	private historyCache = new Map<string, EnsembleResponse>();
	private performanceStats = new Map<string, { success: number; total: number; avgLatency: number }>();

	constructor() {
		this.initializeModels();
	}

	/**
	 * デフォルトモデル設定を初期化
	 */
	private initializeModels() {
		const primaryEndpoint = process.env.RAG_API_URL || "http://localhost:8000";
		const secondaryEndpoint = process.env.SECONDARY_MODEL_ENDPOINT || "";
		const tertiaryEndpoint = process.env.TERTIARY_MODEL_ENDPOINT || "";

		this.models = [
			{
				name: "primary-ollama",
				endpoint: `${primaryEndpoint}/chat`,
				timeout: 30000,
				weight: 1.2,
				enabled: true,
			},
		];

		if (secondaryEndpoint) {
			this.models.push({
				name: "secondary-model",
				endpoint: secondaryEndpoint,
				apiKey: process.env.SECONDARY_MODEL_API_KEY,
				timeout: 25000,
				weight: 1.0,
				enabled: true,
			});
		}

		if (tertiaryEndpoint) {
			this.models.push({
				name: "tertiary-model",
				endpoint: tertiaryEndpoint,
				apiKey: process.env.TERTIARY_MODEL_API_KEY,
				timeout: 20000,
				weight: 0.8,
				enabled: true,
			});
		}

		logger.info("Multi-model ensemble initialized", {
			totalModels: this.models.length,
			enabledModels: this.models.filter((m) => m.enabled).length,
		});
	}

	/**
	 * アンサンブル実行（複数モデルを並列実行）
	 */
	async execute(
		query: string,
		strategy: "quality" | "speed" | "consensus" = "quality",
		options?: {
			timeout?: number;
			minModels?: number;
			useCache?: boolean;
		}
	): Promise<EnsembleResponse> {
		const startTime = Date.now();
		const cacheKey = `${query}:${strategy}`;

		// キャッシュチェック
		if (options?.useCache && this.historyCache.has(cacheKey)) {
			logger.info("Returning cached ensemble response", { query });
			return this.historyCache.get(cacheKey)!;
		}

		const enabledModels = this.models.filter((m) => m.enabled);
		if (enabledModels.length === 0) {
			throw new Error("No enabled models for ensemble execution");
		}

		logger.info("Starting ensemble execution", {
			query: query.substring(0, 50),
			strategy,
			modelsCount: enabledModels.length,
		});

		// 並列実行
		const promises = enabledModels.map((model) =>
			this.executeModel(model, query, options?.timeout)
		);

		// 全モデルの結果を待つ（失敗は無視）
		const results = await Promise.allSettled(promises);
		const responses: ModelResponse[] = [];

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (result.status === "fulfilled") {
				responses.push(result.value);
				this.updateStats(enabledModels[i].name, true, result.value.latencyMs);
			} else {
				logger.warn("Model execution failed", {
					model: enabledModels[i].name,
					error: result.reason,
				});
				responses.push({
					model: enabledModels[i].name,
					response: "",
					latencyMs: 0,
					qualityScore: 0,
					error: String(result.reason),
				});
				this.updateStats(enabledModels[i].name, false, 0);
			}
		}

		// 最低限のモデル数チェック
		const validResponses = responses.filter((r) => !r.error);
		const minRequired = options?.minModels || 1;
		if (validResponses.length < minRequired) {
			throw new Error(
				`Insufficient valid responses: ${validResponses.length}/${minRequired}`
			);
		}

		// 戦略に基づいて最良の回答を選択
		const selected = this.selectBestResponse(responses, strategy);
		const executionTime = Date.now() - startTime;

		const ensembleResponse: EnsembleResponse = {
			selectedModel: selected.model,
			selectedResponse: selected.response,
			confidence: selected.qualityScore,
			allResponses: responses,
			executionTimeMs: executionTime,
			strategy,
		};

		// キャッシュに保存（最大100件）
		if (options?.useCache !== false) {
			if (this.historyCache.size >= 100) {
				const firstKey = this.historyCache.keys().next().value;
				this.historyCache.delete(firstKey);
			}
			this.historyCache.set(cacheKey, ensembleResponse);
		}

		logger.info("Ensemble execution completed", {
			selectedModel: selected.model,
			confidence: selected.qualityScore.toFixed(2),
			totalTime: executionTime,
			validResponses: validResponses.length,
		});

		return ensembleResponse;
	}

	/**
	 * 単一モデルを実行
	 */
	private async executeModel(
		model: ModelConfig,
		query: string,
		timeout?: number
	): Promise<ModelResponse> {
		const startTime = Date.now();
		const effectiveTimeout = timeout || model.timeout;

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

			const response = await fetch(model.endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(model.apiKey && { Authorization: `Bearer ${model.apiKey}` }),
				},
				body: JSON.stringify({
					query,
					mode: "normal",
				}),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			const responseText = data.response || data.content || data.message || "";
			const latency = Date.now() - startTime;

			// 品質スコア計算
			const qualityScore = this.calculateQualityScore(responseText, query, model.weight);

			return {
				model: model.name,
				response: responseText,
				latencyMs: latency,
				qualityScore,
				metadata: {
					tokens: data.tokens,
					cost: data.cost,
				},
			};
		} catch (error) {
			const latency = Date.now() - startTime;
			logger.error("Model execution error", {
				model: model.name,
				error: String(error),
				latency,
			});
			throw error;
		}
	}

	/**
	 * 回答品質スコアを計算
	 */
	private calculateQualityScore(
		response: string,
		query: string,
		modelWeight: number
	): number {
		const metrics = this.analyzeQuality(response, query);

		// 各メトリクスに重み付け
		const lengthScore = Math.min(metrics.length / 500, 1.0) * 0.2;
		const sentimentScore = metrics.sentiment * 0.3;
		const coherenceScore = metrics.coherence * 0.3;
		const relevanceScore = metrics.relevance * 0.2;

		const baseScore = lengthScore + sentimentScore + coherenceScore + relevanceScore;
		const finalScore = baseScore * modelWeight;

		return Math.min(Math.max(finalScore, 0), 1);
	}

	/**
	 * テキスト品質を分析
	 */
	private analyzeQuality(response: string, query: string): QualityMetrics {
		// 長さ評価
		const length = response.length;

		// 感情評価（ポジティブキーワード）
		const positiveWords = ["素晴らしい", "excellent", "great", "はい", "できます", "可能"];
		const negativeWords = ["できません", "無理", "error", "failed"];
		let sentiment = 0.5;

		positiveWords.forEach((word) => {
			if (response.toLowerCase().includes(word.toLowerCase())) sentiment += 0.1;
		});
		negativeWords.forEach((word) => {
			if (response.toLowerCase().includes(word.toLowerCase())) sentiment -= 0.1;
		});
		sentiment = Math.min(Math.max(sentiment, 0), 1);

		// 一貫性評価（句読点、構造）
		const sentences = response.split(/[。.!?]/);
		const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
		const coherence = avgSentenceLength > 10 && avgSentenceLength < 200 ? 0.8 : 0.5;

		// 関連性評価（クエリキーワードとのマッチ）
		const queryWords = query.toLowerCase().split(/\s+/);
		const matchCount = queryWords.filter((word) =>
			response.toLowerCase().includes(word)
		).length;
		const relevance = Math.min(matchCount / queryWords.length, 1);

		return { length, sentiment, coherence, relevance };
	}

	/**
	 * 戦略に基づいて最良の回答を選択
	 */
	private selectBestResponse(
		responses: ModelResponse[],
		strategy: "quality" | "speed" | "consensus"
	): ModelResponse {
		const validResponses = responses.filter((r) => !r.error && r.response.length > 0);

		if (validResponses.length === 0) {
			throw new Error("No valid responses to select from");
		}

		switch (strategy) {
			case "quality":
				// 品質スコアが最も高いものを選択
				return validResponses.reduce((best, current) =>
					current.qualityScore > best.qualityScore ? current : best
				);

			case "speed":
				// 最も速いものを選択
				return validResponses.reduce((best, current) =>
					current.latencyMs < best.latencyMs ? current : best
				);

			case "consensus":
				// 複数の回答の共通部分を抽出（簡易版）
				if (validResponses.length === 1) {
					return validResponses[0];
				}
				// 最も長い回答をベースに
				const longest = validResponses.reduce((best, current) =>
					current.response.length > best.response.length ? current : best
				);
				return longest;

			default:
				return validResponses[0];
		}
	}

	/**
	 * パフォーマンス統計を更新
	 */
	private updateStats(modelName: string, success: boolean, latency: number) {
		const stats = this.performanceStats.get(modelName) || {
			success: 0,
			total: 0,
			avgLatency: 0,
		};

		stats.total++;
		if (success) stats.success++;
		stats.avgLatency = (stats.avgLatency * (stats.total - 1) + latency) / stats.total;

		this.performanceStats.set(modelName, stats);
	}

	/**
	 * パフォーマンス統計を取得
	 */
	getStats() {
		const stats: Array<{
			model: string;
			successRate: number;
			avgLatencyMs: number;
			totalRequests: number;
		}> = [];

		for (const [model, data] of this.performanceStats.entries()) {
			stats.push({
				model,
				successRate: data.success / data.total,
				avgLatencyMs: Math.round(data.avgLatency),
				totalRequests: data.total,
			});
		}

		return stats;
	}

	/**
	 * モデル設定を更新
	 */
	updateModelConfig(modelName: string, updates: Partial<ModelConfig>) {
		const model = this.models.find((m) => m.name === modelName);
		if (model) {
			Object.assign(model, updates);
			logger.info("Model config updated", { modelName, updates });
		}
	}

	/**
	 * すべてのモデル設定を取得
	 */
	getModels() {
		return this.models;
	}
}

// シングルトンインスタンス
export const multiModelEnsemble = new MultiModelEnsemble();
