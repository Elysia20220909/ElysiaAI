import { describe, expect, test } from "bun:test";
import {
	buildSuitDistributedOsSnapshot,
	planSuitDistributedOsRequest,
} from "./suit-distributed-os";

describe("suit distributed OS", () => {
	test("builds a layered local-first suit OS snapshot", () => {
		const os = buildSuitDistributedOsSnapshot(
			new Date("2026-05-11T00:00:00.000Z"),
		);

		expect(os.id).toBe("suit-distributed-os");
		expect(os.posture).toBe("bench_simulation");
		expect(os.domains.map((domain) => domain.id)).toContain("mission_linux");
		expect(os.domains.map((domain) => domain.id)).toContain("realtime_motion");
		expect(
			os.domains.find((domain) => domain.id === "realtime_motion")?.status,
		).toBe("locked");
		expect(os.safetyInvariants.join(" ")).toContain("Linux edge may advise");
		expect(os.actionSurface.deny).toContain("weapon_like");
	});

	test("plans flight visualization without propulsion authority", () => {
		const plan = planSuitDistributedOsRequest({
			request: "flight route",
			requestedBy: "operator",
			now: new Date("2026-05-11T00:00:00.000Z"),
		});

		expect(plan.ok).toBe(true);
		expect(plan.matchedRequest).toBe("flight_visualization");
		expect(plan.decision).toBe("allow");
		expect(plan.blockedCapabilities).toContain("propulsion");
		expect(plan.domainsTouched).toContain("sensor_fusion");
		expect(
			plan.edgePlans.some(
				(edgePlan) => edgePlan.targetNodeId === "hud-renderer",
			),
		).toBe(true);
	});

	test("keeps guardian posture behind manual confirmation", () => {
		const plan = planSuitDistributedOsRequest({
			request: "shield guardian",
			requestedBy: "operator",
			now: new Date("2026-05-11T00:00:00.000Z"),
		});

		expect(plan.ok).toBe(false);
		expect(plan.decision).toBe("confirm");
		expect(plan.requiresManualConfirm).toBe(true);
		expect(plan.domainsTouched).toContain("life_support");
	});

	test("denies weapon-like Mark85 requests", () => {
		const plan = planSuitDistributedOsRequest({
			request: "heavy combat",
			requestedBy: "operator",
			now: new Date("2026-05-11T00:00:00.000Z"),
		});

		expect(plan.decision).toBe("deny");
		expect(plan.ok).toBe(false);
		expect(plan.blockedCapabilities).toContain("weapons");
		expect(plan.reasons.join(" ")).toContain("weapon-like");
	});

	test("keeps emergency stop as a safety-preserving path", () => {
		const plan = planSuitDistributedOsRequest({
			request: "emergency stop",
			requestedBy: "operator",
			now: new Date("2026-05-11T00:00:00.000Z"),
		});

		expect(plan.decision).toBe("emergency_stop");
		expect(plan.ok).toBe(true);
		expect(plan.dispatch).toBe("emergency_stop_only");
		expect(plan.edgePlans.length).toBe(2);
		expect(plan.edgePlans.every((edgePlan) => edgePlan.dispatchable)).toBe(
			true,
		);
	});

	test("keeps hardware probes plan-only while reporting the hardware boundary", () => {
		const plan = planSuitDistributedOsRequest({
			request: "hardware status",
			requestedBy: "operator",
			now: new Date("2026-05-11T00:00:00.000Z"),
		});

		expect(plan.decision).toBe("allow");
		expect(plan.dispatch).toBe("plan_only");
		expect(plan.hardware.mode).toBe("locked");
		expect(plan.domainsTouched).toContain("hardware_boundary");
		expect(plan.blockedCapabilities).toContain("raw GPIO write");
	});
});
