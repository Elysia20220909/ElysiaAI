import { randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../../../../src/config.ts";
import {
	accessTokenExpiresInSeconds,
	refreshTokenExpiresInMs,
	type TokenPair,
} from "./auth-tokens";
import { CONFIG, jsonError } from "./constants";

export const AUTH_COOKIE_NAMES = {
	access: "elysia_access_token",
	refresh: "elysia_refresh_token",
	csrf: "elysia_csrf_token",
} as const;

export type AuthTokenSource = "authorization" | "cookie";
export type RefreshTokenSource = "body" | "cookie";

export type AccessTokenPayload = jwt.JwtPayload & {
	userId?: string;
	username?: string;
	role?: string;
};

export class AuthRequestError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: string,
	) {
		super(message);
		this.name = "AuthRequestError";
	}
}

type CookieOptions = {
	httpOnly?: boolean;
	maxAgeSeconds: number;
	path?: string;
	sameSite?: "Lax" | "Strict" | "None";
	secure?: boolean;
};

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function base64Url(bytes = 32): string {
	return randomBytes(bytes)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

function serializeCookie(
	name: string,
	value: string,
	{
		httpOnly = false,
		maxAgeSeconds,
		path = "/",
		sameSite = "Lax",
		secure = isCookieSecureByDefault(),
	}: CookieOptions,
): string {
	const parts = [
		`${name}=${encodeURIComponent(value)}`,
		`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
		`Path=${path}`,
		`SameSite=${sameSite}`,
	];

	if (httpOnly) parts.push("HttpOnly");
	if (secure) parts.push("Secure");

	return parts.join("; ");
}

function isCookieSecureByDefault(): boolean {
	return config.nodeEnv === "production" || config.forceHttps;
}

export function isSecureRequest(request: Request): boolean {
	const url = new URL(request.url);
	return (
		url.protocol === "https:" ||
		request.headers.get("x-forwarded-proto") === "https" ||
		isCookieSecureByDefault()
	);
}

export function createCsrfToken(): string {
	return base64Url(32);
}

export function parseCookieHeader(
	cookieHeader: string | null,
): Map<string, string> {
	const cookies = new Map<string, string>();
	if (!cookieHeader) return cookies;

	for (const part of cookieHeader.split(";")) {
		const index = part.indexOf("=");
		if (index <= 0) continue;
		const name = part.slice(0, index).trim();
		const value = part.slice(index + 1).trim();
		if (!name) continue;
		try {
			cookies.set(name, decodeURIComponent(value));
		} catch {
			cookies.set(name, value);
		}
	}

	return cookies;
}

export function getCookieValue(request: Request, name: string): string | null {
	return parseCookieHeader(request.headers.get("cookie")).get(name) ?? null;
}

export function getBearerToken(authorization: string | null): string | null {
	if (!authorization) return null;

	const [scheme, token] = authorization.trim().split(/\s+/, 2);
	if (scheme?.toLowerCase() !== "bearer") return null;
	if (!token || token === "undefined" || token === "null") return null;

	return token;
}

export function resolveAccessTokenFromRequest(
	request: Request,
): { token: string; source: AuthTokenSource } | null {
	const bearerToken = getBearerToken(request.headers.get("authorization"));
	if (bearerToken) {
		return { token: bearerToken, source: "authorization" };
	}

	const cookieToken = getCookieValue(request, AUTH_COOKIE_NAMES.access);
	return cookieToken ? { token: cookieToken, source: "cookie" } : null;
}

export function resolveRefreshTokenFromRequest(
	request: Request,
	bodyRefreshToken?: string,
): { token: string; source: RefreshTokenSource } | null {
	const trimmed = bodyRefreshToken?.trim();
	if (trimmed) return { token: trimmed, source: "body" };

	const cookieToken = getCookieValue(request, AUTH_COOKIE_NAMES.refresh);
	return cookieToken ? { token: cookieToken, source: "cookie" } : null;
}

function constantTimeEquals(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	if (leftBuffer.length !== rightBuffer.length) return false;
	return timingSafeEqual(leftBuffer, rightBuffer);
}

export function assertCsrfForCookieAuth(
	request: Request,
	source: AuthTokenSource | RefreshTokenSource,
): void {
	if (source !== "cookie" || !unsafeMethods.has(request.method.toUpperCase())) {
		return;
	}

	const csrfCookie = getCookieValue(request, AUTH_COOKIE_NAMES.csrf);
	const csrfHeader = request.headers.get("x-csrf-token");
	if (
		!csrfCookie ||
		!csrfHeader ||
		!constantTimeEquals(csrfCookie, csrfHeader)
	) {
		throw new AuthRequestError(
			"CSRF token mismatch",
			403,
			"CSRF_TOKEN_INVALID",
		);
	}
}

export function verifyAccessToken(token: string): AccessTokenPayload {
	try {
		return jwt.verify(token, CONFIG.JWT_SECRET) as AccessTokenPayload;
	} catch {
		throw new AuthRequestError(
			"Invalid or expired token",
			401,
			"AUTH_TOKEN_INVALID",
		);
	}
}

export function requireAccessToken(request: Request): AccessTokenPayload {
	const resolved = resolveAccessTokenFromRequest(request);
	if (!resolved) {
		throw new AuthRequestError("Missing Bearer token", 401, "AUTH_REQUIRED");
	}

	assertCsrfForCookieAuth(request, resolved.source);
	return verifyAccessToken(resolved.token);
}

export function getOptionalAccessToken(
	request: Request,
): AccessTokenPayload | null {
	const resolved = resolveAccessTokenFromRequest(request);
	if (!resolved) return null;
	assertCsrfForCookieAuth(request, resolved.source);
	return verifyAccessToken(resolved.token);
}

export function appendAuthCookies(
	headers: Headers,
	request: Request,
	tokens: TokenPair,
	csrfToken = createCsrfToken(),
): string {
	const secure = isSecureRequest(request);
	headers.append(
		"set-cookie",
		serializeCookie(AUTH_COOKIE_NAMES.access, tokens.accessToken, {
			httpOnly: true,
			maxAgeSeconds: tokens.expiresIn || accessTokenExpiresInSeconds,
			secure,
		}),
	);
	headers.append(
		"set-cookie",
		serializeCookie(AUTH_COOKIE_NAMES.refresh, tokens.refreshToken, {
			httpOnly: true,
			maxAgeSeconds: refreshTokenExpiresInMs / 1000,
			secure,
		}),
	);
	headers.append(
		"set-cookie",
		serializeCookie(AUTH_COOKIE_NAMES.csrf, csrfToken, {
			httpOnly: false,
			maxAgeSeconds: refreshTokenExpiresInMs / 1000,
			secure,
		}),
	);

	return csrfToken;
}

export function appendClearedAuthCookies(
	headers: Headers,
	request: Request,
): void {
	const secure = isSecureRequest(request);
	for (const name of Object.values(AUTH_COOKIE_NAMES)) {
		headers.append(
			"set-cookie",
			serializeCookie(name, "", {
				maxAgeSeconds: 0,
				httpOnly: name !== AUTH_COOKIE_NAMES.csrf,
				secure,
			}),
		);
	}
}

export function jsonWithAuthCookies(
	request: Request,
	tokens: TokenPair,
	body: Record<string, unknown>,
	status = 200,
): Response {
	const headers = new Headers({
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
	});
	const csrfToken = appendAuthCookies(headers, request, tokens);

	return new Response(JSON.stringify({ ...body, csrfToken }), {
		status,
		headers,
	});
}

export function jsonWithClearedAuthCookies(
	request: Request,
	body: Record<string, unknown>,
	status = 200,
): Response {
	const headers = new Headers({
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
	});
	appendClearedAuthCookies(headers, request);

	return new Response(JSON.stringify(body), { status, headers });
}

export function authErrorResponse(
	error: unknown,
	fallback = "Unauthorized",
): Response {
	if (error instanceof AuthRequestError) {
		return jsonError(error.status, error.message, error.code);
	}

	if (error instanceof Error && error.name === "RefreshTokenValidationError") {
		return jsonError(401, error.message, "AUTH_REFRESH_INVALID");
	}

	return jsonError(
		401,
		error instanceof Error ? error.message : fallback,
		"AUTH_FAILED",
	);
}
