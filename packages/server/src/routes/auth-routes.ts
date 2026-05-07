import { Elysia, t } from "elysia";
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

export const authRoutes = new Elysia({ prefix: "/auth" })
	.post("/dev-login", async () => {
		if (!isDevAutoLoginEnabled()) {
			return jsonError(404, "Dev auto-login is not enabled");
		}

		try {
			const username = CONFIG.AUTH_USERNAME || "admin";
			const neuralSignature = createNeuralSignature(username);
			const tokens = await issueTokenPair(
				{ id: `dev-${username}`, username, role: "admin" },
				getRefreshTokenStore(),
			);
			recordNeuralAuthEvent({
				type: "dev.login",
				identity: username,
				neuralSignature,
				threatLevel: "quiet",
				detail: "Development neural link issued",
			});

			return new Response(
				JSON.stringify({
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
					expiresIn: tokens.expiresIn,
					username,
					neuralSignature,
				}),
				{
					headers: { "content-type": "application/json" },
				},
			);
		} catch (error) {
			logger.error("Dev auto-login failed:", error as Error);
			return jsonError(500, "Failed to generate dev token");
		}
	})
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
				const neuralSignature = createNeuralSignature(user.username);
				recordNeuralAuthEvent({
					type: "token.verify",
					identity: user.username,
					neuralSignature,
					threatLevel: "quiet",
					detail: "Credential exchange completed",
					payload: { role: user.role },
				});

				return new Response(
					JSON.stringify({
						accessToken: tokens.accessToken,
						refreshToken: tokens.refreshToken,
						expiresIn: tokens.expiresIn,
						neuralSignature,
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
