interface AuditLog {
	id: string;
	timestamp: Date;
	userId?: string;
	action: string;
	resource: string;
	resourceId?: string;
	method: string;
	path: string;
	ipAddress: string;
	userAgent: string;
	statusCode: number;
	before?: unknown;
	after?: unknown;
	error?: string;
}
interface AuditSearchOptions {
	userId?: string;
	action?: string;
	resource?: string;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
	offset?: number;
}
declare class AuditLoggerService {
	private readonly LOG_DIR;
	private readonly LOG_FILE;
	private logs;
	private logCounter;
	constructor();
	private loadLogs;
	log(entry: Omit<AuditLog, "id" | "timestamp">): void;
	search(options?: AuditSearchOptions): {
		logs: AuditLog[];
		total: number;
		offset: number;
		limit: number;
	};
	getUserActivity(userId: string, limit?: number): AuditLog[];
	getResourceHistory(resource: string, resourceId: string): AuditLog[];
	getStats(): {
		totalLogs: number;
		last24Hours: number;
		last7Days: number;
		topActions: {
			action: string;
			count: number;
		}[];
		topUsers: {
			userId: string;
			count: number;
		}[];
	};
	cleanupOldLogs(maxAgeDays?: number): number;
	export(format: "json" | "csv", options?: AuditSearchOptions): string | null;
}
export declare const auditLogger: AuditLoggerService;
export {};
//# sourceMappingURL=audit-logger.d.ts.map
