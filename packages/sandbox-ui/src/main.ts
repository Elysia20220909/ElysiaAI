import "./style.css";

const API_BASE = "http://127.0.0.1:3000";

interface AppConfig {
	id: string;
	name: string;
	icon: string;
	width: number;
	height: number;
	contentRenderer: (windowBody: HTMLElement) => void;
}

// --- 1. Boot & Security (FaceID) ---
const lockScreen = document.getElementById("lock-screen");
const desktop = document.getElementById("desktop");
const statusText = document.getElementById("status-text");

if (!lockScreen || !desktop || !statusText) {
	throw new Error("Critical UI elements missing from DOM");
}
const dots = document.querySelectorAll(".dot");
let dotCount = 0;

function bootSequence() {
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
			startClock();
		}, 600);
	}
}

setTimeout(bootSequence, 800);

// OS Fullscreen Toggle
const viewMenu = document.getElementById("menu-view");
if (viewMenu) {
	viewMenu.addEventListener("click", () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch((err) => {
				console.warn("Fullscreen toggle failed", err);
			});
		} else {
			document.exitFullscreen();
		}
	});
}

// --- 2. System Utilities ---
function startClock() {
	const clockEl = document.getElementById("system-time");
	if (!clockEl) return;
	setInterval(() => {
		const now = new Date();
		clockEl.innerText = now.toLocaleTimeString("ja-JP", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}, 1000);
}

// --- 3. Window Manager ---
class WindowManager {
	private layer = document.getElementById("window-layer") as HTMLElement;
	private template = document.getElementById(
		"window-template",
	) as HTMLTemplateElement;
	private activeZ = 100;

	createWindow(app: AppConfig) {
		const clone = this.template.content.cloneNode(true) as DocumentFragment;
		const win = clone.querySelector(".window") as HTMLElement;
		const title = win.querySelector(".window-title") as HTMLElement;
		const body = win.querySelector(".window-body") as HTMLElement;
		const closeBtn = win.querySelector(".close-btn") as HTMLElement;
		const maximizeBtn = win.querySelector(".maximize-btn") as HTMLElement;

		win.id = `window-${app.id}`;
		title.innerText = app.name;

		let prevStats = {
			width: `${app.width}px`,
			height: `${app.height}px`,
			left: `${100 + Math.random() * 50}px`,
			top: `${60 + Math.random() * 50}px`,
		};

		let isMaximized = false;

		// Default to Windowed (Floating)
		win.style.width = prevStats.width;
		win.style.height = prevStats.height;
		win.style.left = prevStats.left;
		win.style.top = prevStats.top;

		maximizeBtn.onclick = () => {
			if (isMaximized) {
				win.style.width = prevStats.width;
				win.style.height = prevStats.height;
				win.style.left = prevStats.left;
				win.style.top = prevStats.top;
			} else {
				prevStats = {
					width: win.style.width,
					height: win.style.height,
					left: win.style.left,
					top: win.style.top,
				};
				win.style.width = "100%";
				win.style.height = "100%";
				win.style.left = "0px";
				win.style.top = "0px";
			}
			isMaximized = !isMaximized;
		};

		app.contentRenderer(body);

		closeBtn.onclick = () => win.remove();
		win.onmousedown = () => this.focus(win);

		this.makeDraggable(win);
		this.layer.appendChild(win);
		this.focus(win);
	}

	private focus(win: HTMLElement) {
		this.activeZ += 1;
		win.style.zIndex = this.activeZ.toString();
		document.querySelectorAll(".window").forEach((w) => {
			w.classList.remove("active-window");
		});
		win.classList.add("active-window");
	}

	private makeDraggable(win: HTMLElement) {
		const header = win.querySelector(".window-header") as HTMLElement;
		let x = 0;
		let y = 0;

		header.onmousedown = (e) => {
			e.preventDefault();
			x = e.clientX;
			y = e.clientY;
			document.onmousemove = drag;
			document.onmouseup = stop;
		};

		function drag(e: MouseEvent) {
			const dx = x - e.clientX;
			const dy = y - e.clientY;
			x = e.clientX;
			y = e.clientY;
			win.style.top = `${win.offsetTop - dy}px`;
			win.style.left = `${win.offsetLeft - dx}px`;
		}

		function stop() {
			document.onmousemove = null;
			document.onmouseup = null;
		}
	}
}

const wm = new WindowManager();

// --- 4. App Implementations ---

// App: Elysia Intelligence (Chat)
const appChat: AppConfig = {
	id: "chat",
	name: "Elysia Intelligence",
	icon: "/assets/icons/chat.png",
	width: 700,
	height: 550,
	contentRenderer: (body) => {
		body.innerHTML = `
      <div class="app-chat-container">
        <div class="chat-portrait">
          <img id="chat-portrait-img" src="/assets/portraits/neutral.png">
          <div style="margin-top:12px; font-size:12px; font-weight:700; color:#ffb7c5;" id="chat-emotion">NEUTRAL</div>
        </div>
        <div class="chat-main">
          <div class="message-area" id="chat-messages">
            <div style="opacity:0.6; font-size:12px; text-align:center; margin-bottom:20px;">Secure Chat Tunnel Established</div>
          </div>
          <div class="input-area">
            <input type="text" class="chat-input" placeholder="エリシアとお話ししましょう..." id="chat-input-field">
            <button class="btn-primary" id="chat-send-btn" style="width:60px;">Send</button>
          </div>
        </div>
      </div>
    `;

		const input = body.querySelector("#chat-input-field") as HTMLInputElement;
		const sendBtn = body.querySelector("#chat-send-btn") as HTMLElement;
		const msgArea = body.querySelector("#chat-messages") as HTMLElement;
		const portrait = body.querySelector(
			"#chat-portrait-img",
		) as HTMLImageElement;
		const emotionLabel = body.querySelector("#chat-emotion") as HTMLElement;

		const addMessage = (text: string, role: string) => {
			const div = document.createElement("div");
			div.style.marginBottom = "12px";
			div.style.padding = "10px";
			div.style.borderRadius = "12px";
			div.style.maxWidth = "80%";
			div.style.alignSelf = role === "user" ? "flex-end" : "flex-start";
			div.style.background =
				role === "user" ? "rgba(0,122,255,0.3)" : "rgba(255,255,255,0.1)";
			div.innerText = text;
			msgArea.appendChild(div);
			msgArea.scrollTop = msgArea.scrollHeight;
		};

		const handleChat = async () => {
			const text = input.value.trim();
			if (!text) return;
			input.value = "";
			addMessage(text, "user");

			try {
				const token = localStorage.getItem("elysia_access_token") || "";
				const response = await fetch(`${API_BASE}/api/chat`, {
					method: "POST",
					headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
					body: JSON.stringify({
						messages: [{ role: "user", content: text }],
						stream: false,
					}),
				});
				const data = await response.json();
				addMessage(data.response, "assistant");
				if (data.portrait_url) {
					portrait.src = data.portrait_url;
					emotionLabel.innerText = data.emotion.toUpperCase();
				}
			} catch (_e) {
				addMessage("エラーが発生しました。接続を確認してください。", "system");
			}
		};

		sendBtn.onclick = handleChat;
		input.onkeydown = (e) => {
			if (e.key === "Enter") handleChat();
		};
	},
};

// App: Sandbox Orchestra
const appSandbox: AppConfig = {
	id: "sandbox",
	name: "Sandbox Orchestra",
	icon: "/assets/icons/sandbox.png",
	width: 850,
	height: 500,
	contentRenderer: (body) => {
		body.innerHTML = `
      <div class="sandbox-orchestra">
        <div class="sandbox-sidebar">
          <h3>SOVEREIGN AUDIT</h3>
          <p style="font-size:11px; opacity:0.6; margin-bottom:20px;">Kali Linux 統合診断環境</p>
          <button class="btn-primary" id="gauntlet-btn" style="margin-bottom:12px;">GAUNTLET 起動</button>
          <button class="btn-primary" id="kernel-stream-btn" style="margin-bottom:12px; background: #9c27b0;">LINUX KERNEL STREAM</button>
          <button class="btn-secondary" id="run-btn" style="opacity:0.6;">性格性テスト</button>
        </div>
        <div class="sandbox-terminal" id="sandbox-term">
          > Elysia OS Sovereign Terminal Ready...
          > Type: [SOVEREIGN_GAUNTLET] to initiate audit.
        </div>
      </div>
    `;

		const gauntletBtn = body.querySelector(
			"#gauntlet-btn",
		) as HTMLButtonElement;
		const streamBtn = body.querySelector(
			"#kernel-stream-btn",
		) as HTMLButtonElement;
		const term = body.querySelector("#sandbox-term") as HTMLElement;

		streamBtn.onclick = async () => {
			streamBtn.disabled = true;
			term.innerText = "";
			try {
				const response = await fetch(
					`${API_BASE}/api/sandbox/kernel/stream/random`,
				);
				const text = await response.text();
				const lines = text.split("\n");
				let i = 0;
				let isStreaming = true;

				// Fast typing effect
				const streamInterval = setInterval(() => {
					if (!isStreaming || i >= lines.length) {
						clearInterval(streamInterval);
						streamBtn.disabled = false;

						// Automatically fetch another file after a short delay if we hit the end
						if (isStreaming && i >= lines.length) {
							setTimeout(() => {
								if (streamBtn.innerText === "STOP STREAM") {
									streamBtn.click(); // Stop current state
									streamBtn.click(); // Restart
								}
							}, 2000);
						}
						return;
					}

					// Print 2-5 lines at a time to look like fast hacker terminal
					const chunk = Math.floor(Math.random() * 4) + 2;
					for (let j = 0; j < chunk && i < lines.length; j++) {
						const line = document.createElement("div");
						line.style.marginBottom = "1px";
						line.style.color = "#34d399";
						// Highlight C keywords for more aesthetic look
						const t = lines[i]
							.replace(
								/#include/g,
								'<span style="color:#f472b6;">#include</span>',
							)
							.replace(
								/void |int |char |struct |static /g,
								(match) => `<span style="color:#60a5fa;">${match}</span>`,
							)
							.replace(
								/return /g,
								'<span style="color:#fbbf24;">return </span>',
							);
						line.innerHTML = t;
						term.appendChild(line);
						i++;
					}

					term.scrollTop = term.scrollHeight;

					// Cap max lines to prevent DOM explosion
					while (term.children.length > 300) {
						term.removeChild(term.firstChild as Node);
					}
				}, 50);

				// Allow clicking again to stop it
				streamBtn.disabled = false;
				streamBtn.innerText = "STOP STREAM";
				streamBtn.onclick = () => {
					isStreaming = false;
					streamBtn.innerText = "LINUX KERNEL STREAM";
					streamBtn.disabled = false;
					// Restore the original onclick event loop
					streamBtn.onclick = startStreamEvent;
				};
			} catch (err) {
				term.innerText += `\n> [ERROR] Stream connect failed: ${err}`;
				streamBtn.disabled = false;
			}
		};
		// define the original function for reuse
		const startStreamEvent = streamBtn.onclick;

		gauntletBtn.onclick = async () => {
			gauntletBtn.disabled = true;
			term.innerText =
				"> [SYSTEM] Initiating Sovereign Gauntlet...\n> [SYSTEM] Opening resonance tunnel to Kali Sandbox...\n";

			// 1. Launch Audit
			try {
				await fetch("/api/sandbox/audit/launch", { method: "POST" });

				// 2. Start Streaming
				const eventSource = new EventSource("/api/sandbox/audit/stream");
				eventSource.onmessage = (event) => {
					const data = event.data;
					const line = document.createElement("div");
					line.style.marginBottom = "2px";

					// Basic coloring for logs
					if (data.includes("✅")) line.style.color = "#34d399";
					if (data.includes("❌") || data.includes("ERROR"))
						line.style.color = "#f87171";
					if (data.includes("🔍")) line.style.color = "#60a5fa";

					line.innerText = data;
					term.appendChild(line);
					term.scrollTop = term.scrollHeight;

					if (data.includes("Gauntlet Finished")) {
						eventSource.close();
						gauntletBtn.disabled = false;
					}
				};

				eventSource.onerror = () => {
					term.innerText += "\n> [ERROR] Stream connection lost.";
					eventSource.close();
					gauntletBtn.disabled = false;
				};
			} catch (err) {
				term.innerText += `\n> [ERROR] Launch failed: ${err}`;
				gauntletBtn.disabled = false;
			}
		};
	},
};

// App: Memory Vault (Status)
const appVault: AppConfig = {
	id: "vault",
	name: "Memory Vault",
	icon: "/assets/icons/vault.png",
	width: 400,
	height: 300,
	contentRenderer: (body) => {
		body.innerHTML = `
      <div style="padding:24px; text-align:center;">
        <img src="/assets/icons/vault.png" width="80">
        <h2 style="margin-top:16px;">Secure Crypt</h2>
        <p style="opacity:0.6; font-size:12px;">Milvus Embedded / Runner Memory Active</p>
        <div style="background:rgba(255,255,255,0.05); margin-top:20px; padding:12px; border-radius:8px; text-align:left;">
          <div style="font-size:12px;">Status: <span style="color:#34d399">ONLINE</span></div>
          <div style="font-size:12px;">Encryption: AES-256-GCM</div>
          <div style="font-size:12px;">Connection: local::8000</div>
        </div>
      </div>
    `;
	},
};

// App: Sovereign Link (Status HUD)
const appSovereign: AppConfig = {
	id: "sovereign",
	name: "Sovereign Link",
	icon: "/assets/icons/sovereign.png",
	width: 500,
	height: 450,
	contentRenderer: (body) => {
		body.innerHTML = `
      <div class="sovereign-hud">
        <div class="hud-header">
           <div class="resonance-circle" id="resonance-ring"></div>
           <div class="hud-title-vessel">
             <h3>SOVEREIGN INTEGRITY</h3>
             <p id="integrity-status">HARDENING...</p>
           </div>
        </div>
        <div class="stats-grid">
           <div class="stat-card">
             <div class="stat-label">TOTAL BLOCKED</div>
             <div class="stat-value" id="stat-total">0</div>
           </div>
           <div class="stat-card">
             <div class="stat-label">HIJACKS PREVENTED</div>
             <div class="stat-value" id="stat-hijack">0</div>
           </div>
           <div class="stat-card">
             <div class="stat-label">INJECTIONS NEUTRALIZED</div>
             <div class="stat-value" id="stat-injection">0</div>
           </div>
           <div class="stat-card">
             <div class="stat-label">ENTROPY ANOMALIES</div>
             <div class="stat-value" id="stat-entropy">0</div>
           </div>
        </div>
        <div class="threat-footer">
          <div style="font-size:10px; opacity:0.4;">AEON SHIELD CORE V1.17</div>
          <div class="pulse-indicator"></div>
        </div>
      </div>
    `;

		const integrityLog = body.querySelector("#integrity-status") as HTMLElement;
		const totalVal = body.querySelector("#stat-total") as HTMLElement;
		const hijackVal = body.querySelector("#stat-hijack") as HTMLElement;
		const injectionVal = body.querySelector("#stat-injection") as HTMLElement;
		const entropyVal = body.querySelector("#stat-entropy") as HTMLElement;
		const ring = body.querySelector("#resonance-ring") as HTMLElement;

		let interval: any;

		const updateStats = async () => {
			try {
				const token = localStorage.getItem("elysia_access_token") || "";
				const response = await fetch(`${API_BASE}/api/system/security/stats`, {
					headers: { "Authorization": `Bearer ${token}` },
				});
				const data = await response.json();
				integrityLog.innerText = `INTEGRITY: ${data.integrity}`;
				integrityLog.style.color = data.triple_green ? "#34d399" : "#fbbf24";

				const stats = data.threat_telemetry;
				totalVal.innerText = stats.blocked_total.toString();
				hijackVal.innerText = stats.hijack_blocked.toString();
				injectionVal.innerText = stats.injection_blocked.toString();
				entropyVal.innerText = stats.entropy_blocked.toString();

				// Resonance animation intensity based on total threats (calm vs active)
				const pulseSpeed = Math.max(1, 5 - stats.blocked_total * 0.1);
				ring.style.animationDuration = `${pulseSpeed}s`;
			} catch (_e) {
				integrityLog.innerText = "LINK DISCONNECTED";
				integrityLog.style.color = "#f87171";
			}
		};

		updateStats();
		interval = setInterval(updateStats, 2000);

		// Cleanup on close is handled by the window being removed, but ideally we'd want a registry
		// For now, simpler: window-layer observers or just let it be.
	},
};

// --- 5. Dock Interaction ---
document.querySelectorAll(".dock-item").forEach((item) => {
	item.addEventListener("click", () => {
		const appName = item.getAttribute("data-app");
		if (appName === "chat") wm.createWindow(appChat);
		if (appName === "sandbox") wm.createWindow(appSandbox);
		if (appName === "vault") wm.createWindow(appVault);
		if (appName === "sovereign") wm.createWindow(appSovereign);
	});
});

// Start with Chat App open
setTimeout(() => {
	// wm.createWindow(appChat); // Auto-open can be added here
}, 3000);
