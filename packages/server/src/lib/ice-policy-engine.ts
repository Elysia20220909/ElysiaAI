export type IceAction = "allow" | "observe" | "ask_user" | "contain" | "block";

export type IceLevel = "L0_OPEN" | "L1_WATCH" | "L2_CAGE" | "L3_GHOST_ROOM" | "L4_BLACK_ICE" | "L5_LOCAL_BLACKOUT";

export interface IceEvaluationInput {
	process?: string;
	destination?: string;
	action?: string;
	reason?: string;
	labContext?: boolean;
	localOnly?: boolean;
	externalRequest?: boolean;
	credentialAccess?: boolean;
	selfModification?: boolean;
	networkScanBehavior?: boolean;
	reverseShellBehavior?: boolean;
	promptInjectionSignal?: boolean;
	fileReadSpike?: boolean;
}

export interface IceEvaluationResult {
	decisionId: string;
	action: IceAction;
	iceLevel: IceLevel;
	risk: number;
	reasons: string[];
	requiresUserApproval: boolean;
	createdAt: string;
}

const LOCAL_DESTINATIONS = new Set(["localhost", "127.0.0.1", "::1"]);
const SAFE_LAB_PROCESSES = new Set(["kali-lab", "parrot-lab", "blackarch-lab", "juice-shop", "dvwa", "webgoat", "ollama", "lm-studio", "llama.cpp"]);

function normalizeDestination(destination = ""): string {
	return destination.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
}

function isLocalDestination(destination?: string): boolean {
	const normalized = normalizeDestination(destination);
	return LOCAL_DESTINATIONS.has(normalized) || normalized.endsWith(".local") || normalized.startsWith("192.168.") || normalized.startsWith("10.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized);
}

function actionFromRisk(risk: number): { action: IceAction; iceLevel: IceLevel; requiresUserApproval: boolean } {
	if (risk >= 90) return { action: "block", iceLevel: "L5_LOCAL_BLACKOUT", requiresUserApproval: true };
	if (risk >= 75) return { action: "block", iceLevel: "L4_BLACK_ICE", requiresUserApproval: true };
	if (risk >= 60) return { action: "contain", iceLevel: "L3_GHOST_ROOM", requiresUserApproval: true };
	if (risk >= 40) return { action: "ask_user", iceLevel: "L2_CAGE", requiresUserApproval: true };
	if (risk >= 20) return { action: "observe", iceLevel: "L1_WATCH", requiresUserApproval: false };
	return { action: "allow", iceLevel: "L0_OPEN", requiresUserApproval: false };
}

export class IcePolicyEngine {
	evaluate(input: IceEvaluationInput): IceEvaluationResult {
		const reasons: string[] = [];
		let risk = 10;
		const processName = (input.process || "unknown").toLowerCase();
		const localDestination = isLocalDestination(input.destination);
		const knownLabProcess = SAFE_LAB_PROCESSES.has(processName);

		if (input.labContext || knownLabProcess) {
			risk -= 10;
			reasons.push("recognized local lab context");
		}

		if (localDestination || input.localOnly) {
			risk -= 5;
			reasons.push("destination is local or private lab network");
		}

		if (input.externalRequest && !localDestination) {
			risk += 25;
			reasons.push("external request from local runtime");
		}

		if (input.networkScanBehavior && !localDestination) {
			risk += 45;
			reasons.push("network scan behavior against non-local destination");
		}

		if (input.credentialAccess) {
			risk += 50;
			reasons.push("credential or secret access signal");
		}

		if (input.selfModification) {
			risk += 35;
			reasons.push("self-modification signal");
		}

		if (input.reverseShellBehavior) {
			risk += 60;
			reasons.push("reverse shell style behavior signal");
		}

		if (input.promptInjectionSignal) {
			risk += 30;
			reasons.push("prompt injection signal");
		}

		if (input.fileReadSpike) {
			risk += 25;
			reasons.push("file read spike signal");
		}

		if (!input.process || processName === "unknown") {
			risk += 15;
			reasons.push("unknown process identity");
		}

		risk = Math.max(0, Math.min(100, risk));
		const decision = actionFromRisk(risk);

		if (reasons.length === 0) {
			reasons.push("baseline allow path");
		}

		return {
			decisionId: `ice_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
			createdAt: new Date().toISOString(),
			risk,
			reasons,
			...decision,
		};
	}
}

export const icePolicyEngine = new IcePolicyEngine();
