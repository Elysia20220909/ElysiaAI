export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
export interface LogEntry {
	level: LogLevel;
	timestamp: string;
	message: string;
	context?: Record<string, unknown>;
	error?: {
		name: string;
		message: string;
		stack?: string;
	};
	request?: {
		method: string;
		path: string;
		ip?: string;
		userId?: string;
	};
	duration?: number;
}
declare class Logger {
	private logDir;
	private logFile;
	private minLevel;
	private levelPriority;
	constructor(logDir?: string, minLevel?: LogLevel);
	private shouldLog;
	private formatLog;
	private writeLog;
	trace(message: string, context?: Record<string, unknown>): void;
	debug(message: string, context?: Record<string, unknown>): void;
	info(message: string, context?: Record<string, unknown>): void;
	warn(message: string, context?: Record<string, unknown>): void;
	error(message: string, err?: Error, context?: Record<string, unknown>): void;
	fatal(message: string, err?: Error, context?: Record<string, unknown>): void;
	logRequest(
		method: string,
		path: string,
		status: number,
		duration: number,
		ip?: string,
		userId?: string,
	): void;
	rotateLogs(retentionDays?: number): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map
