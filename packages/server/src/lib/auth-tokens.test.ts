import { describe, expect, test } from "bun:test";
import jwt from "jsonwebtoken";
import {
	InMemoryRefreshTokenStore,
	issueTokenPair,
	RefreshTokenValidationError,
	revokeRefreshToken,
	rotateRefreshToken,
} from "./auth-tokens";
import { CONFIG } from "./constants";

const user = {
	id: "user-1",
	username: "elysia",
	role: "admin",
};

describe("Auth token lifecycle", () => {
	test("persists refresh tokens when issuing a token pair", async () => {
		const store = new InMemoryRefreshTokenStore();
		const tokens = await issueTokenPair(user, store);

		const record = await store.findByToken(tokens.refreshToken);
		expect(tokens.accessToken).toBeTruthy();
		expect(tokens.expiresIn).toBe(900);
		expect(record?.userId).toBe(user.id);
		expect(record?.revoked).toBe(false);
	});

	test("rotates refresh tokens and revokes the previous token", async () => {
		const store = new InMemoryRefreshTokenStore();
		const first = await issueTokenPair(user, store);
		const second = await rotateRefreshToken(first.refreshToken, store);

		const oldRecord = await store.findByToken(first.refreshToken);
		const newRecord = await store.findByToken(second.refreshToken);

		expect(second.refreshToken).not.toBe(first.refreshToken);
		expect(oldRecord?.revoked).toBe(true);
		expect(newRecord?.revoked).toBe(false);
	});

	test("rejects refresh tokens that were already rotated", async () => {
		const store = new InMemoryRefreshTokenStore();
		const first = await issueTokenPair(user, store);
		await rotateRefreshToken(first.refreshToken, store);

		await expect(
			rotateRefreshToken(first.refreshToken, store),
		).rejects.toBeInstanceOf(RefreshTokenValidationError);
	});

	test("revokes refresh tokens on logout", async () => {
		const store = new InMemoryRefreshTokenStore();
		const tokens = await issueTokenPair(user, store);

		await expect(revokeRefreshToken(tokens.refreshToken, store)).resolves.toBe(
			true,
		);

		const record = await store.findByToken(tokens.refreshToken);
		expect(record?.revoked).toBe(true);
	});

	test("rejects refresh tokens that were never persisted", async () => {
		const store = new InMemoryRefreshTokenStore();
		const unpersistedToken = jwt.sign(
			{ userId: user.id, username: user.username, role: user.role },
			CONFIG.JWT_REFRESH_SECRET,
			{ expiresIn: "7d" },
		);

		await expect(
			rotateRefreshToken(unpersistedToken, store),
		).rejects.toBeInstanceOf(RefreshTokenValidationError);
	});
});
