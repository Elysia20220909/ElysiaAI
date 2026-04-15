export interface AppConfig {
	id: string;
	name: string;
	icon: string;
	width: number;
	height: number;
	contentRenderer: (windowBody: HTMLElement) => void;
}

export const API_BASE = "http://127.0.0.1:3000";

export async function fetchWithAuth(path: string, options: RequestInit = {}) {
	const token = localStorage.getItem("elysia_token");
	const headers = {
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...options.headers,
	};
	return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export class WindowManager {
	private layer: HTMLElement;
	private template: HTMLTemplateElement;
	private activeZ = 100;

	constructor(layerId = "window-layer", templateId = "window-template") {
		this.layer = document.getElementById(layerId) as HTMLElement;
		this.template = document.getElementById(templateId) as HTMLTemplateElement;
	}

	createWindow(app: AppConfig) {
		if (!this.template || !this.layer) return;
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
		document.querySelectorAll(".window").forEach((w) => w.classList.remove("active-window"));
		win.classList.add("active-window");
	}

	private makeDraggable(win: HTMLElement) {
		const header = win.querySelector(".window-header") as HTMLElement;
		let x = 0, y = 0;
		header.onmousedown = (e) => {
			e.preventDefault();
			x = e.clientX;
			y = e.clientY;
			document.onmousemove = (e) => {
				const dx = x - e.clientX;
				const dy = y - e.clientY;
				x = e.clientX;
				y = e.clientY;
				win.style.top = `${win.offsetTop - dy}px`;
				win.style.left = `${win.offsetLeft - dx}px`;
			};
			document.onmouseup = () => {
				document.onmousemove = null;
				document.onmouseup = null;
			};
		};
	}
}
