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
declare class AdvancedRateLimiter {
    private ipRequests;
    private blockedIPs;
    private suspiciousIPs;
    private readonly MAX_REQUESTS_PER_MINUTE;
    private readonly MAX_REQUESTS_PER_HOUR;
    private readonly SUSPICIOUS_THRESHOLD;
    private readonly AUTO_BLOCK_THRESHOLD;
    checkRateLimit(ip: string, endpoint: string): {
        allowed: boolean;
        reason?: string;
    };
    blockIP(ip: string, reason: string, durationSeconds?: number): void;
    unblockIP(ip: string): void;
    getBlockedIPs(): BlockedIP[];
    getSuspiciousIPs(): string[];
    getIPStats(ip: string): RateLimitInfo | null;
    clearStats(): void;
}
export declare const advancedRateLimiter: AdvancedRateLimiter;
export {};
//# sourceMappingURL=advanced-rate-limiter.d.ts.map