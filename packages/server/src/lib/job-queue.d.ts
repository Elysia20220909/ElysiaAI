declare class JobQueueManager {
	private queue;
	private worker;
	private readonly REDIS_URL;
	constructor();
	initialize(): Promise<void>;
	private processJob;
	private handleEmailJob;
	private handleReportJob;
	private handleCleanupJob;
	private handleWebhookJob;
	addJob(type: string, payload: Record<string, unknown>, options?: {}): Promise<unknown>;
	sendEmail(to: string, subject: string, html: string): Promise<unknown>;
	generateReport(
		reportType: "daily" | "weekly" | "monthly",
		startDate: Date,
		endDate: Date,
	): Promise<unknown>;
	scheduleCleanup(): Promise<unknown>;
	getStats(): Promise<
		| {
				available: boolean;
				waiting?: undefined;
				active?: undefined;
				completed?: undefined;
				failed?: undefined;
		  }
		| {
				available: boolean;
				waiting: number;
				active: number;
				completed: number;
				failed: number;
		  }
	>;
	close(): Promise<void>;
}
export declare const jobQueue: JobQueueManager;
export {};
//# sourceMappingURL=job-queue.d.ts.map
