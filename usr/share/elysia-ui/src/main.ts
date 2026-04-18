import "./style.css";
import {
	type AppConfig,
	WindowManager,
	fetchWithAuth,
} from "../../../packages/shared/src/ui-bridge";

const wm = new WindowManager();

// --- 1. Boot sequence & Security ---
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
			statusText.innerText = "FaceID Authentication Successful";
			statusText.style.color = "#ffb7c5";
			setTimeout(() => {
				lockScreen.classList.add("unlocked");
				desktop.classList.add("visible");
				desktop.classList.remove("hidden");
				startClock();
			}, 600);
		}
	};
	setTimeout(bootSequence, 800);
}

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

// --- 2. App Implementations ---

// App: Elysia Chat
const appChat: AppConfig = {
	id: "chat",
	name: "Elysia Intelligence",
	icon: "/assets/icons/chat.png",
	width: 700,
	height: 550,
	contentRenderer: (body) => {
		body.innerHTML = `<div class="p-4">Secure Chat Tunnel Established.</div>`;
	},
};

// --- 3. Interaction Handlers ---
document.querySelectorAll(".dock-item").forEach((item) => {
	item.addEventListener("click", () => {
		const appName = item.getAttribute("data-app");
		if (appName === "chat") wm.createWindow(appChat);
	});
});
