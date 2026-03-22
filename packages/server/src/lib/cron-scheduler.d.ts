declare class CronScheduler {
	private tasks;
	constructor();
	initializeDefaultTasks(): void;
	addTask(name: string, cronTime: string, callback: () => Promise<void>, enabled?: boolean): void;
	enableTask(name: string): void;
	disableTask(name: string): void;
	removeTask(name: string): void;
	listTasks(): {
		name: string;
		cronTime: string;
		enabled: boolean;
		nextRun: Date | null;
	}[];
	runTask(name: string): Promise<void>;
	stopAll(): void;
	getStats(): {
		totalTasks: number;
		enabledTasks: number;
		disabledTasks: number;
		nextRuns: {
			name: string;
			nextRun: Date;
		}[];
	};
}
export declare const cronScheduler: CronScheduler;
export {};
//# sourceMappingURL=cron-scheduler.d.ts.map
