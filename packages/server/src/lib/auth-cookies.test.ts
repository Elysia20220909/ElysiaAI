import { describe, expect, test } from "bun:test";
import {
	AUTH_COOKIE_NAMES,
	AuthRequestError,
	appendAuthCookies,
	getCookieValue,
	requireAccessToken,
} from "./auth-cookies";
import { InMemoryRefreshTokenStore, issueTokenPair } from "./auth-tokens";

const user = {
	id: "cookie-user-1",
	username: "cookie-elysia",
	role: "admin",
};

async function createCookieHeader(csrfToken = "csrf-test-token") {
	const tokens = await issueTokenPair(user, new InMemoryRefreshTokenStore());
	return [
		`${AUTH_COOKIE_NAMES.access}=${encodeURIComponent(tokens.accessToken)}`,
		`${AUTH_COOKIE_NAMES.csrf}=${encodeURIComponent(csrfToken)}`,
	].join("; ");
}

describe("Auth cookie transport", () => {
	test("sets access and refresh tokens as HttpOnly cookies", async () => {
		const tokens = await issueTokenPair(user, new InMemoryRefreshTokenStore());
		const headers = new Headers();
		appendAuthCookies(
			headers,
			new Request("http://localhost/auth/token"),
			tokens,
			"csrf-test-token",
		);

		const setCookie =
			(headers as Headers & { getSetCookie?: () => string[] })
				.getSetCookie?.()
				.join("\n") ??
			headers.get("set-cookie") ??
			"";

		expect(setCookie).toContain(AUTH_COOKIE_NAMES.access);
		expect(setCookie).toContain(AUTH_COOKIE_NAMES.refresh);
		expect(setCookie).toContain(AUTH_COOKIE_NAMES.csrf);
		expect(setCookie.match(/HttpOnly/g)?.length).toBe(2);
	});

	test("reads encoded cookie values", () => {
		const request = new Request("http://localhost/api", {
			headers: {
				cookie: `${AUTH_COOKIE_NAMES.csrf}=hello%20elysia`,
			},
		});

		expect(getCookieValue(request, AUTH_COOKIE_NAMES.csrf)).toBe(
			"hello elysia",
		);
	});

	test("accepts access token from HttpOnly cookie on safe requests", async () => {
		const request = new Request("http://localhost/api/profile", {
			headers: {
				cookie: await createCookieHeader(),
			},
		});

		const payload = requireAccessToken(request);
		expect(payload.username).toBe(user.username);
		expect(payload.role).toBe(user.role);
	});

	test("requires CSRF header for cookie-authenticated writes", async () => {
		const request = new Request("http://localhost/api/chat", {
			method: "POST",
			headers: {
				cookie: await createCookieHeader(),
			},
		});

		expect(() => requireAccessToken(request)).toThrow(AuthRequestError);
	});

	test("accepts cookie-authenticated writes when CSRF matches", async () => {
		const csrfToken = "csrf-test-token";
		const request = new Request("http://localhost/api/chat", {
			method: "POST",
			headers: {
				cookie: await createCookieHeader(csrfToken),
				"x-csrf-token": csrfToken,
			},
		});

		const payload = requireAccessToken(request);
		expect(payload.username).toBe(user.username);
	});

	test("does not require CSRF for explicit bearer requests", async () => {
		const tokens = await issueTokenPair(user, new InMemoryRefreshTokenStore());
		const request = new Request("http://localhost/api/chat", {
			method: "POST",
			headers: {
				authorization: `Bearer ${tokens.accessToken}`,
			},
		});

		const payload = requireAccessToken(request);
		expect(payload.username).toBe(user.username);
	});
});
