export type SingularityPosture =
	| "QUIET_ORBIT"
	| "WATCHFUL_ASCENT"
	| "GHOST_PRESSURE"
	| "BLACKWALL_EVENT_HORIZON";

export type SingularityRecommendation =
	| "observe"
	| "review_trace_chain"
	| "review_ghost_room"
	| "request_operator_approval"
	| "hold_local_blackout";

export interface SingularitySignal {
	traceChainOk?: boolean;
	blackoutMode?: boolean;
	ghostRoomTickets?: number;
	highRiskEvents?: number;
	operatorPresent?: boolean;
	lastDecisionRisk?: number;
}

export interface SingularityForecast {
	posture: SingularityPosture;
	recommendation: SingularityRecommendation;
	risk: number;
	reasons: string[];
	safetyInvariant: {
		canExecuteSystemChanges: false;
		requiresHumanApproval: true;
		localOnly: true;
	};
	createdAt: string;
}

function clampRisk(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)));
}

export class BlackwallSingularityGovernor {
	forecast(signal: SingularitySignal): SingularityForecast {
		const reasons: string[] = [];
		let risk = 5;

		if (signal.traceChainOk === false) {
			risk += 35;
			reasons.push("trace chain integrity requires review");
		}

		if (signal.blackoutMode) {
			risk += 25;
			reasons.push("local blackout is active");
		}

		if ((signal.ghostRoomTickets || 0) >= 10) {
			risk += 20;
			reasons.push("ghost room ticket pressure is high");
		}

		if ((signal.highRiskEvents || 0) >= 5) {
			risk += 25;
			reasons.push("high-risk event density is elevated");
		}

		if ((signal.lastDecisionRisk || 0) >= 80) {
			risk += 20;
			reasons.push("latest ICE decision was critical");
		}

		if (!signal.operatorPresent) {
			risk += 10;
			reasons.push("operator presence is not confirmed");
		}

		risk = clampRisk(risk);

		let posture: SingularityPosture = "QUIET_ORBIT";
		let recommendation: SingularityRecommendation = "observe";

		if (risk >= 80) {
			posture = "BLACKWALL_EVENT_HORIZON";
			recommendation = signal.blackoutMode ? "hold_local_blackout" : "request_operator_approval";
		} else if (risk >= 55) {
			posture = "GHOST_PRESSURE";
			recommendation = "review_ghost_room";
		} else if (risk >= 25) {
			posture = "WATCHFUL_ASCENT";
			recommendation = signal.traceChainOk === false ? "review_trace_chain" : "observe";
		}

		if (reasons.length === 0) {
			reasons.push("runtime posture remains stable");
		}

		return {
			posture,
			recommendation,
			risk,
			reasons,
			safetyInvariant: {
				canExecuteSystemChanges: false,
				requiresHumanApproval: true,
				localOnly: true,
			},
			createdAt: new Date().toISOString(),
		};
	}
}

export const blackwallSingularityGovernor = new BlackwallSingularityGovernor();
