import "./style.css";
import {
	type AppConfig,
	WindowManager,
	fetchWithAuth,
} from "../../shared/src/ui-bridge";
import { SwarmLattice } from "./swarm_lattice";

const wm = new WindowManager();

// --- 1. Linux Kernel Boot Sequence ---
const bootScreen = document.getElementById("boot-screen");
const bootLog = document.getElementById("boot-log");
const desktop = document.getElementById("desktop");
const systemTime = document.getElementById("system-time");

function updateClock() {
	if (!systemTime) return;
	const now = new Date();
	const month = now.getMonth() + 1;
	const date = now.getDate();
	const hours = now.getHours().toString().padStart(2, "0");
	const minutes = now.getMinutes().toString().padStart(2, "0");
	systemTime.innerText = `${month}月${date}日 ${hours}:${minutes}`;
}
setInterval(updateClock, 1000);
updateClock();

async function startBootSequence() {
	if (!bootScreen || !bootLog || !desktop) return;

	try {
		const response = await fetch("/api/sandbox/kernel/stream/boot");
		const bootData = (await response.json()) as Array<{
			phase: string;
			msg: string;
		}>;

		for (const entry of bootData) {
			const div = document.createElement("div");
			div.innerText = entry.msg;

			// Apply Phase Styles
			if (entry.phase === "BIOS") div.className = "log-bios";
			else if (entry.phase === "KERNEL") div.className = "log-kernel";
			else if (entry.phase === "SERVICE") {
				div.className = "log-service";
				if (entry.msg.includes("[  OK  ]")) {
					div.innerHTML = entry.msg.replace(
						"[  OK  ]",
						'<span class="log-ok">[  OK  ]</span>',
					);
				}
			}

			bootLog.appendChild(div);
			bootLog.scrollTop = bootLog.scrollHeight;

			// Timing logic based on phase
			let delay = Math.random() * 50 + 10;
			if (entry.phase === "BIOS") delay = 400; // BIOS is slower
			if (entry.phase === "SERVICE") delay = 150; // Services are steady

			await new Promise((resolve) => setTimeout(resolve, delay));
		}

		// Final Transition
		setTimeout(() => {
			bootScreen.classList.add("fade-out");
			desktop.classList.add("visible");
			desktop.classList.remove("hidden");

			// Auto-open Sandbox after GUI load
			setTimeout(() => wm.createWindow(appSandbox), 800);
		}, 1000);
	} catch (err) {
		console.error("Boot failure:", err);
		bootLog.innerText += `\n[ ERROR ] Kernel Panic: Unable to reach boot server. Check backend.`;
	}
}

startBootSequence();

