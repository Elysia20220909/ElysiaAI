interface RequestMetrics {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    timestamp: Date;
    userId?: string;
}
interface EndpointStats {
    totalRequests: number;
    successCount: number;
    errorCount: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    lastAccessed: Date;
}
declare class APIAnalytics {
    private metrics;
    private readonly MAX_METRICS;
    recordRequest(data: RequestMetrics): void;
    getEndpointStats(): Record<string, EndpointStats>;
    getHourlyStats(): Record<number, number>;
    getResponseTimeDistribution(): Record<string, number>;
    getTopEndpoints(limit?: number): Array<{
        endpoint: string;
        requests: number;
    }>;
    getErrorRate(): {
        total: number;
        errors: number;
        rate: number;
    };
    clearMetrics(): void;
    exportJSON(): {
        summary: {
            totalRequests: number;
            errorRate: {
                total: number;
                errors: number;
                rate: number;
            };
            topEndpoints: {
                endpoint: string;
                requests: number;
            }[];
            responseTimeDistribution: Record<string, number>;
        };
        endpointStats: Record<string, EndpointStats>;
        hourlyStats: Record<number, number>;
        generatedAt: string;
    };
}
export declare const apiAnalytics: APIAnalytics;
export {};
//# sourceMappingURL=api-analytics.d.ts.map