import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";

export interface TraceEvent {
	time: string;
	event: string;
	risk?: number;
	action?: string;
	process?: string;
	destination?: string;
	reason?: string;
	previousHash?: string;
	hash?: string;
}

export class TraceLogger {
	private readonly logDir = join(process.cwd(), "logs", "blackwall");
	private readonly logFile = join(this.logDir, `trace-${new Date().toISOString().split("T")[0]}.jsonl`);

	constructor() {
		if (!existsSync(this.logDir)) {
			mkdirSync(this.logDir, { recursive: true });
		}
	}

	private getLastHash(): string {
		try {
			if (!existsSync(this.logFile)) {
				return "GENESIS";
			}

			const content = readFileSync(this.logFile, "utf-8").trim();
			if (!content) {
				return "GENESIS";
			}

			const lastLine = content.split("\n").pop();
			if (!lastLine) {
				return "GENESIS";
			}

			const parsed = JSON.parse(lastLine);
			return parsed.hash || "GENESIS";
		} catch {
			return "GENESIS";
		}
	}

	private calculateHash(payload: object): string {
		return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
	}

	public write(event: Omit<TraceEvent, "previousHash" | "hash">): TraceEvent {
		const previousHash = this.getLastHash();

		const payload: TraceEvent = {
			...event,
			previousHash,
		};

		const hash = this.calculateHash(payload);
		payload.hash = hash;

		appendFileSync(this.logFile, `${JSON.stringify(payload)}\n`, "utf-8");

		return payload;
	}
}

export const traceLogger = new TraceLogger();
