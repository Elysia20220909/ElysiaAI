import { describe, expect, test } from "bun:test";
import {
	buildHoloLensReferenceProfile,
	matchHoloLensVoiceCommand,
	planHoloLensVoiceCommand,
} from "./suit-hololens-profile";

describe("suit hololens reference profile", () => {
	test("captures the HoloLens IronMan voice command profile", () => {
		const profile = buildHoloLensReferenceProfile(
			new Date("2026-05-11T00:00:00.000Z"),
		);

		expect(profile.source.repository).toContain("Hololens_IronMan");
		expect(profile.source.license).toBe("MIT");
		expect(profile.voiceCommands.map((command) => command.phrase)).toContain(
			"Jarvis Scan",
		);
		expect(profile.hardRules).toContain("do not copy cloud face API keys");
	});

	test("matches Jarvis and Friday aliases", () => {
		expect(matchHoloLensVoiceCommand("Jarvis Initiate")?.id).toBe(
			"initiate_hud",
		);
		expect(matchHoloLensVoiceCommand("friday scan")?.id).toBe("scan_faces");
	});

	test("keeps face scanning local-only and confirm-gated", () => {
		const plan = planHoloLensVoiceCommand("Jarvis Scan", "operator");

		expect(plan.decision).toBe("confirm");
		expect(plan.matched?.requiresCamera).toBe(true);
		expect(plan.matched?.localOnly).toBe(true);
		expect(plan.reasons.join(" ")).toContain("no cloud face API");
	});

	test("maps flight activation to HUD overlay rather than actuation", () => {
		const plan = planHoloLensVoiceCommand("Jarvis Activate", "operator");

		expect(plan.decision).toBe("allow");
		expect(plan.matched?.action).toContain("HUD overlay");
		expect(plan.reasons.join(" ")).toContain("no propulsion");
		expect(plan.hardwarePlan).toBeNull();
	});

	test("keeps physical helmet bridge commands confirm-only", () => {
		const plan = planHoloLensVoiceCommand("Jarvis Initiate", "operator");

		expect(plan.decision).toBe("confirm");
		expect(plan.matched?.requiresPhysicalBridge).toBe(true);
		expect(plan.hardwarePlan?.operation).toBe("gpio_write");
	});

	test("denies unknown voice phrases", () => {
		const plan = planHoloLensVoiceCommand(
			"Jarvis Launch Everything",
			"operator",
		);

		expect(plan.ok).toBe(false);
		expect(plan.decision).toBe("deny");
		expect(plan.matched).toBeNull();
	});
});
