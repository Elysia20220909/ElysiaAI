declare class ErrorMonitor {
	private webhookConfig;
	private errorCounts;
	private readonly RATE_LIMIT;
	constructor();
	captureError(error: Error | string, context?: Record<string, unknown>): Promise<void>;
	captureCritical(error: Error | string, context?: Record<string, unknown>): Promise<void>;
	private sendWebhookNotification;
	private sendDiscordWebhook;
	private sendSlackWebhook;
	getErrorStats(): Record<
		string,
		{
			count: number;
			lastSeen: string;
		}
	>;
	clearStats(): void;
}
export declare const errorMonitor: ErrorMonitor;
export {};
//# sourceMappingURL=error-monitor.d.ts.map
