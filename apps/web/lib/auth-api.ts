const csrfCookieName = "elysia_csrf_token";
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export type AuthUser = {
	id: string;
	username: string;
	role: string;
};

export type AuthSession = {
	authenticated: boolean;
	transport: "httpOnly-cookie";
	user?: AuthUser;
	expiresAt?: string | null;
	csrfToken?: string;
};

export type LoginResult = {
	authenticated: boolean;
	tokenType: "Bearer";
	transport: "httpOnly-cookie";
	expiresIn: number;
	username: string;
	role: string;
	csrfToken: string;
};

export type ApiErrorBody = {
	error?: string;
	code?: string;
	status?: number;
	timestamp?: string;
};

export class ApiRequestError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(message: string, status: number, code = "API_ERROR") {
		super(message);
		this.name = "ApiRequestError";
		this.status = status;
		this.code = code;
	}
}

export async function login(
	username: string,
	password: string,
): Promise<LoginResult> {
	return apiJson<LoginResult>("/api/auth/token", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ username, password }),
	});
}

export async function getSession(): Promise<AuthSession> {
	return apiJson<AuthSession>("/api/auth/session");
}

export async function refreshSession(): Promise<LoginResult> {
	return apiJson<LoginResult>(
		"/api/auth/refresh",
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({}),
		},
		{ retryOnUnauthorized: false },
	);
}

export async function logout(): Promise<void> {
	await apiJson<{ message: string }>(
		"/api/auth/logout",
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({}),
		},
		{ retryOnUnauthorized: false },
	);
}

async function apiJson<T>(
	path: string,
	init: RequestInit = {},
	options: { retryOnUnauthorized?: boolean } = {},
): Promise<T> {
	const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
	const response = await fetchWithCsrf(path, init);

	if (
		response.status === 401 &&
		retryOnUnauthorized &&
		path !== "/api/auth/refresh"
	) {
		await refreshSession();
		return apiJson<T>(path, init, { retryOnUnauthorized: false });
	}

	const data = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
	if (!response.ok) {
		throw new ApiRequestError(
			data.error || "Request failed",
			response.status,
			data.code,
		);
	}
	return data as T;
}

async function fetchWithCsrf(
	path: string,
	init: RequestInit,
): Promise<Response> {
	const method = (init.method ?? "GET").toUpperCase();
	const headers = new Headers(init.headers);
	if (unsafeMethods.has(method)) {
		const csrfToken = readCookie(csrfCookieName);
		if (csrfToken) headers.set("x-csrf-token", csrfToken);
	}

	return fetch(path, {
		...init,
		method,
		headers,
		credentials: "include",
		cache: "no-store",
	});
}

function readCookie(name: string): string | null {
	if (typeof document === "undefined") return null;

	const cookie = document.cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${name}=`));
	if (!cookie) return null;

	return decodeURIComponent(cookie.slice(name.length + 1));
}
