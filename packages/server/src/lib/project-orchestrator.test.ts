import { expect, test } from "bun:test";
import {
	type ProjectSubsystem,
	summarizeProjectReadiness,
} from "./project-orchestrator";

function subsystem(status: ProjectSubsystem["status"]) {
	return { status };
}

test("project readiness is ready when core lanes are online", () => {
	const result = summarizeProjectReadiness([
		subsystem("online"),
		subsystem("ready"),
		subsystem("online"),
	]);

	expect(result.readiness).toBe("ready");
	expect(result.score).toBe(100);
});

test("project readiness is partial when degraded lanes need work", () => {
	const result = summarizeProjectReadiness([
		subsystem("online"),
		subsystem("degraded"),
		subsystem("attention"),
	]);

	expect(result.readiness).toBe("partial");
	expect(result.score).toBe(72);
});

test("project readiness asks for attention when most lanes are offline", () => {
	const result = summarizeProjectReadiness([
		subsystem("offline"),
		subsystem("attention"),
		subsystem("offline"),
	]);

	expect(result.readiness).toBe("attention");
	expect(result.score).toBe(22);
});
