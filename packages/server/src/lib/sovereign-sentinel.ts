import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defenseManager } from "./defense-manager";
import { logger } from "./logger";

/**
 * 🌌 Sovereign Sentinel Core (Phase 150)
 * "The Watcher at the Edge of the Abyss."
 *
 * This module orchestrates all Abyssal security scripts and maintains
 * system integrity through continuous trial, error, and reconciliation.
 */
class SovereignSentinel {
	private interval: Timer | null = null;
	private threatLevel = 0;
	private lastPulse = Date.now();
	private sentinelActive = false;
	private ledgerPath = join(process.cwd(), "AEGIS_LEDGER.md");
	private dnsQueryLog: string[] = []; // Stateful DNS tracking
	private cpuSpikeCount = 0; // Thermal attack tracking

	constructor() {
		this.initialize();
	}

	private initialize() {
		logger.info("🌀 Sovereign Sentinel: Initializing Neural Core...");
		this.startPulse();
	}

	/**
	 * システムの「鼓動」を開始。
	 * 脅威レベルに応じて監視密度を動的に変更する。
	 */
	private startPulse() {
		if (this.interval) clearInterval(this.interval);

		const baseDelay = 30000; // 30s
		const delay = Math.max(5000, baseDelay - this.threatLevel * 500);

		this.interval = setInterval(() => this.pulse(), delay);
		logger.info(`💓 Pulse Synchronized: Frequency = ${delay}ms`);
	}

	/**
	 * 周期的なシステム整合性チェック
	 */
	private async pulse() {
		if (this.sentinelActive) return;
		this.sentinelActive = true;

		try {
			logger.info("👁️ Sentinel Pulse: Scanning the Void...");

			// 1. ハードウェア整合性 (Counter-Espionage)
			await this.executeAbyssalScript("abyssal-counter-espionage.ps1");

			// 2. システム監査 (Anomaly Detection)
			await this.executeAbyssalScript("abyssal-system-audit.ps1");

			// 3. 自己修復 (Self-Healing)
			await this.executeAbyssalScript("abyssal-self-healing.ps1");

			// 3. 欺瞞レイヤーの更新 (Deception)
			if (this.threatLevel > 50) {
				await this.executeAbyssalScript("abyssal-deception.ps1");
			}

			this.lastPulse = Date.now();
			this.logToLedger("PULSE_NOMINAL", "System resonance stable.");
		} catch (error) {
			this.threatLevel += 10;
			logger.error("🛑 Pulse Divergence Detected!", error as Error);
			this.logToLedger(
				"PULSE_DIVERGENCE",
				`Threat Level Elevated: ${this.threatLevel}`,
			);
			this.startPulse(); // レートを上げて再試行
		} finally {
			this.sentinelActive = false;
		}
	}

	/**
	 * PowerShell スクリプトの実行とログのキャプチャ
	 */
	private async executeAbyssalScript(scriptName: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const scriptPath = join(process.cwd(), "scripts", scriptName);
			if (!existsSync(scriptPath)) {
				return reject(new Error(`Script not found: ${scriptName}`));
			}

			logger.info(`🔥 Executing Abyssal Protocol: ${scriptName}`);
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
				// Initial attempt: Only check for "ALERT"
				if (chunk.includes("ALERT")) this.threatLevel += 5;

				// Refined Intelligence: Detect DNS Tunneling Patterns (Base32/64 substrings)
				const dnsMatch = chunk.match(/([a-zA-Z0-9]{8,}\.){2,}[a-z.]+/g);
				if (dnsMatch) {
					this.dnsQueryLog.push(...dnsMatch);
					if (this.dnsQueryLog.length > 5) {
						logger.error(
							"🛑 CRITICAL: DNS Tunneling Pattern Detected! (NSA-Grade Exfiltration)",
						);
						this.threatLevel += 20;
						this.dnsQueryLog = []; // Reset after trigger
					}
				}

				// Thermal Pulse Detection: Rapid CPU activity logs
				if (chunk.includes("Pulsing CPU")) {
					this.cpuSpikeCount++;
					if (this.cpuSpikeCount > 3) {
						logger.warn("🌡️ ANOMALY: Side-Channel Thermal Pulsing Detected!");
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
	 * 主権レジャーへの記録
	 */
	private logToLedger(event: string, detail: string) {
		const timestamp = new Date().toISOString();
		const entry = `\n| ${timestamp} | ${event} | ${detail} |`;
		try {
			appendFileSync(this.ledgerPath, entry);
		} catch (e) {
			logger.error("Failed to write to Ledger", e as Error);
		}
	}

	/**
	 * 外部からの脅威報告受付
	 */
	public escalateThreat(amount: number) {
		this.threatLevel += amount;
		logger.warn(`🚀 Threat Escalated! Current Level: ${this.threatLevel}`);
		this.pulse(); // 即座にパルスを実行
	}
}

export const sovereignSentinel = new SovereignSentinel();
