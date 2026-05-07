import { spawn } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { logger } from "./logger";

/**
 * Sovereign Sentinel Core (Phase 150)
 * "The Watcher at the Edge of the Abyss."
 *
 * This module orchestrates all Abyssal security scripts and maintains
 * system integrity through continuous trial, error, and reconciliation.
 */
class SovereignSentinel {
	private interval: Timer | null = null;
	private threatLevel = 0;
	private lastLedgerLog = Date.now(); // Initialize to current time
	private lastEntryHash =
		"0000000000000000000000000000000000000000000000000000000000000000"; // Genesis Hash
	private sentinelActive = false;
	private ledgerPath = join(process.cwd(), "AEGIS_LEDGER.md");
	private dnsQueryLog: string[] = []; // Stateful DNS tracking
	private cpuSpikeCount = 0; // Thermal attack tracking

	constructor() {
		this.initialize();
	}

	private initialize() {
		logger.info("[INIT] Sovereign Sentinel: Initializing Neural Core...");
		this.startPulse();
	}

	/**
	 * Start the system pulse.
	 * Dynamically changes monitoring density based on threat level.
	 */
	private startPulse() {
		if (this.interval) clearInterval(this.interval);

		const baseDelay = 30000; // 30s
		const delay = Math.max(5000, baseDelay - this.threatLevel * 500);

		this.interval = setInterval(() => this.pulse(), delay);
		logger.info(`[PULSE] Synchronized: Frequency = ${delay}ms`);
	}

	/**
	 * Periodic system integrity check
	 */
	private async pulse() {
		if (this.sentinelActive) return;
		this.sentinelActive = true;

		try {
			logger.info("[SCAN] Sentinel Pulse: Scanning the Void...");

			// 1. Hardware Integrity (Counter-Espionage)
			await this.executeAbyssalScript("abyssal-counter-espionage.ps1");

			// 2. System Audit (Anomaly Detection)
			await this.executeAbyssalScript("abyssal-system-audit.ps1");

			// 3. Self-Healing
			await this.executeAbyssalScript("abyssal-self-healing.ps1");

			// 4. Deception Layer Update
			if (this.threatLevel > 50) {
				await this.executeAbyssalScript("abyssal-deception.ps1");
			}

			// Only log to ledger if significant time has passed or something is wrong
			const oneHour = 3600000;
			if (Date.now() - this.lastLedgerLog > oneHour) {
				this.logToLedger(
					"PULSE_NOMINAL",
					"System resonance stable (Hourly Heartbeat).",
				);
				this.lastLedgerLog = Date.now();
			}
		} catch (error) {
			this.threatLevel += 10;
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error(`[ERR] Pulse Divergence Detected: ${errorMessage}`);
			this.logToLedger(
				"PULSE_DIVERGENCE",
				`Threat Level Elevated: ${this.threatLevel} | Reason: ${errorMessage.substring(0, 50)}`,
			);
			this.startPulse(); // Increase frequency and retry
		} finally {
			this.sentinelActive = false;
		}
	}

	/**
	 * Execute PowerShell script and capture logs
	 */
	private async executeAbyssalScript(scriptName: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const scriptPath = join(process.cwd(), "scripts", scriptName);
			if (!existsSync(scriptPath)) {
				return reject(new Error(`Script not found: ${scriptName}`));
			}

			logger.info(`[EXEC] Executing Abyssal Protocol: ${scriptName}`);
			const ps = spawn("powershell.exe", [
				"-ExecutionPolicy",
				"Bypass",
				"-File",
				scriptPath,
			]);

			let output = "";
			let errorOutput = "";

			ps.stdout.on("data", (data) => {
				const chunk = data.toString();
				output += chunk;

				// --- Trial & Error: Stateful Anomaly Detection ---
				if (chunk.includes("ALERT")) this.threatLevel += 5;

				// Detect DNS Tunneling Patterns
				const dnsMatch = chunk.match(/([a-zA-Z0-9]{8,}\.){2,}[a-z.]+/g);
				if (dnsMatch) {
					this.dnsQueryLog.push(...dnsMatch);
					if (this.dnsQueryLog.length > 5) {
						logger.error(
							"[ALERT] CRITICAL: DNS Tunneling Pattern Detected! (NSA-Grade Exfiltration)",
						);
						this.threatLevel += 20;
						this.dnsQueryLog = [];
					}
				}

				// Thermal Pulse Detection
				if (chunk.includes("Pulsing CPU")) {
					this.cpuSpikeCount++;
					if (this.cpuSpikeCount > 3) {
						logger.warn(
							"[ALERT] ANOMALY: Side-Channel Thermal Pulsing Detected!",
						);
						this.threatLevel += 15;
					}
				}
			});

			ps.stderr.on("data", (data) => {
				errorOutput += data.toString();
			});

			ps.on("close", (code) => {
				if (code === 0) {
					resolve(output);
				} else {
					reject(
						new Error(
							`Protocol ${scriptName} failed with code ${code}\n${errorOutput}`,
						),
					);
				}
			});
		});
	}

	/**
	 * Log to Sovereign Ledger (Hash-Chained)
	 */
	private logToLedger(event: string, detail: string) {
		const timestamp = new Date().toISOString();
		const rawContent = `${timestamp}|${event}|${detail}|${this.lastEntryHash}`;

		// Calculate new chain hash
		const { createHash } = require("node:crypto");
		const newHash = createHash("sha256").update(rawContent).digest("hex");

		const entry = `\n| ${timestamp} | ${event} | ${detail} | ${newHash.substring(0, 8)}... |`;

		try {
			appendFileSync(this.ledgerPath, entry);
			this.lastEntryHash = newHash; // Update chain state
		} catch (e) {
			logger.error("Failed to write to Ledger", e as Error);
		}
	}

	/**
	 * Escalate threat from external source
	 */
	public escalateThreat(amount: number) {
		this.threatLevel += amount;
		logger.warn(`[ALERT] Threat Escalated! Current Level: ${this.threatLevel}`);
		this.pulse();
	}
}

export const sovereignSentinel = new SovereignSentinel();
