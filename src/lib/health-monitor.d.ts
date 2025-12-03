interface HealthCheck {
    name: string;
    check: () => Promise<boolean>;
    interval: number;
    timeout: number;
    failureThreshold: number;
}
declare class HealthMonitor {
    private checks;
    private statuses;
    private intervals;
    private enabled;
    constructor();
    private initializeDefaultChecks;
    addCheck(check: HealthCheck): void;
    start(): void;
    stop(): void;
    private performCheck;
    private handleCheckFailure;
    private notifyFailure;
    private notifyRecovery;
    getStatus(): {
        overall: string;
        checks: {
            name: string;
            status: "healthy" | "unhealthy" | "unknown";
            lastCheck: Date;
            consecutiveFailures: number;
            lastError: string | undefined;
        }[];
    };
    runCheck(name: string): Promise<boolean>;
}
export declare const healthMonitor: HealthMonitor;
export {};
//# sourceMappingURL=health-monitor.d.ts.map