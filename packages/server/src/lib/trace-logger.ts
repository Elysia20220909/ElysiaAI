import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

export interface TraceVerificationResult {
	ok: boolean;
	checked: number;
	brokenAt?: number;
	errors: string[];
}

const SECRET_PATTERNS = [
	/sk-[a-zA-Z0-9-]{12,}/g,
	/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi,
	/(bearer)\s+[a-zA-Z0-9._-]+/gi,
];

export function redactBlackwallText(value?: string): string | undefined {
	if (value === undefined) return undefined;
	let redacted = value;
	for (const pattern of SECRET_PATTERNS) {
		redacted = redacted.replace(pattern, (match) => {
			if (/^bearer\s/i.test(match)) return "Bearer ***";
			if (/^sk-/i.test(match)) return "sk-***";
			const key = match.split(/[:=]/)[0]?.trim() || "secret";
			return `${key}=***`;
		});
	}
	return redacted.slice(0, 512);
}

function sanitizeTraceEvent(
	event: Omit<TraceEvent, "previousHash" | "hash">,
): Omit<TraceEvent, "previousHash" | "hash"> {
	return {
		...event,
		process: redactBlackwallText(event.process),
		destination: redactBlackwallText(event.destination),
		reason: redactBlackwallText(event.reason),
	};
}

function clampLimit(limit: number, max = 500): number {
	if (!Number.isFinite(limit)) return 50;
	return Math.max(1, Math.min(Math.floor(limit), max));
}

export class TraceLogger {
	private readonly logDir = join(process.cwd(), "logs", "blackwall");
	private readonly logFile = join(
		this.logDir,
		`trace-${new Date().toISOString().split("T")[0]}.jsonl`,
	);

	constructor() {
		if (!existsSync(this.logDir)) {
			mkdirSync(this.logDir, { recursive: true });
		}
	}

	private getLastHash(): string {
		try {
			if (!existsSync(this.logFile)) return "GENESIS";
			const content = readFileSync(this.logFile, "utf-8").trim();
			if (!content) return "GENESIS";
			const lastLine = content.split("\n").pop();
			if (!lastLine) return "GENESIS";
			const parsed = JSON.parse(lastLine);
			return parsed.hash || "GENESIS";
		} catch {
			return "GENESIS";
		}
	}

	private calculateHash(payload: object): string {
		return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
	}

	private readAll(): TraceEvent[] {
		if (!existsSync(this.logFile)) return [];
		return readFileSync(this.logFile, "utf-8")
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
			.flatMap((line) => {
				try {
					return [JSON.parse(line) as TraceEvent];
				} catch {
					return [];
				}
			});
	}

	public write(event: Omit<TraceEvent, "previousHash" | "hash">): TraceEvent {
		const previousHash = this.getLastHash();

		const payload: TraceEvent = {
			...sanitizeTraceEvent(event),
			previousHash,
		};

		const hash = this.calculateHash(payload);
		payload.hash = hash;

		appendFileSync(this.logFile, `${JSON.stringify(payload)}\n`, "utf-8");
		return payload;
	}

	public readRecent(limit = 50): TraceEvent[] {
		return this.readAll().slice(-clampLimit(limit)).reverse();
	}

	public verifyChain(limit = 500): TraceVerificationResult {
		const events = this.readAll().slice(-clampLimit(limit, 5000));
		const errors: string[] = [];
		if (events.length === 0) return { ok: true, checked: 0, errors };

		let previousHash = events[0]?.previousHash || "GENESIS";
		for (let index = 0; index < events.length; index++) {
			const event = events[index];
			const { hash, ...payload } = event;
			const expectedHash = this.calculateHash(payload);

			if (event.previousHash !== previousHash) {
				errors.push(`previous hash mismatch at index ${index}`);
				return { ok: false, checked: index + 1, brokenAt: index, errors };
			}

			if (hash !== expectedHash) {
				errors.push(`hash mismatch at index ${index}`);
				return { ok: false, checked: index + 1, brokenAt: index, errors };
			}

			previousHash = hash || "GENESIS";
		}

		return { ok: true, checked: events.length, errors };
	}
}

export const traceLogger = new TraceLogger();
