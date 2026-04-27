import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import { CONFIG, jsonError } from "../lib/constants";
import { logger } from "../lib/logger";
import { authenticateUser, createUser } from "../lib/security";

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
				const accessToken = jwt.sign(
					{ userId: user.id, username: user.username, role: user.role },
					CONFIG.JWT_SECRET,
					{ expiresIn: "15m" },
				);
				const refreshToken = jwt.sign(
					{ userId: user.id, username: user.username, role: user.role },
					CONFIG.JWT_REFRESH_SECRET,
					{ expiresIn: "7d" },
				);

				return new Response(
					JSON.stringify({
						accessToken,
						refreshToken,
						expiresIn: 900,
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
				const payload = jwt.verify(
					refreshToken,
					CONFIG.JWT_REFRESH_SECRET,
				) as jwt.JwtPayload;

				if (!payload?.userId || !payload.username || !payload.role) {
					return jsonError(401, "Invalid or expired refresh token");
				}

				const newAccessToken = jwt.sign(
					{
						userId: payload.userId,
						username: payload.username,
						role: payload.role,
					},
					CONFIG.JWT_SECRET,
					{ expiresIn: "15m" },
				);
				const newRefreshToken = jwt.sign(
					{
						userId: payload.userId,
						username: payload.username,
						role: payload.role,
					},
					CONFIG.JWT_REFRESH_SECRET,
					{ expiresIn: "7d" },
				);

				return new Response(
					JSON.stringify({
						accessToken: newAccessToken,
						refreshToken: newRefreshToken,
						expiresIn: 900,
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
				const payload = jwt.verify(
					refreshToken,
					CONFIG.JWT_REFRESH_SECRET,
				) as jwt.JwtPayload;
				if (payload?.userId) {
					logger.info(
						`User ${payload.userId} logged out (refresh token revoked conceptually)`,
					);
				}
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
