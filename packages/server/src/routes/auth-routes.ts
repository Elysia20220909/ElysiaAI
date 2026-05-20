import { Elysia, t } from "elysia";
import { config, isProd } from "../../../../src/config.ts";
import {
	assertCsrfForCookieAuth,
	authErrorResponse,
	getOptionalAccessToken,
	jsonWithAuthCookies,
	jsonWithClearedAuthCookies,
	resolveRefreshTokenFromRequest,
} from "../lib/auth-cookies";
import {
	InMemoryRefreshTokenStore,
	issueTokenPair,
	type RefreshTokenStore,
	revokeRefreshToken,
	rotateRefreshToken,
} from "../lib/auth-tokens";
import { CONFIG, jsonError } from "../lib/constants";
import { tokenService } from "../lib/database";
import { logger } from "../lib/logger";
import {
	createNeuralSignature,
	recordNeuralAuthEvent,
} from "../lib/neural-auth-system";
import { authenticateUser, createUser } from "../lib/security";

type LoginBody = {
	username: string;
	password: string;
};

type RefreshBody = {
	refreshToken?: string;
};

type LoginUser = {
	id: string;
	username: string;
	role: string;
};

const testRefreshTokenStore = new InMemoryRefreshTokenStore();

function getRefreshTokenStore(): RefreshTokenStore {
	return process.env.ELYSIA_TEST_MODE === "1" || isDevAutoLoginEnabled()
		? testRefreshTokenStore
		: tokenService;
}

function isDevAutoLoginEnabled(): boolean {
	return (
		process.env.NODE_ENV !== "production" &&
		(process.env.ELYSIA_TEST_MODE === "1" ||
			process.env.ELYSIA_KERNEL_LITE === "1" ||
			process.env.ELYSIA_DEV_AUTO_LOGIN === "1")
	);
}

function normalizeLoginUser(user: unknown): LoginUser {
	const candidate = user as Partial<LoginUser> | undefined;
	if (!candidate?.id || !candidate.username) {
		throw new Error("Authenticated user payload is incomplete");
	}

	return {
		id: String(candidate.id),
		username: String(candidate.username),
		role: String(candidate.role || "user"),
	};
}

function getRefreshTokenFromBody(body: unknown): string | undefined {
	if (!body || typeof body !== "object") return undefined;
	const refreshToken = (body as Partial<RefreshBody>).refreshToken;
	return typeof refreshToken === "string" ? refreshToken : undefined;
}

async function issueCookieSession(
	request: Request,
	user: LoginUser,
	body: Record<string, unknown> = {},
): Promise<Response> {
	const tokens = await issueTokenPair(user, getRefreshTokenStore());
	const neuralSignature = createNeuralSignature(user.username);
	recordNeuralAuthEvent({
		type: "token.verify",
		identity: user.username,
		neuralSignature,
		threatLevel: "quiet",
		detail: "Credential exchange completed",
		payload: { role: user.role, transport: "httpOnly-cookie" },
	});

	return jsonWithAuthCookies(request, tokens, {
		authenticated: true,
		tokenType: "Bearer",
		transport: "httpOnly-cookie",
		expiresIn: tokens.expiresIn,
		username: user.username,
		role: user.role,
		neuralSignature,
		...body,
	});
}

