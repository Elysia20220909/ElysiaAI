/**
 * API Key Management System
 * 複数APIキーの発行・無効化・使用量制限
 */

import * as crypto from "node:crypto";
import { logger } from "./logger";

interface APIKey {
	key: string;
	name: string;
	userId?: string;
	createdAt: Date;
	expiresAt?: Date;
	enabled: boolean;
	rateLimit: number; // 1時間あたりのリクエスト数
	usage: {
		totalRequests: number;
		lastUsed?: Date;
		requestsThisHour: number;
		hourStart: Date;
	};
}

class APIKeyManager {
	private keys: Map<string, APIKey>;
	private readonly KEY_PREFIX = "elysia_";

	constructor() {
		this.keys = new Map();
		this.loadKeysFromEnv();
	}

	/**
	 * 環境変数からAPIキーを読み込み
	 */
	private loadKeysFromEnv() {
		const masterKey = process.env.MASTER_API_KEY;
		if (masterKey) {
			this.keys.set(masterKey, {
				key: masterKey,
				name: "Master Key",
				createdAt: new Date(),
				enabled: true,
				rateLimit: 10000,
				usage: {
					totalRequests: 0,
					requestsThisHour: 0,
					hourStart: new Date(),
				},
			});
		}
	}

	/**
	 * 新しいAPIキーを生成
	 */
	generateKey(options: {
		name: string;
		userId?: string;
		rateLimit?: number;
		expiresInDays?: number;
	}): APIKey {
		const randomBytes = crypto.randomBytes(32);
		const key = `${this.KEY_PREFIX}${randomBytes.toString("base64url")}`;

		const expiresAt = options.expiresInDays
			? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
			: undefined;

		const apiKey: APIKey = {
			key,
			name: options.name,
			userId: options.userId,
			createdAt: new Date(),
			expiresAt,
			enabled: true,
			rateLimit: options.rateLimit || 1000,
			usage: {
				totalRequests: 0,
				requestsThisHour: 0,
				hourStart: new Date(),
			},
		};

		this.keys.set(key, apiKey);

		logger.info("API key generated", {
			name: options.name,
			userId: options.userId,
			rateLimit: apiKey.rateLimit,
		});

		return apiKey;
	}

	/**
	 * APIキーを検証
	 */
	validateKey(key: string): {
		valid: boolean;
		reason?: string;
		apiKey?: APIKey;
	} {
		const apiKey = this.keys.get(key);

		if (!apiKey) {
			return { valid: false, reason: "Invalid API key" };
		}

		if (!apiKey.enabled) {
			return { valid: false, reason: "API key is disabled" };
		}

		if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
			return { valid: false, reason: "API key has expired" };
		}

		// レート制限チェック
		const now = new Date();
		const hoursSince = (now.getTime() - apiKey.usage.hourStart.getTime()) / (1000 * 60 * 60);

		if (hoursSince >= 1) {
			// 新しい時間枠
			apiKey.usage.requestsThisHour = 0;
			apiKey.usage.hourStart = now;
		}

		if (apiKey.usage.requestsThisHour >= apiKey.rateLimit) {
			return {
				valid: false,
				reason: `Rate limit exceeded (${apiKey.rateLimit} requests/hour)`,
			};
		}

		return { valid: true, apiKey };
	}

	/**
	 * APIキー使用を記録
	 */
	recordUsage(key: string) {
		const apiKey = this.keys.get(key);
		if (apiKey) {
			apiKey.usage.totalRequests++;
			apiKey.usage.requestsThisHour++;
			apiKey.usage.lastUsed = new Date();
		}
	}

	/**
	 * APIキーを無効化
	 */
	revokeKey(key: string): boolean {
		const apiKey = this.keys.get(key);
		if (apiKey) {
			apiKey.enabled = false;
			logger.info("API key revoked", { name: apiKey.name });
			return true;
		}
		return false;
	}

	/**
	 * APIキーを削除
	 */
	deleteKey(key: string): boolean {
		const apiKey = this.keys.get(key);
		if (apiKey) {
			this.keys.delete(key);
			logger.info("API key deleted", { name: apiKey.name });
			return true;
		}
		return false;
	}

	/**
	 * 全APIキーのリストを取得（キーは隠す）
	 */
	listKeys() {
		return Array.from(this.keys.values()).map((key) => ({
			name: key.name,
			userId: key.userId,
			createdAt: key.createdAt,
			expiresAt: key.expiresAt,
			enabled: key.enabled,
			rateLimit: key.rateLimit,
			usage: {
				totalRequests: key.usage.totalRequests,
				lastUsed: key.usage.lastUsed,
				requestsThisHour: key.usage.requestsThisHour,
			},
			keyPreview: `${key.key.substring(0, 16)}...`,
		}));
	}

	/**
	 * 特定ユーザーのAPIキーを取得
	 */
	getUserKeys(userId: string) {
		return Array.from(this.keys.values())
			.filter((key) => key.userId === userId)
			.map((key) => ({
				name: key.name,
				createdAt: key.createdAt,
				expiresAt: key.expiresAt,
				enabled: key.enabled,
				rateLimit: key.rateLimit,
				usage: key.usage,
				keyPreview: `${key.key.substring(0, 16)}...`,
			}));
	}

	/**
	 * APIキーの使用統計を取得
	 */
	getUsageStats() {
		const keys = Array.from(this.keys.values());

		return {
			totalKeys: keys.length,
			activeKeys: keys.filter((k) => k.enabled).length,
			expiredKeys: keys.filter((k) => k.expiresAt && k.expiresAt < new Date()).length,
			totalRequests: keys.reduce((sum, k) => sum + k.usage.totalRequests, 0),
			topKeys: keys
				.sort((a, b) => b.usage.totalRequests - a.usage.totalRequests)
				.slice(0, 5)
				.map((k) => ({
					name: k.name,
					requests: k.usage.totalRequests,
				})),
		};
	}
}

export const apiKeyManager = new APIKeyManager();
