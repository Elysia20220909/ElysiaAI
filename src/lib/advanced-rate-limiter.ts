/**
 * Advanced Rate Limiter
 * IP別制限、不正アクセス検知、ブロックリスト
 */

import { logger } from "./logger";
import { errorMonitor } from "./error-monitor";

interface RateLimitInfo {
	count: number;
	firstRequest: Date;
	lastRequest: Date;
	blocked: boolean;
}

interface BlockedIP {
	ip: string;
	reason: string;
	blockedAt: Date;
	expiresAt?: Date;
}

class AdvancedRateLimiter {
	private ipRequests: Map<string, RateLimitInfo> = new Map();
	private blockedIPs: Map<string, BlockedIP> = new Map();
	private suspiciousIPs: Set<string> = new Set();

	private readonly MAX_REQUESTS_PER_MINUTE = 60;
	private readonly MAX_REQUESTS_PER_HOUR = 1000;
	private readonly SUSPICIOUS_THRESHOLD = 100; // 1分以内
	private readonly AUTO_BLOCK_THRESHOLD = 200; // 1分以内

	/**
	 * リクエストをチェック
	 */
	checkRateLimit(
		ip: string,
		endpoint: string,
	): { allowed: boolean; reason?: string } {
		// ブロックリストチェック
		const blocked = this.blockedIPs.get(ip);
		if (blocked) {
			if (blocked.expiresAt && blocked.expiresAt < new Date()) {
				this.blockedIPs.delete(ip);
			} else {
				logger.warn("Blocked IP attempted access", { ip, endpoint });
				return { allowed: false, reason: `Blocked: ${blocked.reason}` };
			}
		}

		const now = new Date();
		const info = this.ipRequests.get(ip) || {
			count: 0,
			firstRequest: now,
			lastRequest: now,
			blocked: false,
		};

		// 1分以内のリクエスト数チェック
		const minuteAgo = new Date(now.getTime() - 60000);
		if (info.lastRequest < minuteAgo) {
			// リセット
			info.count = 0;
			info.firstRequest = now;
		}

		info.count++;
		info.lastRequest = now;
		this.ipRequests.set(ip, info);

		// 疑わしいアクティビティ検知
		if (info.count > this.SUSPICIOUS_THRESHOLD) {
			this.suspiciousIPs.add(ip);
			logger.warn("Suspicious activity detected", { ip, count: info.count });

			errorMonitor.captureError("Suspicious IP activity", {
				ip,
				requestCount: info.count,
				endpoint,
			});
		}

		// 自動ブロック
		if (info.count > this.AUTO_BLOCK_THRESHOLD) {
			this.blockIP(ip, "Excessive requests", 3600); // 1時間ブロック
			return {
				allowed: false,
				reason: "Rate limit exceeded - temporarily blocked",
			};
		}

		// レート制限チェック
		if (info.count > this.MAX_REQUESTS_PER_MINUTE) {
			logger.warn("Rate limit exceeded", { ip, count: info.count });
			return { allowed: false, reason: "Too many requests" };
		}

		return { allowed: true };
	}

	/**
	 * IPをブロック
	 */
	blockIP(ip: string, reason: string, durationSeconds?: number) {
		const blockedAt = new Date();
		const expiresAt = durationSeconds
			? new Date(blockedAt.getTime() + durationSeconds * 1000)
			: undefined;

		this.blockedIPs.set(ip, {
			ip,
			reason,
			blockedAt,
			expiresAt,
		});

		logger.warn("IP blocked", { ip, reason, expiresAt });

		errorMonitor.captureCritical("IP Blocked", {
			ip,
			reason,
			duration: durationSeconds ? `${durationSeconds}s` : "permanent",
		});
	}

	/**
	 * IPのブロックを解除
	 */
	unblockIP(ip: string) {
		const blocked = this.blockedIPs.get(ip);
		if (blocked) {
			this.blockedIPs.delete(ip);
			logger.info("IP unblocked", { ip });
		}
	}

	/**
	 * ブロックリストを取得
	 */
	getBlockedIPs(): BlockedIP[] {
		return Array.from(this.blockedIPs.values());
	}

	/**
	 * 疑わしいIPリストを取得
	 */
	getSuspiciousIPs(): string[] {
		return Array.from(this.suspiciousIPs);
	}

	/**
	 * IP統計を取得
	 */
	getIPStats(ip: string): RateLimitInfo | null {
		return this.ipRequests.get(ip) || null;
	}

	/**
	 * すべての統計をクリア
	 */
	clearStats() {
		this.ipRequests.clear();
		this.suspiciousIPs.clear();
	}
}

export const advancedRateLimiter = new AdvancedRateLimiter();
