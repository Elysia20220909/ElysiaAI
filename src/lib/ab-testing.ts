/**
 * A/B Testing System
 * プロンプト・モード・品質のA/Bテスト
 */

import { logger } from "./logger";

interface ABTestVariant {
	id: string;
	name: string;
	weight: number; // 0-100の確率
	config: Record<string, unknown>;
}

interface ABTest {
	id: string;
	name: string;
	description: string;
	variants: ABTestVariant[];
	active: boolean;
	startDate: Date;
	endDate?: Date;
	metrics: {
		impressions: Map<string, number>;
		conversions: Map<string, number>;
		averageRating: Map<string, number[]>;
	};
}

class ABTestManager {
	private tests: Map<string, ABTest>;
	private userAssignments: Map<string, Map<string, string>>; // userId -> testId -> variantId

	constructor() {
		this.tests = new Map();
		this.userAssignments = new Map();
		this.initializeDefaultTests();
	}

	/**
	 * デフォルトのA/Bテストを初期化
	 */
	private initializeDefaultTests() {
		// プロンプトスタイルのテスト
		this.createTest({
			id: "prompt-style",
			name: "プロンプトスタイルテスト",
			description: "異なるプロンプトスタイルの効果を測定",
			variants: [
				{
					id: "original",
					name: "オリジナル",
					weight: 50,
					config: { style: "original" },
				},
				{
					id: "detailed",
					name: "詳細指示",
					weight: 50,
					config: { style: "detailed" },
				},
			],
		});

		// レスポンス長のテスト
		this.createTest({
			id: "response-length",
			name: "レスポンス長テスト",
			description: "短い回答 vs 長い回答",
			variants: [
				{
					id: "short",
					name: "短い回答",
					weight: 50,
					config: { maxTokens: 150 },
				},
				{
					id: "long",
					name: "長い回答",
					weight: 50,
					config: { maxTokens: 500 },
				},
			],
		});
	}

	/**
	 * 新しいA/Bテストを作成
	 */
	createTest(options: {
		id: string;
		name: string;
		description: string;
		variants: ABTestVariant[];
		endDate?: Date;
	}): ABTest {
		const test: ABTest = {
			id: options.id,
			name: options.name,
			description: options.description,
			variants: options.variants,
			active: true,
			startDate: new Date(),
			endDate: options.endDate,
			metrics: {
				impressions: new Map(),
				conversions: new Map(),
				averageRating: new Map(),
			},
		};

		// 各バリアントのメトリクスを初期化
		for (const variant of test.variants) {
			test.metrics.impressions.set(variant.id, 0);
			test.metrics.conversions.set(variant.id, 0);
			test.metrics.averageRating.set(variant.id, []);
		}

		this.tests.set(test.id, test);

		logger.info("A/B test created", {
			id: test.id,
			name: test.name,
			variants: test.variants.length,
		});

		return test;
	}

	/**
	 * ユーザーにバリアントを割り当て
	 */
	assignVariant(testId: string, userId: string): ABTestVariant | null {
		const test = this.tests.get(testId);
		if (!test || !test.active) return null;

		// 既に割り当てられている場合は同じバリアントを返す
		if (!this.userAssignments.has(userId)) {
			this.userAssignments.set(userId, new Map());
		}

		const userTests = this.userAssignments.get(userId);
		if (userTests?.has(testId)) {
			const variantId = userTests.get(testId);
			return test.variants.find((v) => v.id === variantId) || null;
		}

		// 重み付けランダムでバリアントを選択
		const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
		let random = Math.random() * totalWeight;

		let selectedVariant: ABTestVariant | null = null;
		for (const variant of test.variants) {
			random -= variant.weight;
			if (random <= 0) {
				selectedVariant = variant;
				break;
			}
		}

		if (selectedVariant) {
			userTests?.set(testId, selectedVariant.id);
			// インプレッションを記録
			const currentImpressions = test.metrics.impressions.get(selectedVariant.id) || 0;
			test.metrics.impressions.set(selectedVariant.id, currentImpressions + 1);
		}

		return selectedVariant;
	}

	/**
	 * コンバージョンを記録
	 */
	recordConversion(testId: string, userId: string) {
		const test = this.tests.get(testId);
		if (!test) return;

		const variantId = this.userAssignments.get(userId)?.get(testId);
		if (!variantId) return;

		const currentConversions = test.metrics.conversions.get(variantId) || 0;
		test.metrics.conversions.set(variantId, currentConversions + 1);

		logger.debug("A/B test conversion recorded", {
			testId,
			variantId,
			userId,
		});
	}

	/**
	 * 評価スコアを記録
	 */
	recordRating(testId: string, userId: string, rating: number) {
		const test = this.tests.get(testId);
		if (!test) return;

		const variantId = this.userAssignments.get(userId)?.get(testId);
		if (!variantId) return;

		const ratings = test.metrics.averageRating.get(variantId) || [];
		ratings.push(rating);
		test.metrics.averageRating.set(variantId, ratings);
	}

	/**
	 * テスト結果を取得
	 */
	getTestResults(testId: string) {
		const test = this.tests.get(testId);
		if (!test) return null;

		const results = test.variants.map((variant) => {
			const impressions = test.metrics.impressions.get(variant.id) || 0;
			const conversions = test.metrics.conversions.get(variant.id) || 0;
			const ratings = test.metrics.averageRating.get(variant.id) || [];
			const avgRating =
				ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

			return {
				variantId: variant.id,
				name: variant.name,
				impressions,
				conversions,
				conversionRate: impressions > 0 ? (conversions / impressions) * 100 : 0,
				averageRating: avgRating,
				sampleSize: ratings.length,
			};
		});

		return {
			testId: test.id,
			name: test.name,
			description: test.description,
			active: test.active,
			startDate: test.startDate,
			endDate: test.endDate,
			results,
		};
	}

	/**
	 * テストを終了
	 */
	endTest(testId: string) {
		const test = this.tests.get(testId);
		if (test) {
			test.active = false;
			test.endDate = new Date();
			logger.info("A/B test ended", { testId, name: test.name });
		}
	}

	/**
	 * 全テストの一覧を取得
	 */
	listTests() {
		return Array.from(this.tests.values()).map((test) => ({
			id: test.id,
			name: test.name,
			description: test.description,
			active: test.active,
			startDate: test.startDate,
			endDate: test.endDate,
			variantCount: test.variants.length,
		}));
	}
}

export const abTestManager = new ABTestManager();
