import { describe, expect, test } from "bun:test";
import {
	buildSuitEdgeRuntimeSnapshot,
	planSuitEdgeCommand,
	recordSuitEdgeHeartbeat,
	resetSuitEdgeRuntimeForTests,
} from "./suit-edge-runtime";

describe("suit edge runtime", () => {
	test("models a Raspberry Pi style edge brain with MCU nodes", () => {
		resetSuitEdgeRuntimeForTests();
		const snapshot = buildSuitEdgeRuntimeSnapshot(
			new Date("2026-05-10T00:00:00.000Z"),
		);

		expect(snapshot.posture).toBe("local_edge_ready");
		expect(snapshot.nodes.some((node) => node.kind === "edge_brain")).toBe(
			true,
		);
		expect(snapshot.nodes.some((node) => node.runtime === "rtos_mcu")).toBe(
			true,
		);
		expect(snapshot.buses.some((bus) => bus.kind === "can")).toBe(true);
		expect(snapshot.hardRules).toContain("no raw GPIO/CAN writes from API");
	});

	test("accepts node heartbeats without opening direct actuation", () => {
		resetSuitEdgeRuntimeForTests();
		const node = recordSuitEdgeHeartbeat({
			nodeId: "edge-brain-01",
			cpuLoad: 33,
			cpuTempC: 52,
			signalQuality: 0.95,
			now: new Date("2026-05-10T00:00:00.000Z"),
		});

		expect(node.telemetry.cpuLoad).toBe(33);
		expect(node.telemetry.cpuTempC).toBe(52);
	});

	test("allows informational diagnostics on ready nodes", () => {
		resetSuitEdgeRuntimeForTests();
		const plan = planSuitEdgeCommand(
			{
				targetNodeId: "edge-brain-01",
				command: "run_diagnostics",
				requestedBy: "operator",
			},
			new Date("2026-05-10T00:00:00.000Z"),
		);

		expect(plan.decision).toBe("allow");
		expect(plan.route.transport).toBe("local_supervised");
		expect(plan.dispatchable).toBe(true);
	});

	test("denies direct actuation even when a node advertises it", () => {
		resetSuitEdgeRuntimeForTests();
		const plan = planSuitEdgeCommand(
			{
				targetNodeId: "motion-mcu-limbs",
				command: "actuate",
				requestedBy: "operator",
			},
			new Date("2026-05-10T00:00:00.000Z"),
		);

		expect(plan.decision).toBe("deny");
		expect(plan.reasons.join(" ")).toContain("not dispatchable");
	});

	test("treats safety relay arming as confirm-only", () => {
		resetSuitEdgeRuntimeForTests();
		const plan = planSuitEdgeCommand(
			{
				targetNodeId: "safety-relay",
				command: "arm_safety_relay",
				requestedBy: "operator",
			},
			new Date("2026-05-10T00:00:00.000Z"),
		);

		expect(plan.decision).toBe("confirm");
		expect(plan.requiresManualConfirm).toBe(true);
		expect(plan.route.transport).toBe("simulation_only");
	});

	test("keeps emergency stop dispatchable", () => {
		resetSuitEdgeRuntimeForTests();
		const plan = planSuitEdgeCommand(
			{
				targetNodeId: "power-mcu-torso",
				command: "emergency_stop",
				requestedBy: "operator",
			},
			new Date("2026-05-10T00:00:00.000Z"),
		);

		expect(plan.decision).toBe("emergency_stop");
		expect(plan.dispatchable).toBe(true);
	});
});
