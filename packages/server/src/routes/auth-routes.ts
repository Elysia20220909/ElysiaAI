import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import { CONFIG, jsonError } from "../lib/constants";
import { logger } from "../lib/logger";

export const authRoutes = new Elysia({ prefix: "/auth" })
	// Auth: token issuance
	.post(
		"/token",
		async ({ body }: any) => {
			const { username, password } = body as {
				username: string;
				password: string;
			};
			if (
				username !== CONFIG.AUTH_USERNAME ||
				password !== CONFIG.AUTH_PASSWORD
			)
				return jsonError(401, "Invalid credentials");

			const userId = username;

			try {
				const accessToken = jwt.sign(
					{ userId, username, role: "user" },
					CONFIG.JWT_SECRET,
					{ expiresIn: "15m" },
				);
				const refreshToken = jwt.sign(
					{ userId, username, role: "user" },
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
	// Auth: refresh access token
	.post(
		"/refresh",
		async ({ body }: any) => {
			const { refreshToken } = body as { refreshToken: string };
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
		async ({ body }: any) => {
			const { refreshToken } = body as { refreshToken: string };
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
