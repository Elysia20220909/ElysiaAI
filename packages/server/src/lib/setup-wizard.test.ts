import { describe, expect, test } from "bun:test";
import type { LocalOpsOverview } from "./local-ops";
import {
	buildPullModelCommand,
	buildSetupWizardReadiness,
	type SetupPortState,
} from "./setup-wizard";

function service(id: string, status: "up" | "down" | "disabled" = "up") {
	return {
		id,
		name: id,
		role: id,
		category: "core" as const,
		enabled: status !== "disabled",
		status,
		url: `http://127.0.0.1/${id}`,
		links: [],
		startCommand: `start ${id}`,
		lastCheck: "2026-06-21T00:00:00.000Z",
	};
}

function overview(overrides: Partial<LocalOpsOverview> = {}): LocalOpsOverview {
	return {
		codename: "test",
		generatedAt: "2026-06-21T00:00:00.000Z",
		mode: "manual-supervised",
		readiness: { status: "ready", score: 100, summary: "ready" },
		endpoints: {
			commandCenter: "/",
			health: "/health",
			metrics: "/metrics",
			api: "/api/local-ops",
		},
		services: [
			service("elysia-core"),
			service("fastapi-kernel"),
			service("ollama"),
			service("voicevox", "disabled"),
		],
		host: {
			hostname: "test",
			platform: "win32",
			arch: "x64",
			cpu: "test",
			cpuCores: 8,
			memory: { totalMb: 1000, freeMb: 500, usedPercent: 50 },
			runtime: { bun: "1", node: "1", pid: 1, uptimeSeconds: 1 },
			repo: { cwd: "." },
		},
		logs: [
			{
				id: "server",
				label: "Server",
				path: "logs/server.log",
				status: "quiet",
				lines: ["ready"],
			},
		],
		diagnostics: [
			{
				id: "prisma",
				label: "Prisma",
				status: "ready",
				detail: "Schema and database are present",
				nextAction: "none",
				items: ["schema: present"],
			},
		],
		homeServer: {
			status: "ready",
			score: 100,
			summary: "ready",
			gates: [],
			probes: [],
		},
		future: { nextStageId: "foundation", stages: [] },
		clients: [],
		secureMesh: { routes: [], guards: [] },
		improvements: [],
		briefing: [],
		commands: [
			{ label: "Setup", command: "bun scripts/manage.ts setup", cwd: ".", when: "first run" },
		],
		safety: {
			manualStartOnly: true,
			noDeviceAutomation: true,
			localFirst: true,
		},
		...overrides,
	};
}

const ports: SetupPortState[] = [
	{ id: "core", host: "127.0.0.1", port: 3000, open: true },
	{ id: "fastapi", host: "127.0.0.1", port: 8000, open: true },
	{ id: "ollama", host: "127.0.0.1", port: 11434, open: true },
	{ id: "voicevox", host: "127.0.0.1", port: 50021, open: false },
];

describe("setup wizard readiness", () => {
	test("marks ready when core stack and target model are available", () => {
		const readiness = buildSetupWizardReadiness({
			overview: overview(),
			root: process.cwd(),
			ports,
			ollama: {
				status: "up",
				model: "llama3.2",
				models: ["llama3.2"],
				modelAvailable: true,
			},
		});

		expect(readiness.status).toBe("ready");
		expect(readiness.model.available).toBe(true);
		expect(readiness.steps.find((step) => step.id === "voicevox")?.status).toBe("optional");
	});

	test("surfaces missing Ollama as the first blocker", () => {
		const readiness = buildSetupWizardReadiness({
			overview: overview({
				services: [
					service("elysia-core"),
					service("fastapi-kernel"),
					service("ollama", "down"),
				],
			}),
			root: process.cwd(),
			ports,
			ollama: {
				status: "down",
				model: "llama3.2",
				error: "Connection failed",
			},
		});

		const ollama = readiness.steps.find((step) => step.id === "ollama");
		expect(readiness.status).toBe("blocked");
		expect(ollama?.command).toBe("ollama serve");
	});

	test("returns a pull command when the target model is missing", () => {
		const readiness = buildSetupWizardReadiness({
			overview: overview(),
			root: process.cwd(),
			ports,
			ollama: {
				status: "up",
				model: "llama3.2",
				models: ["mistral"],
				modelAvailable: false,
			},
		});

		const modelStep = readiness.steps.find((step) => step.id === "ollama-model");
		expect(readiness.status).toBe("attention");
		expect(modelStep?.command).toBe("ollama pull llama3.2");
		expect(modelStep?.action?.path).toBe("/api/setup/actions/pull-model");
	});

	test("builds manual pull model commands without executing them", () => {
		const action = buildPullModelCommand("llama3.2");
		expect(action.action).toBe("manual-command");
		expect(action.command).toBe("ollama pull llama3.2");
	});
});
