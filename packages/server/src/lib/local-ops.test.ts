import { describe, expect, test } from "bun:test";
import type { HealthStatus } from "./health";
import {
	buildLocalOpsOverview,
	normalizeLocalOpsUrl,
	summarizeOpsReadiness,
} from "./local-ops";

const now = "2026-05-03T00:00:00.000Z";

function service(status: "up" | "down" | "degraded" | "disabled") {
	return { status, lastCheck: now };
}

const healthySnapshot: HealthStatus = {
	status: "healthy",
	timestamp: now,
	uptime: 12,
	services: {
		redis: service("disabled"),
		fastapi: service("up"),
		ollama: service("up"),
	},
	companions: {
		openLlmVtuber: service("disabled"),
	},
	system: {
		memory: {
			used: 10,
			total: 20,
			percentage: 50,
		},
		cpu: {
			usage: 1,
		},
	},
};

describe("local ops overview", () => {
	test("normalizes configured URLs", () => {
		expect(normalizeLocalOpsUrl("http://127.0.0.1:8000/", "fallback")).toBe(
			"http://127.0.0.1:8000",
		);
		expect(normalizeLocalOpsUrl("not a url", "http://fallback.local")).toBe(
			"http://fallback.local",
		);
	});

	test("builds a manual-supervised local ops manifest", () => {
		const overview = buildLocalOpsOverview({
			health: healthySnapshot,
			voicevox: service("down"),
			generatedAt: now,
			cwd: "C:\\repo\\ElysiaAI",
		});

		expect(overview.codename).toBe("StarkHouseLocalOps");
		expect(overview.mode).toBe("manual-supervised");
		expect(overview.safety.manualStartOnly).toBe(true);
		expect(overview.endpoints.commandCenter).toBe("/stark-ops.html");
		expect(overview.host.repo.cwd).toBe("C:\\repo\\ElysiaAI");
		expect(overview.logs.map((entry) => entry.id)).toContain("lite-out");
		expect(overview.diagnostics.map((entry) => entry.id)).toEqual([
			"prisma",
			"ollama-models",
		]);
		expect(overview.briefing.length).toBeGreaterThan(0);
		expect(overview.improvements.length).toBeGreaterThan(0);
		expect(
			overview.improvements.every((entry) => entry.safety === "manual-only"),
		).toBe(true);
		expect(overview.services.map((entry) => entry.id)).toContain("ollama");
		expect(
			overview.commands.some((entry) => entry.command === "bun run ops"),
		).toBe(true);
		expect(
			overview.commands.some(
				(entry) => entry.command === "bun scripts/manage.ts dev:lite",
			),
		).toBe(true);
	});

	test("marks the stack ready when required services are online", () => {
		const readiness = summarizeOpsReadiness([
			{ id: "elysia-core", enabled: true, status: "up" },
			{ id: "fastapi-kernel", enabled: true, status: "up" },
			{ id: "ollama", enabled: true, status: "up" },
			{ id: "redis", enabled: false, status: "disabled" },
		]);

		expect(readiness.status).toBe("ready");
		expect(readiness.score).toBe(100);
	});

	test("reports Ollama as the blocker when the core is online", () => {
		const readiness = summarizeOpsReadiness([
			{ id: "elysia-core", enabled: true, status: "up" },
			{ id: "fastapi-kernel", enabled: true, status: "up" },
			{ id: "ollama", enabled: true, status: "down" },
		]);

		expect(readiness.status).toBe("partial");
		expect(readiness.summary).toBe("Core online, Ollama needs manual startup");
	});

	test("flags attention when the required stack is offline", () => {
		const readiness = summarizeOpsReadiness([
			{ id: "elysia-core", enabled: true, status: "down" },
			{ id: "fastapi-kernel", enabled: true, status: "down" },
			{ id: "ollama", enabled: true, status: "down" },
		]);

		expect(readiness.status).toBe("attention");
	});
});
