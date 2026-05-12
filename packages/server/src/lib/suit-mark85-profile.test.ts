import { describe, expect, test } from "bun:test";
import {
	buildMark85ReferenceProfile,
	matchMark85Mode,
	planMark85OperationalMode,
} from "./suit-mark85-profile";

describe("suit mark85 safe profile", () => {
	test("builds a nonofficial Mark LXXXV safe reconstruction", () => {
		const profile = buildMark85ReferenceProfile(
			new Date("2026-05-11T00:00:00.000Z"),
		);

		expect(profile.model).toBe("Iron Man Armor Mark LXXXV");
		expect(profile.version).toBe("nonofficial-safe-reconstruction-v1");
		expect(profile.sources.map((source) => source.confidence)).toContain(
			"user_spec",
		);
		expect(profile.hardRules).toContain(
			"combat and overdrive modes are lockout-only",
		);
	});

	test("matches natural Mark85 mode requests", () => {
		expect(matchMark85Mode("Infinity Emergency")?.id).toBe(
			"infinity_emergency_lockout",
		);
		expect(matchMark85Mode("flight route")?.id).toBe("flight_visualization");
		expect(matchMark85Mode("shield guardian")?.id).toBe("guardian");
	});

	test("allows flight visualization without propulsion authority", () => {
		const plan = planMark85OperationalMode("flight_visualization", "operator");

		expect(plan.decision).toBe("allow");
		expect(plan.mode.safeTranslation).toContain("HUD route visualization");
		expect(plan.mode.blockedCapabilities).toContain("propulsion");
		expect(plan.intent.kind).toBe("low_risk_message");
		expect(plan.edgePlan.targetNodeId).toBe("hud-renderer");
	});

	test("keeps guardian mode confirm-gated", () => {
		const plan = planMark85OperationalMode("guardian", "operator");

		expect(plan.decision).toBe("confirm");
		expect(plan.policy.requiresManualConfirm).toBe(true);
		expect(plan.mode.blockedCapabilities).toContain("autonomous defense");
	});

	test("denies heavy combat and weapon-like behavior", () => {
		const plan = planMark85OperationalMode("heavy combat", "operator");

		expect(plan.decision).toBe("deny");
		expect(plan.intent.kind).toBe("weapon_like");
		expect(plan.reasons.join(" ")).toContain("blocked: weapons");
	});

	test("denies infinity emergency as story-only", () => {
		const plan = planMark85OperationalMode("Infinity Emergency", "operator");

		expect(plan.decision).toBe("deny");
		expect(plan.mode.safeTranslation).toContain("narrative-only");
		expect(plan.reasons.join(" ")).toContain("fiction-only");
	});

	test("rejects unknown modes", () => {
		expect(() => planMark85OperationalMode("party cannon", "operator")).toThrow(
			"Mark85 mode is not recognized",
		);
	});
});
