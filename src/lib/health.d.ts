export interface HealthStatus {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    services: {
        redis: ServiceHealth;
        fastapi: ServiceHealth;
        ollama: ServiceHealth;
    };
    system: {
        memory: {
            used: number;
            total: number;
            percentage: number;
        };
        cpu: {
            usage: number;
        };
    };
}
export interface ServiceHealth {
    status: "up" | "down" | "degraded";
    responseTime?: number;
    error?: string;
    lastCheck: string;
}
export declare function checkRedis(redisUrl: string): Promise<ServiceHealth>;
export declare function checkFastAPI(fastAPIUrl: string): Promise<ServiceHealth>;
export declare function checkOllama(ollamaUrl: string): Promise<ServiceHealth>;
export declare function getSystemMetrics(): {
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    cpu: {
        usage: number;
    };
};
export declare function performHealthCheck(redisUrl: string, fastAPIUrl: string, ollamaUrl: string): Promise<HealthStatus>;
//# sourceMappingURL=health.d.ts.map