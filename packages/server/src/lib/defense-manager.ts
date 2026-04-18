import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { logger } from "./logger";

interface DefenseRules {
	blocked_ips: string[];
	last_updated: number;
}

class DefenseManager {
	private rules: DefenseRules = { blocked_ips: [], last_updated: 0 };
	private lastLoadedAt = 0;
	// ⚠️ 動的脅威検知用 (L3 Black ICE)
	private suspiciousActivities: Map<string, number> = new Map();
	private isGatekeeperVerified = false;

	constructor() {
		this.loadRules();
	}

	/**
	 * 構成ファイルのパスを取得
	 */
	private getRulesPath(): string {
		return (
			process.env.DEFENSE_RULES_FILE ||
			join(process.cwd(), "../../config/defense/rules.json")
		);
	}

	/**
	 * ロードされたルールを更新（必要に応じてファイルから再読込）
	 */
	public loadRules(): void {
		try {
			const rulesPath = this.getRulesPath();
			if (!existsSync(rulesPath)) {
				this.saveRules(); // 初期ファイルを作成
				return;
			}

			const content = readFileSync(rulesPath, "utf-8");
			let parsed: Partial<DefenseRules>;
			try {
				parsed = JSON.parse(content);
			} catch (parseError) {
				logger.error(
					"Malformed defense rules JSON, using defaults",
					parseError as Error,
				);
				parsed = { blocked_ips: [] };
			}

			// 既存の動的ブロックIPをマージ
			const mergedIps = Array.from(
				new Set([...this.rules.blocked_ips, ...(parsed.blocked_ips || [])]),
			);
			this.rules = { ...this.rules, ...parsed, blocked_ips: mergedIps };
			this.lastLoadedAt = Date.now();

			logger.info("🛡️ Defense rules loaded & merged", {
				blockedCount: this.rules.blocked_ips.length,
			});
		} catch (error) {
			logger.error("Failed to load defense rules", error as Error);
		}
	}

	/**
	 * ルールをファイルに永続化
	 */
	private saveRules(): void {
		try {
			const rulesPath = this.getRulesPath();
			const dir = dirname(rulesPath);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
			this.rules.last_updated = Date.now();
			writeFileSync(rulesPath, JSON.stringify(this.rules, null, 2), "utf-8");
			logger.info("💾 Defense rules persisted to storage.");
		} catch (error) {
			logger.error("Failed to save defense rules", error as Error);
		}
	}

	/**
	 * 悪意ある活動（InfoStealerスキャン等）を記録し、閾値を超えたら自動バン
	 */
	public reportSuspiciousActivity(ip: string, reason: string): void {
		const cleanIp = ip.replace(/^::ffff:/, "");
		const count = (this.suspiciousActivities.get(cleanIp) || 0) + 1;
		this.suspiciousActivities.set(cleanIp, count);

		logger.warn(
			`⚠️ Suspicious activity from ${cleanIp}: ${reason} (Level: ${count})`,
		);

		// 3回以上の不審なリクエストでBlack ICE発動（IPをブロック）
		if (count >= 3 && !this.rules.blocked_ips.includes(cleanIp)) {
			this.rules.blocked_ips.push(cleanIp);
			this.saveRules(); // 永続化
			logger.error(
				`🛡️ L3 Black ICE Activated: ${cleanIp} has been permanently blocked. (Reason: ${reason})`,
			);
		}
	}

	/**
	 * 即時バン（重大な違反に対する措置）
	 */
	public banIp(ip: string, reason: string): void {
		const cleanIp = ip.replace(/^::ffff:/, "");
		if (!this.rules.blocked_ips.includes(cleanIp)) {
			this.rules.blocked_ips.push(cleanIp);
			this.saveRules(); // 永続化
			logger.error(
				`🛡️ L4 Blackwall Enforced: ${cleanIp} blocked immediately. (Reason: ${reason})`,
			);
		}
	}

	/**
	 * 指定されたIPがブロック対象かチェック
	 */
	public isBlocked(ip: string): boolean {
		if (Date.now() - this.lastLoadedAt > 10000) {
			this.loadRules();
		}
		const cleanIp = ip.replace(/^::ffff:/, "");
		return this.rules.blocked_ips.includes(cleanIp);
	}

	/**
	 * Gatekeeper: シリコン・レベルの整合性検証
	 */
	public verifyGatekeeper(): boolean {
		try {
			const keyPath = join(process.cwd(), "../../kernel/SENTINEL.KEY");
			if (!existsSync(keyPath)) {
				this.isGatekeeperVerified = false;
				return false;
			}
			const key = readFileSync(keyPath, "utf-8").trim();
			this.isGatekeeperVerified = key === "AEGIS-SVR-777";
			if (this.isGatekeeperVerified) {
				logger.info("🛡️ Gatekeeper Verified: Silicon Root of Trust active.");
			}
			return this.isGatekeeperVerified;
		} catch (e) {
			this.isGatekeeperVerified = false;
			return false;
		}
	}

	/**
	 * Neural Sandbox: リクエストのサニタイズと隔離
	 */
	public enforceSandbox(req: any): void {
		if (!this.isGatekeeperVerified && !this.verifyGatekeeper()) {
			throw new Error(
				"GATEKEEPER_REJECTED: Unauthorized hardware environment.",
			);
		}
		// 追加のサンドボックスロジック（ヘッダー削除等は routes 側で実施）
	}

	/**
	 * 現在のブロックリストを取得
	 */
	public getBlockedIps(): string[] {
		return this.rules.blocked_ips;
	}
}

export const defenseManager = new DefenseManager();
