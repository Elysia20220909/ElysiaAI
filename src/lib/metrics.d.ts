export interface Metrics {
    http_requests_total: Map<string, number>;
    http_request_duration_seconds: Map<string, number[]>;
    http_errors_total: Map<string, number>;
    active_connections: number;
    chat_requests_total: number;
    feedback_submissions_total: number;
    auth_attempts_total: Map<string, number>;
    rate_limit_exceeded_total: number;
    rag_queries_total: number;
    rag_query_duration_seconds: number[];
}
declare class MetricsCollector {
  private metrics;
  incrementRequest(method: string, path: string, status: number): void;
  recordRequestDuration(method: string, path: string, duration: number): void;
  incrementError(method: string, path: string, errorType: string): void;
  incrementConnections(): void;
  decrementConnections(): void;
  incrementChatRequests(): void;
  incrementFeedback(): void;
  incrementAuthAttempt(success: boolean): void;
  incrementRateLimit(): void;
  incrementRAGQuery(): void;
  recordRAGDuration(duration: number): void;
  getMetrics(): Metrics;
  toPrometheusFormat(): string;
}
export declare const metricsCollector: MetricsCollector;
export {};
//# sourceMappingURL=metrics.d.ts.map