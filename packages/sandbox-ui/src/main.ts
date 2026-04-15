import "./style.css";
import {
	type AppConfig,
	fetchWithAuth,
	WindowManager,
} from "../../shared/src/ui-bridge";

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

// --- 3. Dash (Dock) Settings ---
document.querySelectorAll(".dash-item").forEach((item) => {
	item.addEventListener("click", () => {
		const appName = item.getAttribute("data-app");
		if (appName === "sandbox") wm.createWindow(appSandbox);
	});
});

// Auto-open Sandbox is now handled at the end of startBootSequence()
// for a seamless transition.
