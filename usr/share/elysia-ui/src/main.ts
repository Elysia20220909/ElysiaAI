import "./style.css";

// --- System Constants & Types ---
const API_BASE = "http://127.0.0.1:8000";
const API_KEY = "ELYSIATEST-001";

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
		statusText.innerText = "FaceID Authentication Successful";

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

// --- 2. System Utilities ---
function startClock() {
	const clockEl = document.getElementById("system-time");
	if (!clockEl) return;
	setInterval(() => {
		const now = new Date();
		clockEl.innerText = now.toLocaleTimeString("en-US", {
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

		win.id = `window-${app.id}`;
		title.innerText = app.name;
		win.style.width = `${app.width}px`;
		win.style.height = `${app.height}px`;
		win.style.left = `${100 + Math.random() * 50}px`;
		win.style.top = `${60 + Math.random() * 50}px`;

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
            <input type="text" class="chat-input" placeholder="Talk with Elysia..." id="chat-input-field">

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
				const response = await fetch(`${API_BASE}/chat`, {
					method: "POST",
					headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
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
				addMessage(
					"An error occurred. Please check your connection.",
					"system",
				);
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
          <h3>QA Orchestra</h3>
          <p style="font-size:11px; opacity:0.6; margin-bottom:20px;">Personality Integrity Test in Isolated Environment</p>
          <button class="btn-primary" id="run-btn">Start Orchestration</button>

        </div>
        <div class="sandbox-terminal" id="sandbox-term">
          > Elysia OS Sandbox Console Ready...
        </div>
      </div>
    `;

		const runBtn = body.querySelector("#run-btn") as HTMLButtonElement;
		const term = body.querySelector("#sandbox-term") as HTMLElement;

		runBtn.onclick = async () => {
			runBtn.disabled = true;
			term.innerText += "\n> Connecting to orchestrator...";
			try {
				const response = await fetch(`${API_BASE}/sandbox/execute`, {
					method: "POST",
					headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
					body: JSON.stringify({ target_prompt_file: "elysia.prompt.txt" }),
				});
				const data = await response.json();
				for (const step of data.steps) {
					term.innerText += `\n[TESTER]: ${step.question}`;
					term.innerText += `\n[AI]: ${step.answer.substring(0, 30)}...`;
					term.innerText += `\n[EMOTION]: ${step.emotion}`;
					term.scrollTop = term.scrollHeight;
					await new Promise((r) => setTimeout(r, 800));
				}
				term.innerText += "\n\n✨ [SUCCESS] Sandbox Session Completed.";
			} catch (_e) {
				term.innerText += "\n[ERROR] Connection failed.";
			} finally {
				runBtn.disabled = false;
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

// App: Terminal (POSIX Shell)
const appTerminal: AppConfig = {
	id: "terminal",
	name: "Elysia Terminal (sh)",
	icon: "/assets/icons/chat.png",
	width: 600,
	height: 400,
	contentRenderer: (body) => {
		body.innerHTML = `
      <style>
        @keyframes pulse {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      </style>
      <div class="terminal-wrapper" style="height:100%; background:#000; color:#34d399; font-family:monospace; padding:12px; overflow-y:auto; font-size:13px;">
        <div id="term-output">ElysiaOS 1.0.0-resonance (tty1)\nLogin: hoshino\nLast login: Thu Apr  2 13:28:53 on tty1\n\n</div>
        <div style="display:flex;">
          <span style="color:#ffb7c5; margin-right:8px;">hoshino@elysiaAI:~$</span>
          <input type="text" id="term-input" style="flex-grow:1; background:transparent; border:none; color:#34d399; outline:none; font-family:monospace; font-size:13px;">
        </div>
      </div>
    `;

		const output = body.querySelector("#term-output") as HTMLElement;
		const input = body.querySelector("#term-input") as HTMLInputElement;

		input.onkeydown = async (e) => {
			if (e.key === "Enter") {
				const cmd = input.value.trim();
				input.value = "";
				output.innerText += `hoshino@elysiaAI:~$ ${cmd}\n`;

				if (cmd === "clear") {
					output.innerText = "";
					return;
				}

				try {
					const response = await fetch(`${API_BASE}/system/shell`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-api-key": API_KEY,
						},
						body: JSON.stringify({ command: cmd }),
					});
					const data = await response.json();
					output.innerText += `${data.output}\n`;
				} catch (_err) {
					output.innerText += "sh: connection to kernel lost\n";
				}

				output.parentElement?.scrollTo(0, output.parentElement.scrollHeight);
			}
		};
		// Auto-focus terminal
		setTimeout(() => input.focus(), 100);
	},
};

// App: Finder (File Manager)
const appFinder: AppConfig = {
	id: "finder",
	name: "Finder",
	icon: "/assets/icons/finder.png",
	width: 600,
	height: 400,
	contentRenderer: async (body) => {
		const renderFiles = async (path = ".") => {
			body.innerHTML = `<div style="padding:20px; color:white; font-family:'Inter', sans-serif;">
        <h3 style="margin-bottom:16px; opacity:0.7;">ElysiaOS / ${path}</h3>
        <div id="file-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:20px;">
          Loading...
        </div>
      </div>`;
			try {
				const res = await fetch(`${API_BASE}/system/files/list`, {
					method: "POST",
					headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
					body: JSON.stringify({ path }),
				});
				const data = await res.json();
				const list = body.querySelector("#file-list") as HTMLElement;
				list.innerHTML = (data.items as Array<{ name: string; isDir: boolean }>)
					.map(
						(item) => `
          <div class="file-item" style="text-align:center; cursor:pointer;" onclick="window.dispatchEvent(new CustomEvent('finder-cd', {detail: '${path}/${item.name}'}))">
            <div style="font-size:32px;">${item.isDir ? "📁" : "📄"}</div>
            <div style="font-size:12px; margin-top:8px; word-break:break-all;">${item.name}</div>
          </div>
        `,
					)
					.join("");
			} catch (_err) {
				body.innerHTML = `<div style="padding:20px; color:#ff4d4d;">Failed to load files</div>`;
			}
		};
		window.addEventListener("finder-cd", ((e: Event) => {
			const ce = e as CustomEvent;
			renderFiles(ce.detail);
		}) as EventListener);

		await renderFiles();
	},
};

// App: Activity Monitor
const appActivity: AppConfig = {
	id: "activity",
	name: "Activity Monitor",
	icon: "/assets/icons/activity.png",
	width: 500,
	height: 350,
	contentRenderer: (body) => {
		const updateStatus = async () => {
			try {
				const res = await fetch(`${API_BASE}/system/stats`, {
					headers: { "x-api-key": API_KEY },
				});
				const data = await res.json();
				body.innerHTML = `
          <div style="padding:24px; color:white; font-family:'Inter', sans-serif; background:rgba(0,0,0,0.3); height:100%;">
            <h2 style="margin-bottom:20px; font-weight:300;">System Overview</h2>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
              <div style="background:rgba(255,255,255,0.05); padding:16px; border-radius:12px;">
                <div style="opacity:0.5; font-size:12px;">UPTIME</div>
                <div style="font-size:20px; color:#ffb7c5;">${data.uptime}</div>
              </div>
              <div style="background:rgba(255,255,255,0.05); padding:16px; border-radius:12px;">
                <div style="opacity:0.5; font-size:12px;">KERNEL</div>
                <div style="font-size:16px;">${data.kernel}</div>
              </div>
              <div style="background:rgba(255,255,255,0.05); padding:16px; border-radius:12px;">
                <div style="opacity:0.5; font-size:12px;">MEMORY</div>
                <div style="font-size:20px;">${data.memory_used}</div>
              </div>
              <div style="background:rgba(255,255,255,0.05); padding:16px; border-radius:12px;">
                <div style="opacity:0.5; font-size:12px;">EMOTIONS</div>
                <div style="font-size:20px; color:#34d399;">${data.emotions_processed}</div>
              </div>
            </div>
            <div style="margin-top:24px; text-align:center;">
              <div style="height:4px; background:rgba(255,183,197,0.2); border-radius:2px; position:relative; overflow:hidden;">
                <div style="position:absolute; height:100%; width:30%; background:#ffb7c5; animation: pulse 2s infinite;"></div>
              </div>
              <div style="font-size:10px; margin-top:8px; opacity:0.5;">AGENTS ACTIVE: ${data.agents_active}</div>
            </div>
          </div>
        `;
			} catch (_err) {
				body.innerHTML = `<div style="padding:20px; color:#ff4d4d;">Lost connection to Kernel.</div>`;
			}
		};
		updateStatus();
		setInterval(updateStatus, 3000);
	},
};

// App: Console (Log Viewer)
const appConsole: AppConfig = {
	id: "console",
	name: "Console",
	icon: "/assets/icons/console.png",
	width: 700,
	height: 450,
	contentRenderer: (body) => {
		body.innerHTML = `<div class="console-wrapper" style="height:100%; background:#1a1a1a; color:#eee; font-family:monospace; padding:12px; overflow-y:auto; font-size:12px; border-top:1px solid #333;"></div>`;
		const wrapper = body.querySelector(".console-wrapper") as HTMLElement;
		const updateLogs = async () => {
			try {
				const res = await fetch(`${API_BASE}/system/logs/tail`, {
					method: "POST",
					headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
					body: JSON.stringify({ lines: 100 }),
				});
				const data = await res.json();
				wrapper.innerHTML = data.logs
					.map((line: string) => {
						let color = "#bbb";
						if (line.includes("[ERROR]")) color = "#ff4d4d";
						if (line.includes("[WARNING]")) color = "#fbbf24";
						if (line.includes("elysiad")) color = "#ffb7c5";
						return `<div style="color:${color}; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.03);">${line}</div>`;
					})
					.join("");
				wrapper.scrollTo(0, wrapper.scrollHeight);
			} catch (_err) {
				// Silent fail for logs
			}
		};

		updateLogs();
		setInterval(updateLogs, 2000);
	},
};

// --- 5. Dock Interaction ---
document.querySelectorAll(".dock-item").forEach((item) => {
	item.addEventListener("click", () => {
		const appName = item.getAttribute("data-app");
		if (appName === "chat") wm.createWindow(appChat);
		if (appName === "sandbox") wm.createWindow(appSandbox);
		if (appName === "vault") wm.createWindow(appVault);
		if (appName === "terminal") wm.createWindow(appTerminal);
		if (appName === "finder") wm.createWindow(appFinder);
		if (appName === "activity") wm.createWindow(appActivity);
		if (appName === "console") wm.createWindow(appConsole);
	});
});

// Start with Chat App open
setTimeout(() => {
	// wm.createWindow(appChat); // Auto-open can be added here
}, 3000);
