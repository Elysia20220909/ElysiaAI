import { Elysia, t } from "elysia";
import {
	InMemoryRefreshTokenStore,
	issueTokenPair,
	type RefreshTokenStore,
	revokeRefreshToken,
	rotateRefreshToken,
} from "../lib/auth-tokens";
import { jsonError } from "../lib/constants";
import { tokenService } from "../lib/database";
import { logger } from "../lib/logger";
import { authenticateUser, createUser } from "../lib/security";

const testRefreshTokenStore = new InMemoryRefreshTokenStore();

function getRefreshTokenStore(): RefreshTokenStore {
	return process.env.ELYSIA_TEST_MODE === "1"
		? testRefreshTokenStore
		: tokenService;
}

export const authRoutes = new Elysia({ prefix: "/auth" })
	// Auth: token issuance
	.post(
		"/token",
		async ({ body }: { body: { username: string; password: string } }) => {
			const { username, password } = body;

			let user: any;

			if (process.env.ELYSIA_TEST_MODE === "1" && username === "elysia-test") {
				logger.info("[TEST MODE] Bypassing auth for elysia-test");
				user = { id: "test-uid-001", username: "elysia-test", role: "admin" };
			} else {
				const authResult = await authenticateUser(username, password);

				if (!authResult.success || !authResult.user) {
					return jsonError(401, authResult.error || "Invalid credentials");
				}
				user = authResult.user;
			}

			try {
				const tokens = await issueTokenPair(
					{ id: user.id, username: user.username, role: user.role },
					getRefreshTokenStore(),
				);

				return new Response(
					JSON.stringify({
						accessToken: tokens.accessToken,
						refreshToken: tokens.refreshToken,
						expiresIn: tokens.expiresIn,
					}),
					{
						headers: { "content-type": "application/json" },
					},
				);
			} catch (error) {
				logger.error("Token generation failed:", error as Error);
				return jsonError(500, "Failed to generate token");
			}
		},
		{
			body: t.Object({
				username: t.String({ minLength: 1, maxLength: 128 }),
				password: t.String({ minLength: 1, maxLength: 128 }),
			}),
		},
	)
	// Auth: register new user
	.post(
		"/register",
		async ({ body }: { body: { username: string; password: string } }) => {
			const { username, password } = body;
			try {
				const newUser = await createUser(username, password);
				return { message: "User registered successfully", userId: newUser.id };
			} catch (error) {
				logger.error("User registration failed:", error as Error);
				return jsonError(400, "User already exists or registration failed");
			}
		},
		{
			body: t.Object({
				username: t.String({ minLength: 3, maxLength: 128 }),
				password: t.String({ minLength: 8, maxLength: 128 }),
			}),
		},
	)
	// Auth: refresh access token
	.post(
		"/refresh",
		async ({ body }: { body: { refreshToken: string } }) => {
			const { refreshToken } = body;
			try {
				const tokens = await rotateRefreshToken(
					refreshToken,
					getRefreshTokenStore(),
				);

				return new Response(
					JSON.stringify({
						accessToken: tokens.accessToken,
						refreshToken: tokens.refreshToken,
						expiresIn: tokens.expiresIn,
					}),
					{
						headers: { "content-type": "application/json" },
					},
				);
			} catch (error) {
				logger.error("Token refresh failed:", error as Error);
				return jsonError(401, "Token refresh failed");
			}
		},
		{
			body: t.Object({ refreshToken: t.String({ minLength: 20 }) }),
		},
	)
	// Auth: logout revoke refresh
	.post(
		"/logout",
		async ({ body }: { body: { refreshToken: string } }) => {
			const { refreshToken } = body;
			try {
				await revokeRefreshToken(refreshToken, getRefreshTokenStore());
				return new Response(
					JSON.stringify({ message: "Logged out successfully" }),
					{
						headers: { "content-type": "application/json" },
					},
				);
			} catch (error) {
				logger.error("Logout failed:", error as Error);
				return jsonError(400, "Logout failed");
			}
		},
		{
			body: t.Object({ refreshToken: t.String({ minLength: 20 }) }),
		},
	);
