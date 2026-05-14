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
		expect(overview.homeServer.status).toBe("attention");
		expect(overview.homeServer.score).toBeGreaterThanOrEqual(0);
		expect(overview.homeServer.score).toBeLessThanOrEqual(100);
		expect(overview.homeServer.gates.map((entry) => entry.id)).toEqual([
			"blueprint",
			"backup",
			"storage",
			"secure-access",
			"models",
			"monitoring",
			"network-plan",
			"lab-isolation",
		]);
		expect(overview.homeServer.probes).toEqual([]);
		expect(overview.future.codename).toBe("ElysiaFuturePath");
		expect(overview.future.stages.map((entry) => entry.id)).toEqual([
			"foundation",
			"recovery",
			"secure-mesh",
			"observability",
			"local-intelligence",
			"ambient-home",
			"multi-user-support",
			"readme-screenshots",
			"rag-import-ux",
			"advanced-ci-cd",
			"abyss-rtos",
			"shield-agent",
			"sovereign-mesh",
			"tauri-distribution",
		]);
		expect(
			overview.future.stages.find((entry) => entry.id === "multi-user-support")
				?.track,
		).toBe("planned");
		expect(
			overview.future.stages.find((entry) => entry.id === "advanced-ci-cd")
				?.track,
		).toBe("experimental");
		expect(
			overview.future.stages.find((entry) => entry.id === "abyss-rtos")?.track,
		).toBe("experimental");
		expect(
			overview.future.stages.find((entry) => entry.id === "sovereign-mesh")
				?.track,
		).toBe("frontier");
		expect(
			overview.future.stages.filter((entry) => entry.status === "next"),
		).toHaveLength(1);
		expect(overview.clients.map((entry) => entry.id)).toEqual([
			"windows",
			"macos",
			"linux",
			"android",
			"ios",
		]);
		expect(overview.secureMesh.codename).toBe("ElysiaSecureMesh");
		expect(overview.secureMesh.routes.map((entry) => entry.id)).toEqual([
			"windows",
			"macos",
			"linux",
			"android",
			"ios",
		]);
		expect(overview.secureMesh.guards.map((entry) => entry.id)).toEqual([
			"private-vpn",
			"public-port-lock",
			"desktop-cockpit",
			"mobile-pwa",
			"manual-only",
		]);
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

	test("uses live home server probes when provided", () => {
		const overview = buildLocalOpsOverview({
			health: healthySnapshot,
			generatedAt: now,
			cwd: "C:\\repo\\ElysiaAI",
			homeServerProbes: [
				{
					id: "backup",
					label: "Backup And Restore Evidence",
					status: "ready",
					detail: "Latest backup evidence is 2d old",
					evidence: [
						"latest: backups/vm-101.tar.zst",
						"runbook: docs/RUNBOOK_BACKUP.md",
						"restore: backups/restore-drill.md",
					],
					checkedAt: now,
				},
				{
					id: "storage",
					label: "Repo Volume Capacity",
					status: "ready",
					detail: "40% used on the repo volume",
					evidence: ["free: 500 GiB"],
					checkedAt: now,
				},
				{
					id: "secure-access",
					label: "Tailscale Status",
					status: "ready",
					detail: "Tailscale is online for private management access",
					evidence: ["backend: Running"],
					checkedAt: now,
				},
				{
					id: "public-ports",
					label: "Management Port Exposure",
					status: "ready",
					detail: "Watched management listeners are loopback-only",
					evidence: ["loopback: 127.0.0.1:3000"],
					checkedAt: now,
				},
				{
					id: "monitoring",
					label: "Uptime Kuma",
					status: "ready",
					detail: "Uptime Kuma responded on the local monitoring port",
					evidence: ["http://127.0.0.1:3001"],
					checkedAt: now,
				},
				{
					id: "network-plan",
					label: "Network Segmentation Plan",
					status: "ready",
					detail: "VLAN intent and deny-by-default rules are documented",
					evidence: [
						"docs/ELYSIA_HOME_SERVER_BLUEPRINT.md",
						"signal: VLAN intent",
					],
					checkedAt: now,
				},
				{
					id: "lab-isolation",
					label: "Lab Isolation Checklist",
					status: "ready",
					detail: "Lab isolation checklist is documented with deny rules",
					evidence: ["docs/LAB_ISOLATION.md"],
					checkedAt: now,
				},
			],
		});
		const gateById = new Map(
			overview.homeServer.gates.map((gate) => [gate.id, gate]),
		);
		const meshGuardById = new Map(
			overview.secureMesh.guards.map((guard) => [guard.id, guard]),
		);

		expect(overview.homeServer.probes).toHaveLength(7);
		expect(gateById.get("backup")?.status).toBe("ready");
		expect(gateById.get("storage")?.status).toBe("ready");
		expect(gateById.get("secure-access")?.status).toBe("ready");
		expect(gateById.get("monitoring")?.status).toBe("ready");
		expect(gateById.get("network-plan")?.status).toBe("ready");
		expect(gateById.get("lab-isolation")?.status).toBe("ready");
		expect(overview.future.nextStageId).toBe("foundation");
		expect(
			overview.future.stages.find((stage) => stage.id === "secure-mesh")
				?.status,
		).toBe("ready");
		expect(meshGuardById.get("private-vpn")?.status).toBe("ready");
		expect(meshGuardById.get("public-port-lock")?.status).toBe("ready");
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