export const authRoutes = new Elysia({ prefix: "/auth" })
	.post("/dev-login", async ({ request }) => {
		if (!isDevAutoLoginEnabled()) {
			return jsonError(
				404,
				"Dev auto-login is not enabled",
				"AUTH_DEV_DISABLED",
			);
		}

		try {
			const username = CONFIG.AUTH_USERNAME || "admin";
			const user = { id: `dev-${username}`, username, role: "admin" };
			const response = await issueCookieSession(request, user);
			recordNeuralAuthEvent({
				type: "dev.login",
				identity: username,
				neuralSignature: createNeuralSignature(username),
				threatLevel: "quiet",
				detail: "Development neural link issued",
			});

			return response;
		} catch (error) {
			logger.error("Dev auto-login failed:", error as Error);
			return jsonError(500, "Failed to generate dev token", "AUTH_DEV_FAILED");
		}
	})
	.get("/session", ({ request }) => {
		try {
			const payload = getOptionalAccessToken(request);
			if (!payload) {
				return {
					authenticated: false,
					transport: "httpOnly-cookie",
				};
			}

			return {
				authenticated: true,
				transport: "httpOnly-cookie",
				user: {
					id: String(payload.userId || ""),
					username: String(payload.username || payload.userId || "operator"),
					role: String(payload.role || "user"),
				},
				expiresAt: payload.exp
					? new Date(payload.exp * 1000).toISOString()
					: null,
			};
		} catch (error) {
			return authErrorResponse(error);
		}
	})
	.post(
		"/token",
		async ({ body, request }: { body: LoginBody; request: Request }) => {
			const { username, password } = body;

			let user: LoginUser;

			if (process.env.ELYSIA_TEST_MODE === "1" && username === "elysia-test") {
				logger.info("[TEST MODE] Bypassing auth for elysia-test");
				user = { id: "test-uid-001", username: "elysia-test", role: "admin" };
			} else {
				const authResult = await authenticateUser(username, password);

				if (!authResult.success || !authResult.user) {
					return jsonError(
						401,
						authResult.error || "Invalid credentials",
						"AUTH_INVALID_CREDENTIALS",
					);
				}
				user = normalizeLoginUser(authResult.user);
			}

			try {
				return await issueCookieSession(request, user);
			} catch (error) {
				logger.error("Token generation failed:", error as Error);
				return jsonError(500, "Failed to generate token", "AUTH_TOKEN_FAILED");
			}
		},
		{
			body: t.Object({
				username: t.String({ minLength: 1, maxLength: 128 }),
				password: t.String({ minLength: 1, maxLength: 128 }),
			}),
		},
	)
	.post(
		"/register",
		async ({ body }: { body: LoginBody }) => {
			if (isProd && !config.publicRegistrationEnabled) {
				return jsonError(
					403,
					"Public registration is disabled",
					"AUTH_REGISTER_DISABLED",
				);
			}

			const { username, password } = body;
			try {
				const newUser = await createUser(username, password);
				return new Response(
					JSON.stringify({
						message: "User registered successfully",
						userId: newUser.id,
					}),
					{
						status: 201,
						headers: {
							"content-type": "application/json; charset=utf-8",
						},
					},
				);
			} catch (error) {
				logger.error("User registration failed:", error as Error);
				return jsonError(
					400,
					"User already exists or registration failed",
					"AUTH_REGISTER_FAILED",
				);
			}
		},
		{
			body: t.Object({
				username: t.String({ minLength: 3, maxLength: 128 }),
				password: t.String({ minLength: 8, maxLength: 128 }),
			}),
		},
	)
	.post("/refresh", async ({ body, request }) => {
		const resolved = resolveRefreshTokenFromRequest(
			request,
			getRefreshTokenFromBody(body),
		);
		if (!resolved) {
			return jsonError(401, "Missing refresh token", "AUTH_REFRESH_REQUIRED");
		}

		try {
			assertCsrfForCookieAuth(request, resolved.source);
			const tokens = await rotateRefreshToken(
				resolved.token,
				getRefreshTokenStore(),
			);

			return jsonWithAuthCookies(request, tokens, {
				authenticated: true,
				tokenType: "Bearer",
				transport: "httpOnly-cookie",
				expiresIn: tokens.expiresIn,
			});
		} catch (error) {
			logger.error("Token refresh failed:", error as Error);
			return authErrorResponse(error, "Token refresh failed");
		}
	})
	.post("/logout", async ({ body, request }) => {
		const resolved = resolveRefreshTokenFromRequest(
			request,
			getRefreshTokenFromBody(body),
		);

		try {
			if (resolved) {
				assertCsrfForCookieAuth(request, resolved.source);
				await revokeRefreshToken(resolved.token, getRefreshTokenStore());
			}

			return jsonWithClearedAuthCookies(request, {
				message: "Logged out successfully",
			});
		} catch (error) {
			logger.error("Logout failed:", error as Error);
			return authErrorResponse(error, "Logout failed");
		}
	});
