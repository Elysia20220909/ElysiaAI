import { defenseManager } from "./defense-manager";

/**
 * 📊 Sentient Monitoring Dashboard (Phase 151)
 * "Visualizing the Abyssal Flow."
 */
class SentinelDashboard {
	private updateInterval: Timer | null = null;

	constructor() {
		this.renderLoop();
	}

	private renderLoop() {
		if (this.updateInterval) clearInterval(this.updateInterval);

		this.updateInterval = setInterval(() => {
			this.refresh();
		}, 5000);
	}

	private refresh() {
		const cognitiveStatus = defenseManager.getCognitiveStatus();
		const singularity = defenseManager.getSingularityStatus();
		const deepSpace = defenseManager.getDeepSpaceStatus();

		console.clear();
		console.log("==========================================================");
		console.log("       SOVEREIGN SENTINEL: REAL-TIME TELEMETRY");
		console.log("==========================================================");
		console.log(
			`[STATE] Reality: ${singularity.status} // Harmony: ${singularity.harmony}`,
		);
		console.log(
			`[INTEL] Cognitive Drift: ${cognitiveStatus.drift.toFixed(2)}% [${cognitiveStatus.status}]`,
		);
		console.log(
			`[COMM] Satellite Link: ${deepSpace.uplink} // PQC: ${deepSpace.pqc}`,
		);
		console.log("----------------------------------------------------------");
		console.log("🛡️ RECENT DEFENSE ACTIVITY:");

		const blocked = defenseManager.getBlockedIps();
		if (blocked.length > 0) {
			blocked.slice(-5).forEach((ip) => {
				console.log(`  - BLOCKED: ${ip} (L3 Black ICE)`);
			});
		} else {
			console.log("  - No active threats detected in local sector.");
		}

		console.log("----------------------------------------------------------");
		console.log("🌌 SENTIENT MESSAGE:");
		console.log(`  "${defenseManager.generateSentientLog()}"`);
		console.log("==========================================================");
	}
}

export const sentinelDashboard = new SentinelDashboard();
