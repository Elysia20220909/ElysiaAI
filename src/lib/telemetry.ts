// OpenTelemetry Distributed Tracing Module
import { hrtime } from "node:process";

export interface Span {
	traceId: string;
	spanId: string;
	parentSpanId?: string;
	name: string;
	startTime: bigint;
	endTime?: bigint;
	duration?: number;
	attributes: Record<string, string | number | boolean>;
	events: SpanEvent[];
	status: SpanStatus;
}

export interface SpanEvent {
	name: string;
	timestamp: bigint;
	attributes?: Record<string, string | number | boolean>;
}

export interface SpanStatus {
	code: "OK" | "ERROR" | "UNSET";
	message?: string;
}

export interface TraceContext {
	traceId: string;
	spanId: string;
	traceFlags: number;
}

class Telemetry {
	private spans: Map<string, Span> = new Map();
	private activeSpans: Map<string, string> = new Map(); // contextId -> spanId
	private enabled: boolean;

	constructor(enabled = true) {
		this.enabled = enabled;
	}

	/**
	 * Generate trace ID
	 */
	private generateTraceId(): string {
		const randomBytes = new Uint8Array(16);
		crypto.getRandomValues(randomBytes);
		return Array.from(randomBytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}

	/**
	 * Generate span ID
	 */
	private generateSpanId(): string {
		const randomBytes = new Uint8Array(8);
		crypto.getRandomValues(randomBytes);
		return Array.from(randomBytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}

	/**
	 * Parse W3C trace context from headers
	 */
	parseTraceContext(traceparent?: string): TraceContext | null {
		if (!traceparent) return null;

		const parts = traceparent.split("-");
		if (parts.length !== 4) return null;

		const [version, traceId, spanId, traceFlags] = parts;
		if (version !== "00") return null;

		return {
			traceId,
			spanId,
			traceFlags: Number.parseInt(traceFlags, 16),
		};
	}

	/**
	 * Create W3C trace context header
	 */
	createTraceContext(traceId: string, spanId: string, sampled = true): string {
		const flags = sampled ? "01" : "00";
		return `00-${traceId}-${spanId}-${flags}`;
	}

	/**
	 * Start a new span
	 */
	startSpan(
		name: string,
		options?: {
			parentContext?: TraceContext;
			attributes?: Record<string, string | number | boolean>;
			contextId?: string;
		},
	): Span {
		if (!this.enabled) {
			// Return dummy span if disabled
			return this.createDummySpan(name);
		}

		const traceId = options?.parentContext?.traceId || this.generateTraceId();
		const spanId = this.generateSpanId();
		const parentSpanId = options?.parentContext?.spanId;

		const span: Span = {
			traceId,
			spanId,
			parentSpanId,
			name,
			startTime: hrtime.bigint(),
			attributes: options?.attributes || {},
			events: [],
			status: { code: "UNSET" },
		};

		this.spans.set(spanId, span);

		if (options?.contextId) {
			this.activeSpans.set(options.contextId, spanId);
		}

		return span;
	}

	/**
	 * End a span
	 */
	endSpan(spanId: string, status?: SpanStatus) {
		const span = this.spans.get(spanId);
		if (!span) return;

		span.endTime = hrtime.bigint();
		span.duration = Number(span.endTime - span.startTime) / 1_000_000; // Convert to milliseconds
		span.status = status || { code: "OK" };

		// Remove from active spans
		for (const [contextId, activeSpanId] of this.activeSpans.entries()) {
			if (activeSpanId === spanId) {
				this.activeSpans.delete(contextId);
			}
		}
	}

	/**
	 * Add event to span
	 */
	addEvent(
		spanId: string,
		name: string,
		attributes?: Record<string, string | number | boolean>,
	) {
		const span = this.spans.get(spanId);
		if (!span) return;

		span.events.push({
			name,
			timestamp: hrtime.bigint(),
			attributes,
		});
	}

	/**
	 * Set span attribute
	 */
	setAttribute(spanId: string, key: string, value: string | number | boolean) {
		const span = this.spans.get(spanId);
		if (!span) return;

		span.attributes[key] = value;
	}

	/**
	 * Set span status
	 */
	setStatus(spanId: string, status: SpanStatus) {
		const span = this.spans.get(spanId);
		if (!span) return;

		span.status = status;
	}

	/**
	 * Get span by ID
	 */
	getSpan(spanId: string): Span | undefined {
		return this.spans.get(spanId);
	}

	/**
	 * Get active span for context
	 */
	getActiveSpan(contextId: string): Span | undefined {
		const spanId = this.activeSpans.get(contextId);
		return spanId ? this.spans.get(spanId) : undefined;
	}

	/**
	 * Get all spans for a trace
	 */
	getTrace(traceId: string): Span[] {
		return Array.from(this.spans.values()).filter(
			(span) => span.traceId === traceId,
		);
	}

	/**
	 * Export spans (for sending to collector)
	 */
	exportSpans(): Span[] {
		const completed = Array.from(this.spans.values()).filter(
			(span) => span.endTime !== undefined,
		);

		// Clear completed spans
		for (const span of completed) {
			this.spans.delete(span.spanId);
		}

		return completed;
	}

	/**
	 * Create dummy span for disabled telemetry
	 */
	private createDummySpan(name: string): Span {
		return {
			traceId: "",
			spanId: "",
			name,
			startTime: hrtime.bigint(),
			attributes: {},
			events: [],
			status: { code: "UNSET" },
		};
	}

	/**
	 * Trace a function execution
	 */
	async trace<T>(
		name: string,
		fn: (span: Span) => Promise<T>,
		options?: {
			parentContext?: TraceContext;
			attributes?: Record<string, string | number | boolean>;
		},
	): Promise<T> {
		const span = this.startSpan(name, options);

		try {
			const result = await fn(span);
			this.endSpan(span.spanId, { code: "OK" });
			return result;
		} catch (error) {
			this.endSpan(span.spanId, {
				code: "ERROR",
				message: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		}
	}

	/**
	 * Get telemetry statistics
	 */
	getStats() {
		const spans = Array.from(this.spans.values());
		const completed = spans.filter((s) => s.endTime !== undefined);
		const active = spans.filter((s) => s.endTime === undefined);

		const avgDuration =
			completed.reduce((sum, s) => sum + (s.duration || 0), 0) /
				completed.length || 0;

		return {
			totalSpans: spans.length,
			activeSpans: active.length,
			completedSpans: completed.length,
			averageDuration: avgDuration,
			traces: new Set(spans.map((s) => s.traceId)).size,
		};
	}

	/**
	 * Clear all spans (for testing)
	 */
	clear() {
		this.spans.clear();
		this.activeSpans.clear();
	}

	/**
	 * Enable/disable telemetry
	 */
	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}
}

// Singleton instance
export const telemetry = new Telemetry(
	process.env.TELEMETRY_ENABLED !== "false",
);

/**
 * Middleware helper to extract trace context from request
 */
export function getTraceContextFromRequest(
	request: Request,
): TraceContext | null {
	const traceparent = request.headers.get("traceparent");
	return telemetry.parseTraceContext(traceparent || undefined);
}

/**
 * Decorator for tracing methods
 */
export function Trace(spanName?: string) {
	return (
		target: unknown,
		propertyKey: string,
		descriptor: PropertyDescriptor,
	) => {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: unknown[]) {
			const name = spanName || `${target.constructor.name}.${propertyKey}`;
			return telemetry.trace(name, async (span) => {
				span.attributes["method"] = propertyKey;
				return originalMethod.apply(this, args);
			});
		};

		return descriptor;
	};
}
