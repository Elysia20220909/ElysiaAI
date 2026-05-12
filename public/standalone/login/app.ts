export {};

const cookieNames = {
	csrf: "elysia_csrf_token",
} as const;

type AuthSessionResponse = {
	authenticated: boolean;
	user?: {
		id: string;
		username: string;
		role: string;
	};
	csrfToken?: string;
	error?: string;
};

type NeuralStatusResponse = {
	status?: string;
	intrusionDetection?: {
		status?: string;
	};
	session?: {
		username?: string;
		neuralSignature?: string;
	};
	csrfToken?: string;
	error?: string;
};

type LoginResponse = {
	authenticated: boolean;
	username?: string;
	csrfToken?: string;
	error?: string;
};

const loginForm = requireElement("login-form", HTMLFormElement);
const usernameInput = requireElement("username", HTMLInputElement);
const passwordInput = requireElement("password", HTMLInputElement);
const button = requireElement("login-btn", HTMLButtonElement);
const errorMessage = requireElement("error-msg", HTMLDivElement);
const coreStatus = document.querySelector<HTMLElement>(".core-status");
const tokenLattice = requireElement("token-lattice", HTMLElement);
const intrusionSentinel = requireElement("intrusion-sentinel", HTMLElement);
const signatureHash = requireElement("signature-hash", HTMLElement);
const buttonText = button.querySelector<HTMLElement>(".btn-text");

let csrfToken: string | null = readCookie(cookieNames.csrf);

function requireElement<T extends HTMLElement>(
	id: string,
	expectedType: new () => T,
): T {
	const element = document.getElementById(id);
	if (!(element instanceof expectedType)) {
		throw new Error(`Missing element: ${id}`);
	}
	return element;
}

function readCookie(name: string): string | null {
	const cookie = document.cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${name}=`));
	if (!cookie) return null;
	return decodeURIComponent(cookie.slice(name.length + 1));
}

function csrfHeaders(): Record<string, string> {
	csrfToken = readCookie(cookieNames.csrf) || csrfToken;
	return csrfToken ? { "x-csrf-token": csrfToken } : {};
}

async function requestJson<T extends { csrfToken?: string; error?: string }>(
	url: string,
	init: RequestInit = {},
): Promise<T> {
	const method = init.method || "GET";
	const headers = new Headers(init.headers);
	if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
		for (const [key, value] of Object.entries(csrfHeaders())) {
			headers.set(key, value);
		}
	}

	const response = await fetch(url, {
		...init,
		method,
		credentials: "same-origin",
		headers,
	});
	const data = (await response.json().catch(() => ({}))) as T;
	if (!response.ok) {
		throw new Error(data.error || "認証に失敗しました");
	}
	if (typeof data.csrfToken === "string") {
		csrfToken = data.csrfToken;
	}
	return data;
}

function setButtonLabel(label: string): void {
	if (buttonText) buttonText.textContent = label;
}

function setStatus(text: string, linked = false): void {
	if (!coreStatus) return;
	coreStatus.textContent = text;
	coreStatus.classList.toggle("is-linked", linked);
}

function showError(message: string): void {
	errorMessage.textContent = message;
	errorMessage.hidden = false;
	setStatus("接続できませんでした。入力を確かめてください。");
}

function clearError(): void {
	errorMessage.textContent = "";
	errorMessage.hidden = true;
}

function clearLegacyTokenStorage(): void {
	localStorage.removeItem("elysia_access_token");
	localStorage.removeItem("elysia_refresh_token");
}

function markLinkEstablished(username: string): void {
	tokenLattice.textContent = "保護中";
	intrusionSentinel.textContent = "静穏";
	setButtonLabel("接続しました");
	setStatus(`${username} として接続しました。`, true);
	localStorage.setItem("elysia_chat_user", username);
	clearLegacyTokenStorage();
}

async function refreshNeuralStatus(): Promise<void> {
	const session = await requestJson<AuthSessionResponse>("/auth/session");
	if (!session.authenticated) return;

	const status = await requestJson<NeuralStatusResponse>(
		"/api/neural-auth/status",
	);
	tokenLattice.textContent = status.status || "linked";
	intrusionSentinel.textContent =
		status.intrusionDetection?.status || "watching";
	signatureHash.textContent =
		status.session?.neuralSignature ||
		localStorage.getItem("elysia_neural_signature") ||
		"sealed";
	if (typeof status.session?.username === "string") {
		setStatus(`${status.session.username} として接続中です。`, true);
	}
}

function redirectToDesktop(delay = 900): void {
	window.setTimeout(() => {
		window.location.href = "/desktop.html";
	}, delay);
}

async function runDevAutoLogin(): Promise<void> {
	const params = new URLSearchParams(window.location.search);
	if (params.get("autologin") !== "test") return;

	button.disabled = true;
	setButtonLabel("接続中");
	clearError();
	setStatus("開発用セッションを確認しています。");

	try {
		const data = await requestJson<LoginResponse>("/auth/dev-login", {
			method: "POST",
			headers: { "content-type": "application/json" },
		});
		const username = data.username || "admin";
		usernameInput.value = username;
		markLinkEstablished(username);
		await refreshNeuralStatus();
		redirectToDesktop();
	} catch (error) {
		button.disabled = false;
		setButtonLabel("再試行");
		showError(error instanceof Error ? error.message : "接続できませんでした");
	}
}

loginForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	clearError();

	const username = usernameInput.value.trim();
	const password = passwordInput.value;
	if (!username || !password) {
		showError("ユーザー名とパスワードを入力してください");
		return;
	}

	button.disabled = true;
	setButtonLabel("確認中");
	setStatus("合鍵を照合しています。");

	try {
		const data = await requestJson<LoginResponse>("/auth/token", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ username, password }),
		});
		markLinkEstablished(data.username || username);
		await refreshNeuralStatus();
		redirectToDesktop();
	} catch (error) {
		button.disabled = false;
		setButtonLabel("ログイン");
		showError(error instanceof Error ? error.message : "認証に失敗しました");
	}
});

refreshNeuralStatus().catch(() => {
	tokenLattice.textContent = "待機中";
});
void runDevAutoLogin();
