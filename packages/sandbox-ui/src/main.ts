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
const lockScreen = document.getElementById("lock-screen")!;
const desktop = document.getElementById("desktop")!;
const statusText = document.getElementById("status-text")!;
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

// --- 2. System Utilities ---
function startClock() {
	const clockEl = document.getElementById("system-time")!;
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
	private layer = document.getElementById("window-layer")!;
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
			} catch (e) {
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
          <h3>QA Orchestra</h3>
          <p style="font-size:11px; opacity:0.6; margin-bottom:20px;">隔離環境での人格整合性テスト</p>
          <button class="btn-primary" id="run-btn">合奏を開始</button>
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
			} catch (e) {
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

// --- 5. Dock Interaction ---
document.querySelectorAll(".dock-item").forEach((item) => {
	item.addEventListener("click", () => {
		const appName = item.getAttribute("data-app");
		if (appName === "chat") wm.createWindow(appChat);
		if (appName === "sandbox") wm.createWindow(appSandbox);
		if (appName === "vault") wm.createWindow(appVault);
	});
});

// Start with Chat App open
setTimeout(() => {
	// wm.createWindow(appChat); // Auto-open can be added here
}, 3000);
