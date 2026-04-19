export interface AppConfig {
	id: string;
	name: string;
	icon: string;
	width: number;
	height: number;
	fullScreen?: boolean;
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
		const header = win.querySelector(".window-header") as HTMLElement;
		const title = win.querySelector(".window-title") as HTMLElement;
		const body = win.querySelector(".window-body") as HTMLElement;
		const closeBtn = win.querySelector(".close-btn") as HTMLElement;
		const minBtn = win.querySelector(".minimize-btn") as HTMLElement;
		const maxBtn = win.querySelector(".maximize-btn") as HTMLElement;

		win.id = `window-${app.id}`;
		title.innerText = app.name;

		// Initial Pos Memory
		let lastPos = { top: "0px", left: "0px", width: "0px", height: "0px" };

		if (app.fullScreen) {
			win.classList.add("window-fullscreen");
			win.style.width = "100%";
			win.style.height = "100%";
			win.style.left = "0";
			win.style.top = "0";
			if (header) header.style.display = "none";
		} else {
			win.style.width = `${app.width}px`;
			win.style.height = `${app.height}px`;
			win.style.left = `${100 + Math.random() * 50}px`;
			win.style.top = `${60 + Math.random() * 50}px`;
			this.makeDraggable(win);
		}

		app.contentRenderer(body);

		closeBtn.onclick = (e) => {
			e.stopPropagation();
			win.remove();
		};

		if (minBtn) {
			minBtn.onclick = (e) => {
				e.stopPropagation();
				win.classList.toggle("minimized");
			};
		}

		if (maxBtn) {
			maxBtn.onclick = (e) => {
				e.stopPropagation();
				if (win.classList.contains("maximized")) {
					win.classList.remove("maximized");
					win.style.top = lastPos.top;
					win.style.left = lastPos.left;
					win.style.width = lastPos.width;
					win.style.height = lastPos.height;
				} else {
					lastPos = {
						top: win.style.top,
						left: win.style.left,
						width: win.style.width,
						height: win.style.height,
					};
					win.classList.add("maximized");
					win.style.top = "32px"; // Below top bar
					win.style.left = "0px";
					win.style.width = "100%";
					win.style.height = "calc(100% - 32px)";
				}
			};
		}

		win.onmousedown = () => this.focus(win);

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
		if (!header) return;
		let x = 0;
		let y = 0;
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
