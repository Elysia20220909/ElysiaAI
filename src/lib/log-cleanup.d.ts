declare class LogCleanupManager {
	private config;
	private intervalId?;
	private isRunning;
	constructor();
	start(): void;
	stop(): void;
	private performCleanup;
	private analyzeLogDirectory;
	private deleteOldLogs;
	private deleteBySize;
	rotateLog(logFile: string): Promise<void>;
	private compressLog;
	getStats():
		| {
				then<
					TResult1 = {
						totalSizeMB: number;
						fileCount: number;
					},
					TResult2 = never,
				>(
					onfulfilled?:
						| ((value: {
								totalSizeMB: number;
								fileCount: number;
						  }) => TResult1 | PromiseLike<TResult1>)
						| null
						| undefined,
					onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
				): Promise<TResult1 | TResult2>;
				catch<TResult = never>(
					onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined,
				): Promise<
					| {
							totalSizeMB: number;
							fileCount: number;
					  }
					| TResult
				>;
				finally(onfinally?: (() => void) | null | undefined): Promise<{
					totalSizeMB: number;
					fileCount: number;
				}>;
				[Symbol.toStringTag]: string;
				enabled: boolean;
				running: boolean;
				logDir: string;
				maxAgeDays: number;
				maxSizeMB: number;
				error?: undefined;
		  }
		| {
				enabled: boolean;
				running: boolean;
				error: string;
		  };
	triggerManualCleanup(): Promise<void>;
}
export declare const logCleanupManager: LogCleanupManager;
export {};
//# sourceMappingURL=log-cleanup.d.ts.map
