// Prometheus Metrics Module
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

class MetricsCollector {
	private metrics: Metrics = {
		http_requests_total: new Map(),
		http_request_duration_seconds: new Map(),
		http_errors_total: new Map(),
		active_connections: 0,
		chat_requests_total: 0,
		feedback_submissions_total: 0,
		auth_attempts_total: new Map(),
		rate_limit_exceeded_total: 0,
		rag_queries_total: 0,
		rag_query_duration_seconds: [],
	};

	incrementRequest(method: string, path: string, status: number) {
		const key = `${method}:${path}:${status}`;
		const current = this.metrics.http_requests_total.get(key) || 0;
		this.metrics.http_requests_total.set(key, current + 1);
	}

	recordRequestDuration(method: string, path: string, duration: number) {
		const key = `${method}:${path}`;
		const durations = this.metrics.http_request_duration_seconds.get(key) || [];
		durations.push(duration);
		if (durations.length > 1000) durations.shift();
		this.metrics.http_request_duration_seconds.set(key, durations);
	}

	incrementError(method: string, path: string, errorType: string) {
		const key = `${method}:${path}:${errorType}`;
		const current = this.metrics.http_errors_total.get(key) || 0;
		this.metrics.http_errors_total.set(key, current + 1);
	}

	incrementConnections() {
		this.metrics.active_connections++;
	}

	decrementConnections() {
		this.metrics.active_connections = Math.max(
			0,
			this.metrics.active_connections - 1,
		);
	}

	incrementChatRequests() {
		this.metrics.chat_requests_total++;
	}

	incrementFeedback() {
		this.metrics.feedback_submissions_total++;
	}

	incrementAuthAttempt(success: boolean) {
		const key = success ? "success" : "failure";
		const current = this.metrics.auth_attempts_total.get(key) || 0;
		this.metrics.auth_attempts_total.set(key, current + 1);
	}

	incrementRateLimit() {
		this.metrics.rate_limit_exceeded_total++;
	}

	incrementRAGQuery() {
		this.metrics.rag_queries_total++;
	}

	recordRAGDuration(duration: number) {
		this.metrics.rag_query_duration_seconds.push(duration);
		if (this.metrics.rag_query_duration_seconds.length > 1000) {
			this.metrics.rag_query_duration_seconds.shift();
		}
	}

	getMetrics(): Metrics {
		return { ...this.metrics };
	}

	toPrometheusFormat(): string {
		const lines: string[] = [];

		lines.push("# HELP http_requests_total Total HTTP requests");
		lines.push("# TYPE http_requests_total counter");
		for (const [key, value] of this.metrics.http_requests_total) {
			const [method, path, status] = key.split(":");
			lines.push(
				`http_requests_total{method="${method}",path="${path}",status="${status}"} ${value}`,
			);
		}

		lines.push(
			"# HELP http_request_duration_seconds HTTP request duration in seconds",
		);
		lines.push("# TYPE http_request_duration_seconds histogram");
		for (const [key, durations] of this.metrics.http_request_duration_seconds) {
			const [method, path] = key.split(":");
			const sorted = [...durations].sort((a, b) => a - b);
			const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
			const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
			const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
			const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

			lines.push(
				`http_request_duration_seconds_avg{method="${method}",path="${path}"} ${avg.toFixed(4)}`,
			);
			lines.push(
				`http_request_duration_seconds{method="${method}",path="${path}",quantile="0.5"} ${p50.toFixed(4)}`,
			);
			lines.push(
				`http_request_duration_seconds{method="${method}",path="${path}",quantile="0.95"} ${p95.toFixed(4)}`,
			);
			lines.push(
				`http_request_duration_seconds{method="${method}",path="${path}",quantile="0.99"} ${p99.toFixed(4)}`,
			);
		}

		lines.push("# HELP http_errors_total Total HTTP errors");
		lines.push("# TYPE http_errors_total counter");
		for (const [key, value] of this.metrics.http_errors_total) {
			const [method, path, errorType] = key.split(":");
			lines.push(
				`http_errors_total{method="${method}",path="${path}",type="${errorType}"} ${value}`,
			);
		}

		lines.push("# HELP active_connections Current active connections");
		lines.push("# TYPE active_connections gauge");
		lines.push(`active_connections ${this.metrics.active_connections}`);

		lines.push("# HELP chat_requests_total Total chat requests");
		lines.push("# TYPE chat_requests_total counter");
		lines.push(`chat_requests_total ${this.metrics.chat_requests_total}`);

		lines.push("# HELP feedback_submissions_total Total feedback submissions");
		lines.push("# TYPE feedback_submissions_total counter");
		lines.push(
			`feedback_submissions_total ${this.metrics.feedback_submissions_total}`,
		);

		lines.push("# HELP auth_attempts_total Total authentication attempts");
		lines.push("# TYPE auth_attempts_total counter");
		for (const [result, value] of this.metrics.auth_attempts_total) {
			lines.push(`auth_attempts_total{result="${result}"} ${value}`);
		}

		lines.push("# HELP rate_limit_exceeded_total Total rate limit exceeded");
		lines.push("# TYPE rate_limit_exceeded_total counter");
		lines.push(
			`rate_limit_exceeded_total ${this.metrics.rate_limit_exceeded_total}`,
		);

		lines.push("# HELP rag_queries_total Total RAG queries");
		lines.push("# TYPE rag_queries_total counter");
		lines.push(`rag_queries_total ${this.metrics.rag_queries_total}`);

		if (this.metrics.rag_query_duration_seconds.length > 0) {
			lines.push("# HELP rag_query_duration_seconds RAG query duration");
			lines.push("# TYPE rag_query_duration_seconds histogram");
			const sorted = [...this.metrics.rag_query_duration_seconds].sort(
				(a, b) => a - b,
			);
			const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
			const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
			const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
			const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

			lines.push(`rag_query_duration_seconds_avg ${avg.toFixed(4)}`);
			lines.push(
				`rag_query_duration_seconds{quantile="0.5"} ${p50.toFixed(4)}`,
			);
			lines.push(
				`rag_query_duration_seconds{quantile="0.95"} ${p95.toFixed(4)}`,
			);
			lines.push(
				`rag_query_duration_seconds{quantile="0.99"} ${p99.toFixed(4)}`,
			);
		}

		const memUsage = process.memoryUsage();
		lines.push("# HELP process_memory_bytes Process memory usage");
		lines.push("# TYPE process_memory_bytes gauge");
		lines.push(`process_memory_bytes{type="heap_used"} ${memUsage.heapUsed}`);
		lines.push(`process_memory_bytes{type="heap_total"} ${memUsage.heapTotal}`);
		lines.push(`process_memory_bytes{type="rss"} ${memUsage.rss}`);

		lines.push("# HELP process_uptime_seconds Process uptime in seconds");
		lines.push("# TYPE process_uptime_seconds gauge");
		lines.push(`process_uptime_seconds ${process.uptime()}`);

		return `${lines.join("\n")}\n`;
	}
}

export const metricsCollector = new MetricsCollector();
