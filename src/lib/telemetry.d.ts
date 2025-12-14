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
declare class Telemetry {
	private spans;
	private activeSpans;
	private enabled;
	constructor(enabled?: boolean);
	private generateTraceId;
	private generateSpanId;
	parseTraceContext(traceparent?: string): TraceContext | null;
	createTraceContext(traceId: string, spanId: string, sampled?: boolean): string;
	startSpan(
		name: string,
		options?: {
			parentContext?: TraceContext;
			attributes?: Record<string, string | number | boolean>;
			contextId?: string;
		},
	): Span;
	endSpan(spanId: string, status?: SpanStatus): void;
	addEvent(
		spanId: string,
		name: string,
		attributes?: Record<string, string | number | boolean>,
	): void;
	setAttribute(spanId: string, key: string, value: string | number | boolean): void;
	setStatus(spanId: string, status: SpanStatus): void;
	getSpan(spanId: string): Span | undefined;
	getActiveSpan(contextId: string): Span | undefined;
	getTrace(traceId: string): Span[];
	exportSpans(): Span[];
	private createDummySpan;
	trace<T>(
		name: string,
		fn: (span: Span) => Promise<T>,
		options?: {
			parentContext?: TraceContext;
			attributes?: Record<string, string | number | boolean>;
		},
	): Promise<T>;
	getStats(): {
		totalSpans: number;
		activeSpans: number;
		completedSpans: number;
		averageDuration: number;
		traces: number;
	};
	clear(): void;
	setEnabled(enabled: boolean): void;
}
export declare const telemetry: Telemetry;
export declare function getTraceContextFromRequest(request: Request): TraceContext | null;
export declare function Trace(
	spanName?: string,
): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export {};
//# sourceMappingURL=telemetry.d.ts.map
