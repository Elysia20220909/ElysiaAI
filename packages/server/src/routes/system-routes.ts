import { Elysia, t } from "elysia";
import { authErrorResponse, requireAccessToken } from "../lib/auth-cookies";
import { proxyToFastAPI } from "../lib/constants";
import { collectLocalOpsOverview } from "../lib/local-ops";
import { logger } from "../lib/logger";
import { collectNativeLiteSnapshot } from "../lib/native-lite";
import { checkOllamaStatus } from "../lib/ollama-service";
import {
	buildSuitStatus,
	getAegisFridayPersonaPrompt,
	getCinematicPresets,
} from "../lib/suit-system";

// 1. 公開ルート用インスタンス
const publicRoutes = new Elysia()
	.get("/api/sandbox/kernel/stream/boot", async () => {
		logger.info("🚀 [System] Streaming OS 7.0 kernel logs (Public Access)");
		return [
			{
				phase: "BIOS",
				msg: "ELYSIUM SOVEREIGN BIOS v4.0.2 (C) 2026 ELYSIA-LINK",
			},
			{
				phase: "BIOS",
				msg: "CPU: Elysia Neural Core L14 @ 5.4GHz (128 Cores)",
			},
			{
				phase: "BIOS",
				msg: "MEM: 128GB LPDDR6 Resonance-Synchronized RAM detected.",
			},
			{
				phase: "BIOS",
				msg: "STORAGE: 2.0TB Sovereign SSD - Integrity [VALIDATED]",
			},
			{ phase: "BIOS", msg: "Booting from UUID: elysia-sovereign-node-v7..." },
			{
				phase: "KERNEL",
				msg: "[    0.000000] Linux version 7.0.0-elysia (gcc version 14.2.1) #1 SMP PREEMPT_DYNAMIC",
			},
			{
				phase: "KERNEL",
				msg: "[    0.000001] Command line: BOOT_IMAGE=/vmlinuz-7.0-elysia root=UUID=... ro quiet splash",
			},
			{
				phase: "KERNEL",
				msg: "[    0.005000] Sovereign Node: Integrated AI-Native Scheduler enabled.",
			},
			{
				phase: "KERNEL",
				msg: "[    0.010000] Memory: 16384232K/16777216K available",
			},
			{
				phase: "KERNEL",
				msg: "[    0.020000] Calibrating Elysia Neural Core... done.",
			},
			{
				phase: "KERNEL",
				msg: "[    0.080000] [elysia-ai] Initializing Guardian Protocol V14...",
			},
			{
				phase: "KERNEL",
				msg: "[    0.150000] [elysia-ai] Alpha-Omega node active.",
			},
			{ phase: "SERVICE", msg: "[  OK  ] Started Sovereign Audit Daemon." },
			{ phase: "SERVICE", msg: "[  OK  ] Started Elysia Intelligence Bridge." },
			{
				phase: "SERVICE",
				msg: "[  OK  ] Started Network Anonymization Layer (Alpha Protocol).",
			},
			{
				phase: "SERVICE",
				msg: "[  OK  ] Started Physical Presence Simulation.",
			},
			{ phase: "SERVICE", msg: "[  OK  ] Reached target Multi-User System." },
			{
				phase: "SERVICE",
				msg: "[  OK  ] Started Elysia Desktop Manager (GNOME-Native).",
			},
		];
	})
	.get("/api/system/matrix-dashboard", async () => {
		// Neural Stats Calculation
		const memory = process.memoryUsage();
		return {
			timestamp: new Date().toISOString(),
			system: {
				uptime: Math.floor(process.uptime()),
				platform: process.platform,
				node_version: process.version,
			},
			metrics: {
				heap_used: Math.round(memory.heapUsed / 1024 / 1024),
				heap_total: Math.round(memory.heapTotal / 1024 / 1024),
				external: Math.round(memory.external / 1024 / 1024),
			},
			security: {
				shield_active: true,
				threat_level: "LOW",
				last_scan: new Date().toISOString(),
			},
			silicon: {
				status: "SECURE",
				key_id: "AEGIS-SVR-777",
				verified: require("node:fs").existsSync("kernel/SENTINEL.KEY"),
			},
			armor: {
				integrity: 100,
				countermeasures: "ACTIVE",
			},
		};
	})
	.get("/api/local-ops", async () => {
		return await collectLocalOpsOverview({ assumeCoreUp: true });
	})
	.get("/api/ollama/status", async ({ set }) => {
		const status = await checkOllamaStatus();
		if (status.status === "offline") set.status = 503;
		return status;
	})
	.get("/api/native-lite", () => collectNativeLiteSnapshot())
	.get("/api/suit/status", () => buildSuitStatus())
	.get("/api/suit/cinematic-presets", () => ({
		presets: getCinematicPresets(),
		safety: "composition presets only; no game input automation",
	}))
	.get("/api/suit/persona", () => ({
		name: "AEGIS-FRIDAY",
		prompt: getAegisFridayPersonaPrompt(),
	}));

// 2. 保護ルート用インスタンス (JWT認証必須)
const guardedRoutes = new Elysia({ prefix: "/api/system" }).guard(
	{
		beforeHandle: ({ request }) => {
			try {
				requireAccessToken(request);
			} catch (error) {
				logger.warn("❌ [System] Rejected auth request", {
					error: error instanceof Error ? error.message : "unknown",
				});
				return authErrorResponse(error);
			}
		},
	},
	(app) =>
		app
			.get("/security/stats", () =>
				proxyToFastAPI("/system/security/stats", "GET"),
			)
			.post("/sandbox/execute", ({ body }) =>
				proxyToFastAPI("/sandbox/execute", "POST", body),
			)
			.get("/resonance", () => proxyToFastAPI("/resonance", "GET"))
			.get("/stats", async () => {
				return {
					uptime: "14d 2h 35m",
					kernel: "Elysia-OS 6.12.0-resonance",
					memory_used: "4.2GB / 16GB",
					emotions_processed: 12450,
					agents_active: 8,
				};
			})
			.post(
				"/shell",
				async ({ body }: { body: { command: string } }) => {
					const { command } = body;
					logger.info(`🐚 [System Shell] Executing: ${command}`);
					if (command === "ls")
						return { output: "bin/  etc/  home/  usr/  var/" };
					if (command === "whoami") return { output: "elysia_admin" };
					return { output: `sh: command not found: ${command}` };
				},
				{
					body: t.Object({ command: t.String() }),
				},
			)
			.get(
				"/logs/stream",
				({ query }) => {
					const lines = Number(query.lines) || 10;
					return {
						logs: [
							`[${new Date().toISOString()}] [INFO] Sovereign Shield calibrating...`,
							`[${new Date().toISOString()}] [INFO] Alpha-Omega node handshake successful.`,
							`[${new Date().toISOString()}] [WARNING] Peripheral resonance detected.`,
						].slice(-lines),
					};
				},
				{
					query: t.Object({ lines: t.Optional(t.Numeric()) }),
				},
			),
);

// 3. 結合してエクスポート
export const systemRoutes = new Elysia().use(publicRoutes).use(guardedRoutes);
