import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import { CONFIG, jsonError, proxyToFastAPI } from "../lib/constants";
import { logger } from "../lib/logger";

export const systemRoutes = new Elysia()
	.guard(
		{
			beforeHandle: ({ request }: any) => {
				const auth = request.headers.get("authorization") || "";
				if (!auth.startsWith("Bearer "))
					throw new Error("Missing Bearer token");
				try {
					jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
				} catch {
					throw new Error("Invalid or expired token");
				}
			},
		},
		(app) =>
			app
				.get("/api/system/security/stats", () => proxyToFastAPI("/system/security/stats", "GET"))
				.post("/api/sandbox/execute", ({ body }: any) => proxyToFastAPI("/sandbox/execute", "POST", body))
				.get("/api/resonance", () => proxyToFastAPI("/resonance", "GET"))
				.get("/system/stats", async () => {
					// Dummy stats for UI simulation
					return {
						uptime: "14d 2h 35m",
						kernel: "Elysia-OS 6.12.0-resonance",
						memory_used: "4.2GB / 16GB",
						emotions_processed: 12450,
						agents_active: 8,
					};
				})
				.post(
					"/system/shell",
					async ({ body }: any) => {
						const { command } = body as { command: string };
						logger.info(`Shell command executed: ${command}`);
						// Safe simulation of shell results
						if (command === "ls") return { output: "bin/  etc/  home/  usr/  var/" };
						if (command === "whoami") return { output: "elysia_admin" };
						return { output: `sh: command not found: ${command}` };
					},
					{
						body: t.Object({ command: t.String() }),
					},
				)
				.post(
					"/system/logs/tail",
					async ({ body }: any) => {
						const { lines } = body as { lines: number };
						return {
							logs: [
								`[${new Date().toISOString()}] [INFO] Sovereign Integrity scan complete.`,
								`[${new Date().toISOString()}] [INFO] White ICE handshake established.`,
								`[${new Date().toISOString()}] [WARNING] Peripheral resonance detected.`,
							].slice(-lines),
						};
					},
					{
						body: t.Object({ lines: t.Number() }),
					}
				)
	);
