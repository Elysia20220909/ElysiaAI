// Structured Logging System
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

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

class Logger {
	private logDir: string;
	private logFile: string;
	private minLevel: LogLevel;
	private levelPriority: Record<LogLevel, number> = {
		trace: 0,
		debug: 1,
		info: 2,
		warn: 3,
		error: 4,
		fatal: 5,
	};

	constructor(logDir = "logs", minLevel: LogLevel = "info") {
		this.logDir = logDir;
		this.minLevel = minLevel;
		this.logFile = join(logDir, `app-${new Date().toISOString().split("T")[0]}.log`);

		if (!existsSync(logDir)) {
			mkdirSync(logDir, { recursive: true });
		}
	}

	private shouldLog(level: LogLevel): boolean {
		return this.levelPriority[level] >= this.levelPriority[this.minLevel];
	}

	private formatLog(entry: LogEntry): string {
		return `${JSON.stringify(entry)}\n`;
	}

	private writeLog(entry: LogEntry) {
		if (!this.shouldLog(entry.level)) return;

		const colors: Record<LogLevel, string> = {
			trace: "\x1b[90m",
			debug: "\x1b[36m",
			info: "\x1b[32m",
			warn: "\x1b[33m",
			error: "\x1b[31m",
			fatal: "\x1b[35m",
		};
		const reset = "\x1b[0m";
		const color = colors[entry.level];

		console.log(
			`${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.message}`,
			entry.context ? entry.context : "",
		);

		try {
			appendFileSync(this.logFile, this.formatLog(entry));
		} catch (error) {
			console.error("Failed to write to log file:", error);
		}
	}

	trace(message: string, context?: Record<string, unknown>) {
		this.writeLog({
			level: "trace",
			timestamp: new Date().toISOString(),
			message,
			context,
		});
	}

	debug(message: string, context?: Record<string, unknown>) {
		this.writeLog({
			level: "debug",
			timestamp: new Date().toISOString(),
			message,
			context,
		});
	}

	info(message: string, context?: Record<string, unknown>) {
		this.writeLog({
			level: "info",
			timestamp: new Date().toISOString(),
			message,
			context,
		});
	}

	warn(message: string, context?: Record<string, unknown>) {
		this.writeLog({
			level: "warn",
			timestamp: new Date().toISOString(),
			message,
			context,
		});
	}

	error(message: string, err?: Error, context?: Record<string, unknown>) {
		this.writeLog({
			level: "error",
			timestamp: new Date().toISOString(),
			message,
			context,
			error: err
				? {
						name: err.name,
						message: err.message,
						stack: err.stack,
					}
				: undefined,
		});
	}

	fatal(message: string, err?: Error, context?: Record<string, unknown>) {
		this.writeLog({
			level: "fatal",
			timestamp: new Date().toISOString(),
			message,
			context,
			error: err
				? {
						name: err.name,
						message: err.message,
						stack: err.stack,
					}
				: undefined,
		});
	}

	logRequest(
		method: string,
		path: string,
		status: number,
		duration: number,
		ip?: string,
		userId?: string,
	) {
		const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
		this.writeLog({
			level,
			timestamp: new Date().toISOString(),
			message: `${method} ${path} ${status}`,
			request: { method, path, ip, userId },
			duration,
		});
	}

	rotateLogs(retentionDays = 30) {
		const now = Date.now();
		const maxAge = retentionDays * 24 * 60 * 60 * 1000;

		if (!existsSync(this.logDir)) return;

		const fs = require("node:fs");
		const files = fs.readdirSync(this.logDir);
		for (const file of files) {
			const filePath = join(this.logDir, file);
			const stat = fs.statSync(filePath);
			const age = now - stat.mtimeMs;

			if (age > maxAge) {
				fs.unlinkSync(filePath);
				this.info(`Rotated old log file: ${file}`);
			}
		}
	}
}

export const logger = new Logger("logs", (process.env.LOG_LEVEL as LogLevel) || "info");
