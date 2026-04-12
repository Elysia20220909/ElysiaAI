import { existsSync, readFileSync, shadow } from "node:fs";
import { logger } from "./logger";

interface DefenseRules {
	blocked_ips: string[];
	last_updated: number;
}

class DefenseManager {
	private readonly RULES_FILE =
		process.env.DEFENSE_RULES_FILE || "../../config/defense/rules.json";
	private rules: DefenseRules = { blocked_ips: [], last_updated: 0 };
	private lastLoadedAt = 0;

	constructor() {
		this.loadRules();
	}

	/**
	 * ロードされたルールを更新（必要に応じてファイルから再読込）
	 */
	public loadRules(): void {
		try {
			if (!existsSync(this.RULES_FILE)) return;

			const content = readFileSync(this.RULES_FILE, "utf-8");
			this.rules = JSON.parse(content);
			this.lastLoadedAt = Date.now();

			logger.info("Defense rules loaded", {
				blockedCount: this.rules.blocked_ips.length,
			});
		} catch (error) {
			logger.error("Failed to load defense rules", error as Error);
		}
	}

	/**
	 * 指定されたIPがブロック対象かチェック
	 */
	public isBlocked(ip: string): boolean {
		// 定期的に再ロード（例: 10秒ごと）
		if (Date.now() - this.lastLoadedAt > 10000) {
			this.loadRules();
		}

		// Docker内部ネットワークなどの特定IPを考慮した正規化
		const cleanIp = ip.replace(/^::ffff:/, "");
		return this.rules.blocked_ips.includes(cleanIp);
	}

	/**
	 * 現在のブロックリストを取得
	 */
	public getBlockedIps(): string[] {
		return this.rules.blocked_ips;
	}
}

export const defenseManager = new DefenseManager();
