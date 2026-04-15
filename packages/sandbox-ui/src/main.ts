import "./style.css";
import {
	type AppConfig,
	fetchWithAuth,
	WindowManager,
} from "../../shared/src/ui-bridge";

const wm = new WindowManager();

// --- 1. Boot Animation (Shared across OS) ---
const lockScreen = document.getElementById("lock-screen");
const desktop = document.getElementById("desktop");
const statusText = document.getElementById("status-text");

if (lockScreen && desktop && statusText) {
	const dots = document.querySelectorAll(".dot");
	let dotCount = 0;
	const bootSequence = () => {
		if (dotCount < dots.length) {
			dots[dotCount].classList.add("filled");
			dotCount++;
			setTimeout(bootSequence, 200);
		} else {
			statusText.innerText = "FaceID 認証成功";
			statusText.style.color = "#ffb7c5";
			setTimeout(() => {
				lockScreen.classList.add("unlocked");
				desktop.classList.add("visible");
				desktop.classList.remove("hidden");
			}, 600);
		}
	};
	setTimeout(bootSequence, 800);
}

// --- 2. Specialized App: Sovereign Gauntlet ---
const appSandbox: AppConfig = {
	id: "sandbox",
	name: "Sovereign Gauntlet",
	icon: "/assets/icons/sandbox.png",
	width: 800,
	height: 600,
	contentRenderer: (body) => {
		body.innerHTML = `
      <div class="sandbox-container">
        <div class="sandbox-sidebar">
          <button class="btn-side active" id="gauntlet-btn">Sovereign Gauntlet</button>
          <button class="btn-side" id="stream-btn">Linux Kernel Stream</button>
          <div style="flex-grow:1"></div>
          <div class="sandbox-status">PROTECTION: <span style="color:#34d399">ACTIVE</span></div>
        </div>
        <div class="sandbox-main">
          <div class="terminal-view" id="sandbox-term">
            > [SYSTEM] Sovereign Sandbox Ready.<br>
            > [SYSTEM] Awaiting Command...
          </div>
          <div class="sandbox-controls">
             <button class="btn-primary" id="launch-gauntlet-btn" style="width:100%">RUN SECURITY AUDIT</button>
          </div>
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

// --- 3. Dock Settings ---
document.querySelectorAll(".dock-item").forEach((item) => {
	item.addEventListener("click", () => {
		const appName = item.getAttribute("data-app");
		if (appName === "sandbox") wm.createWindow(appSandbox);
	});
});

// Auto-open Sandbox
setTimeout(() => wm.createWindow(appSandbox), 1500);
