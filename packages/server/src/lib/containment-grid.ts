import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { IceEvaluationInput, IceEvaluationResult, IceLevel } from "./ice-policy-engine";
import { traceLogger } from "./trace-logger";

export type ContainmentStatus = "observed" | "caged" | "ghost_room" | "black_ice" | "local_blackout";

export interface ContainmentTicket {
	id: string;
	status: ContainmentStatus;
	iceLevel: IceLevel;
	risk: number;
	process?: string;
	destination?: string;
	reason?: string;
	createdAt: string;
	decisionId: string;
	snapshotPath: string;
}

function statusFromIceLevel(iceLevel: IceLevel): ContainmentStatus {
	switch (iceLevel) {
		case "L5_LOCAL_BLACKOUT":
			return "local_blackout";
		case "L4_BLACK_ICE":
			return "black_ice";
		case "L3_GHOST_ROOM":
			return "ghost_room";
		case "L2_CAGE":
			return "caged";
		default:
			return "observed";
	}
}

export class ContainmentGrid {
	private readonly gridDir = join(process.cwd(), "logs", "blackwall", "ghost-room");

	constructor() {
		if (!existsSync(this.gridDir)) {
			mkdirSync(this.gridDir, { recursive: true });
		}
	}

	public shouldContain(decision: IceEvaluationResult): boolean {
		return decision.action === "contain" || decision.action === "block" || decision.iceLevel === "L2_CAGE";
	}

	public createTicket(input: IceEvaluationInput, decision: IceEvaluationResult): ContainmentTicket {
		const id = `qrn_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
		const snapshotPath = join(this.gridDir, `${id}.json`);
		const ticket: ContainmentTicket = {
			id,
			status: statusFromIceLevel(decision.iceLevel),
			iceLevel: decision.iceLevel,
			risk: decision.risk,
			process: input.process,
			destination: input.destination,
			reason: input.reason || decision.reasons.join("; "),
			createdAt: new Date().toISOString(),
			decisionId: decision.decisionId,
			snapshotPath,
		};

		const snapshot = {
			ticket,
			input,
			decision,
			safety: {
				externalNetworkGranted: false,
				autoExecutionGranted: false,
				requiresUserApproval: decision.requiresUserApproval,
			},
		};

		writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
		traceLogger.write({
			time: ticket.createdAt,
			event: "blackwall.containment.ticket_created",
			risk: ticket.risk,
			action: ticket.status,
			process: ticket.process,
			destination: ticket.destination,
			reason: ticket.reason,
		});

		return ticket;
	}
}

export const containmentGrid = new ContainmentGrid();
