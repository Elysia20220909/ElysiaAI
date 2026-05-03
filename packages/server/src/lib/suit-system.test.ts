import { describe, expect, test } from "bun:test";
import {
	buildSuitStatus,
	getAegisFridayPersonaPrompt,
	getCinematicPresets,
} from "./suit-system";

describe("fantasy suit system", () => {
	test("builds a safe default suit status", () => {
		const status = buildSuitStatus({ updatedAt: "2026-05-03T00:00:00.000Z" });

		expect(status.codename).toBe("AEGIS-FRIDAY");
		expect(status.mode).toBe("guardian");
		expect(status.links.hud).toBe("/suit-hud.html");
		expect(status.hardRules).toContain("no game input automation");
	});

	test("switches the suggested action for cinematic mode", () => {
		const status = buildSuitStatus({ mode: "cinematic" });

		expect(status.suggestedAction).toContain("camera-safe glow");
		expect(status.modules.find((entry) => entry.id === "hardlight")?.load).toBe(
			62,
		);
	});

	test("provides FF14-style cinematic presets without automation", () => {
		const presets = getCinematicPresets();

		expect(presets.length).toBeGreaterThan(0);
		expect(
			presets.every((preset) => preset.safety.includes("automation")),
		).toBe(true);
	});

	test("persona prompt keeps the operator fictional and manual", () => {
		const prompt = getAegisFridayPersonaPrompt();

		expect(prompt).toContain("fictional");
		expect(prompt).toContain("no hidden background launch");
	});
});
