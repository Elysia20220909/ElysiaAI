import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { AUTH_COOKIE_NAMES } from "../lib/auth-cookies";
import { authRoutes } from "./auth-routes";

const previousTestMode = process.env.ELYSIA_TEST_MODE;

function setCookies(response: Response): string[] {
	const values = (
		response.headers as Headers & { getSetCookie?: () => string[] }
	).getSetCookie?.();
	if (values?.length) return values;

	const combined = response.headers.get("set-cookie");
	return combined ? [combined] : [];
}

function cookieValue(cookies: string[], name: string): string {
	const prefix = `${name}=`;
	for (const cookie of cookies) {
		const pair = cookie.split(";", 1)[0] ?? "";
		if (pair.startsWith(prefix)) {
			return decodeURIComponent(pair.slice(prefix.length));
		}
	}
	throw new Error(`Missing ${name} cookie`);
}

function cookieHeader(cookies: string[]): string {
	return cookies.map((cookie) => cookie.split(";", 1)[0]).join("; ");
}

function jsonRequest(
	path: string,
	body: Record<string, unknown>,
	headers: Record<string, string> = {},
): Request {
	return new Request(`http://localhost${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

async function login() {
	const response = await authRoutes.handle(
		jsonRequest("/auth/token", {
			username: "elysia-test",
			password: "local-test-password",
		}),
	);
	const body = (await response.json()) as Record<string, unknown>;
	const cookies = setCookies(response);

	expect(response.status).toBe(200);
	expect(body.authenticated).toBe(true);
	expect(body.transport).toBe("httpOnly-cookie");
	expect(body.refreshToken).toBeUndefined();
	expect(cookies.join("\n").match(/HttpOnly/g)?.length).toBe(2);

	return { body, cookies };
}

beforeAll(() => {
	process.env.ELYSIA_TEST_MODE = "1";
});

afterAll(() => {
	if (previousTestMode === undefined) {
		delete process.env.ELYSIA_TEST_MODE;
	} else {
		process.env.ELYSIA_TEST_MODE = previousTestMode;
	}
});

describe("auth routes", () => {
	test("reports an anonymous session without issuing credentials", async () => {
		const response = await authRoutes.handle(
			new Request("http://localhost/auth/session"),
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.authenticated).toBe(false);
		expect(setCookies(response)).toHaveLength(0);
	});

	test("issues cookies, rotates refresh tokens, and revokes logout tokens", async () => {
		const first = await login();
		const firstRefresh = cookieValue(first.cookies, AUTH_COOKIE_NAMES.refresh);
		const accessCookie = cookieValue(first.cookies, AUTH_COOKIE_NAMES.access);

		const sessionResponse = await authRoutes.handle(
			new Request("http://localhost/auth/session", {
				headers: {
					cookie: `${AUTH_COOKIE_NAMES.access}=${encodeURIComponent(accessCookie)}`,
				},
			}),
		);
		const session = (await sessionResponse.json()) as {
			authenticated: boolean;
			user?: { username?: string; role?: string };
		};
		expect(session.authenticated).toBe(true);
		expect(session.user?.username).toBe("elysia-test");
		expect(session.user?.role).toBe("admin");

		const rotateResponse = await authRoutes.handle(
			jsonRequest("/auth/refresh", { refreshToken: firstRefresh }),
		);
		const rotatedCookies = setCookies(rotateResponse);
		const rotatedRefresh = cookieValue(
			rotatedCookies,
			AUTH_COOKIE_NAMES.refresh,
		);
		expect(rotateResponse.status).toBe(200);
		expect(rotatedRefresh).not.toBe(firstRefresh);

		const replayResponse = await authRoutes.handle(
			jsonRequest("/auth/refresh", { refreshToken: firstRefresh }),
		);
		const replay = (await replayResponse.json()) as { code?: string };
		expect(replayResponse.status).toBe(401);
		expect(replay.code).toBe("AUTH_REFRESH_INVALID");

		const logoutResponse = await authRoutes.handle(
			jsonRequest("/auth/logout", { refreshToken: rotatedRefresh }),
		);
		expect(logoutResponse.status).toBe(200);
		expect(
			setCookies(logoutResponse).every((cookie) =>
				cookie.includes("Max-Age=0"),
			),
		).toBe(true);

		const revokedResponse = await authRoutes.handle(
			jsonRequest("/auth/refresh", { refreshToken: rotatedRefresh }),
		);
		expect(revokedResponse.status).toBe(401);
	});

	test("requires matching CSRF for cookie-based refresh", async () => {
		const session = await login();
		const cookies = cookieHeader(session.cookies);
		const csrf = cookieValue(session.cookies, AUTH_COOKIE_NAMES.csrf);

		const rejected = await authRoutes.handle(
			jsonRequest("/auth/refresh", {}, { cookie: cookies }),
		);
		const rejectedBody = (await rejected.json()) as { code?: string };
		expect(rejected.status).toBe(403);
		expect(rejectedBody.code).toBe("CSRF_TOKEN_INVALID");

		const accepted = await authRoutes.handle(
			jsonRequest(
				"/auth/refresh",
				{},
				{
					cookie: cookies,
					"x-csrf-token": csrf,
				},
			),
		);
		expect(accepted.status).toBe(200);
	});

	test("returns stable client errors for missing refresh and invalid login input", async () => {
		const missingRefresh = await authRoutes.handle(
			jsonRequest("/auth/refresh", {}),
		);
		const missingBody = (await missingRefresh.json()) as { code?: string };
		expect(missingRefresh.status).toBe(401);
		expect(missingBody.code).toBe("AUTH_REFRESH_REQUIRED");

		const invalidLogin = await authRoutes.handle(
			jsonRequest("/auth/token", {
				username: "elysia-test",
				password: "",
			}),
		);
		expect(invalidLogin.status).toBe(422);
		expect(setCookies(invalidLogin)).toHaveLength(0);
	});
});