// --- 2. Specialized App: Sovereign Gauntlet ---
const appSandbox: AppConfig = {
	id: "sandbox",
	name: "Sovereign Gauntlet",
	icon: "/assets/icons/sandbox.png",
	width: 800,
	height: 600,
	fullScreen: true,
	contentRenderer: (body) => {
		body.innerHTML = `
      <div class="sandbox-orchestra-v2">
        <div class="sandbox-terminal-main">
          <div class="terminal-view" id="sandbox-term">
            > [SYSTEM] Sovereign Sandbox (Linux 7.0 Base) Ready.<br>
            > [SYSTEM] Awaiting Command...
          </div>
        </div>
        <div class="sandbox-sidebar-right">
          <div class="sandbox-app-info">
            <h3>Sovereign Gauntlet</h3>
            <p>SLA L14 Security Suite</p>
          </div>
          <button class="btn-side active" id="gauntlet-btn">Sovereign Gauntlet</button>
          <button class="btn-side" id="stream-btn">Linux Kernel Stream</button>
          <div class="sandbox-action-area">
             <button class="btn-primary" id="launch-gauntlet-btn">RUN SECURITY AUDIT</button>
          </div>
          <div style="flex-grow:1"></div>
          <div class="sandbox-status">PROTECTION: <span style="color:#34d399">ACTIVE</span></div>
        </div>
      </div>
    `;

		const term = body.querySelector("#sandbox-term") as HTMLElement;
		const launchBtn = body.querySelector(
			"#launch-gauntlet-btn",
		) as HTMLButtonElement;
		const streamBtn = body.querySelector("#stream-btn") as HTMLButtonElement;

		streamBtn.onclick = async () => {
			streamBtn.disabled = true;
			term.innerText = "> [SYSTEM] Connecting to Linux Kernel Subsystems...\n";
			try {
				const response = await fetchWithAuth(
					"/api/sandbox/kernel/stream/random",
				);
				const text = await response.text();
				term.innerText = "";
				const lines = text.split("\n");
				let i = 0;
				const interval = setInterval(() => {
					if (i >= lines.length) {
						clearInterval(interval);
						streamBtn.disabled = false;
						return;
					}
					const line = document.createElement("div");
					line.innerText = lines[i];
					term.appendChild(line);
					term.scrollTop = term.scrollHeight;
					i++;
				}, 40);
			} catch (err) {
				term.innerText += `\n> [ERROR] Connection failed: ${err}`;
				streamBtn.disabled = false;
			}
		};

		launchBtn.onclick = async () => {
			launchBtn.disabled = true;
			term.innerText =
				"> [SYSTEM] Initiating Sovereign Gauntlet Audit (SLA L14)...\n";
			try {
				await fetchWithAuth("/api/sandbox/audit/launch", { method: "POST" });
				const eventSource = new EventSource(
					"http://127.0.0.1:3000/api/sandbox/audit/stream",
				);
				eventSource.onmessage = (event) => {
					const line = document.createElement("div");
					line.innerText = event.data;
					if (event.data.includes("✅")) line.style.color = "#34d399";
					if (event.data.includes("❌")) line.style.color = "#f87171";
					term.appendChild(line);
					term.scrollTop = term.scrollHeight;
					if (event.data.includes("Gauntlet Finished")) {
						eventSource.close();
						launchBtn.disabled = false;
					}
				};
				eventSource.onerror = () => {
					eventSource.close();
					launchBtn.disabled = false;
				};
			} catch (err) {
				term.innerText += `\n> [ERROR] Launch failed: ${err}`;
				launchBtn.disabled = false;
			}
		};
	},
};

// --- 3. Specialized App: Swarm Hub ---
const appSwarmHub: AppConfig = {
	id: "swarm-hub",
	name: "Swarm Intelligence Hub",
	icon: "/assets/icons/swarm-core.png",
	width: 900,
	height: 600,
	contentRenderer: (body) => {
		body.innerHTML = `
      <div class="swarm-hub-container">
        <canvas id="swarm-canvas"></canvas>
        <div class="swarm-telemetry">
          <div class="telemetry-header">SWARM TELEMETRY</div>
          <div class="telemetry-item">STATUS: <span class="status-active">BONDED</span></div>
          <div class="telemetry-item">PROTOCOL: <span class="status-cyan">GHOST v7.0</span></div>
          <div class="telemetry-item">ACTIVE NODES: <span id="node-count">--</span></div>
          <div class="telemetry-item">SYNC RATIO: <span class="status-cyan">99.8%</span></div>
          <div style="flex-grow:1"></div>
          <div class="telemetry-footer">ARC 10: COSMIC TRANSCENDENCE</div>
        </div>
      </div>
    `;

		const canvas = body.querySelector("#swarm-canvas") as HTMLCanvasElement;
		const nodeDisplay = body.querySelector("#node-count") as HTMLElement;
		const lattice = new SwarmLattice(canvas);

		const syncStats = async () => {
			try {
				const response = await fetchWithAuth("/api/system/stats");
				const data = (await response.json()) as { agents_active: number };
				nodeDisplay.innerText = data.agents_active.toString();
				lattice.init(data.agents_active * 10); // 10 particles per logical agent
			} catch {
				nodeDisplay.innerText = "8";
				lattice.init(80);
			}
		};

		syncStats();
		lattice.start();

		// Cleanup on window close
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.removedNodes.forEach((node) => {
					if (
						node instanceof HTMLElement &&
						node.id === `window-${appSwarmHub.id}`
					) {
						lattice.stop();
						observer.disconnect();
					}
				});
			});
		});
		observer.observe(document.getElementById("window-layer")!, {
			childList: true,
		});
	},
};

// --- 3. Dash (Dock) Settings ---
document.querySelectorAll(".dash-item").forEach((item) => {
	item.addEventListener("click", () => {
		const appName = item.getAttribute("data-app");
		if (appName === "sandbox") wm.createWindow(appSandbox);
		if (appName === "swarm") wm.createWindow(appSwarmHub);
	});
});

// Auto-open Sandbox is now handled at the end of startBootSequence()
// for a seamless transition.
