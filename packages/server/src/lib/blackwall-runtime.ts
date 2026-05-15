import type { IceEvaluationInput } from "./ice-policy-engine";
import { icePolicyEngine } from "./ice-policy-engine";
import { containmentGrid } from "./containment-grid";
import { traceLogger } from "./trace-logger";
import { logger } from "./logger";

export interface RuntimeEvaluationResult {
	decision: ReturnType<typeof icePolicyEngine.evaluate>;
	containmentTicket?: ReturnType<typeof containmentGrid.createTicket>;
}

export class BlackwallRuntime {
	private blackoutMode = false;
	private readonly runtimeId = `blackwall_${Date.now()}`;

	public getStatus() {
		return {
			runtimeId: this.runtimeId,
			blackoutMode: this.blackoutMode,
			status: this.blackoutMode ? "LOCAL_BLACKOUT" : "ONLINE",
		};
	}

	public evaluate(input: IceEvaluationInput): RuntimeEvaluationResult {
		const decision = icePolicyEngine.evaluate(input);

		traceLogger.write({
			time: new Date().toISOString(),
			event: "blackwall.runtime.evaluated",
			risk: decision.risk,
			action: decision.action,
			process: input.process,
			destination: input.destination,
			reason: decision.reasons.join("; "),
		});

		logger.info("BLACKWALL evaluation complete", {
			risk: decision.risk,
			action: decision.action,
			iceLevel: decision.iceLevel,
			process: input.process,
			destination: input.destination,
		});

		let containmentTicket;

		if (containmentGrid.shouldContain(decision)) {
			containmentTicket = containmentGrid.createTicket(input, decision);

			logger.warn("Containment Grid activated", {
				ticketId: containmentTicket.id,
				iceLevel: containmentTicket.iceLevel,
				status: containmentTicket.status,
			});
		}

		if (decision.iceLevel === "L5_LOCAL_BLACKOUT") {
			this.activateLocalBlackout("Critical runtime evaluation threshold reached.");
		}

		return {
			decision,
			containmentTicket,
		};
	}

	public activateLocalBlackout(reason: string) {
		this.blackoutMode = true;

		traceLogger.write({
			time: new Date().toISOString(),
			event: "blackwall.runtime.local_blackout",
			action: "local_blackout",
			reason,
		});

		logger.error("BLACKWALL Local Blackout activated", undefined, {
			reason,
		});
	}

	public releaseLocalBlackout(reason: string) {
		this.blackoutMode = false;

		traceLogger.write({
			time: new Date().toISOString(),
			event: "blackwall.runtime.blackout_released",
			action: "observe",
			reason,
		});

		logger.warn("BLACKWALL Local Blackout released", {
			reason,
		});
	}
}

export const blackwallRuntime = new BlackwallRuntime();
