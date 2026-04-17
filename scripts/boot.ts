import { execSync } from "node:child_process";
import { spawn, spawnSync } from "bun";

async function boot() {
	console.log(
		"\x1b[36m🌟 Initializing Elysia OS Resonance Cluster (PowerShell-free)...\x1b[0m",
	);

	// 1. Cleanse Cluster (Kill existing processes on port 3000)
	console.log("\x1b[90m🧹 Cleansing Resonance Cluster (Port 3000)...\x1b[0m");
	try {
		if (process.platform === "win32") {
			const output = execSync("netstat -ano | findstr :3000").toString();
			const lines = output.split("\n");
			for (const line of lines) {
				const parts = line.trim().split(/\s+/);
				if (parts.length > 4 && parts[1].includes(":3000")) {
					const pid = parts[parts.length - 1];
					if (pid !== process.pid.toString()) {
						execSync(`taskkill /F /PID ${pid} /T`, { stdio: "ignore" });
					}
				}
			}
		} else {
			execSync("fuser -k 3000/tcp", { stdio: "ignore" });
		}
	} catch (e) {}

	// 2. Start API Resonance
	const port = process.env.PORT || 3000;
	console.log(`\x1b[36m📡 Initiating API Resonance (Port ${port})...\x1b[0m`);
	const server = spawn(["bun", "run", "--filter", "@elysia-ai/server", "dev"], {
		stdout: "inherit",
		stderr: "inherit",
	});

	// 3. Wait for Heartbeat
	process.stdout.write("💓 Waiting for resonance heartbeat...");
	let ignited = false;
	for (let i = 0; i < 30; i++) {
		try {
			const res = await fetch(`http://localhost:${port}/ping`);
			if (res.status === 200) {
				console.log(" \x1b[32m[IGNITED]\x1b[0m");
				ignited = true;
				break;
			}
		} catch (e) {
			process.stdout.write(".");
			await new Promise((r) => setTimeout(r, 1000));
		}
	}

	if (!ignited) {
		console.log(" \x1b[31m[FAILED]\x1b[0m");
		console.error("❌ API resonance failed to stabilize.");
		server.kill();
		process.exit(1);
	}

	// 4. Manifest OS UI (Tauri)
	console.log("\x1b[34m💎 Starting Elysia OS Native App...\x1b[0m");
	const ui = spawn(["bun", "run", "dev:desktop"], {
		stdout: "inherit",
		stderr: "inherit",
	});

	// Handle cleanup
	process.on("SIGINT", () => {
		console.log("\x1b[31m🛑 Stopping background services...\x1b[0m");
		server.kill();
		ui.kill();
		process.exit(0);
	});

	await ui.exited;
	server.kill();
	console.log("\x1b[31m🛑 Elysia OS Instance Stopped.\x1b[0m");
}

boot().catch(console.error);
