import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { CONFIG } from "./constants";

export type AuthTokenUser = {
	id: string;
	username: string;
	role: string;
};

export type RefreshTokenRecord = {
	token: string;
	userId: string;
	revoked: boolean;
	expiresAt: Date | string;
	user?: AuthTokenUser | null;
};

export type RefreshTokenStore = {
	create(data: {
		token: string;
		userId: string;
		expiresAt: Date;
	}): Promise<unknown>;
	findByToken(token: string): Promise<RefreshTokenRecord | null>;
	revoke(token: string): Promise<unknown>;
};

export type TokenPair = {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
};

export class RefreshTokenValidationError extends Error {
	constructor(message = "Invalid or expired refresh token") {
		super(message);
		this.name = "RefreshTokenValidationError";
	}
}

export class InMemoryRefreshTokenStore implements RefreshTokenStore {
	private readonly tokens = new Map<string, RefreshTokenRecord>();
	private readonly users = new Map<string, AuthTokenUser>();

	async create(data: {
		token: string;
		userId: string;
		expiresAt: Date;
		user?: AuthTokenUser;
	}) {
		if (data.user) this.users.set(data.userId, data.user);
		this.tokens.set(data.token, {
			token: data.token,
			userId: data.userId,
			revoked: false,
			expiresAt: data.expiresAt,
			user: this.users.get(data.userId) ?? null,
		});
	}

	async findByToken(token: string) {
		const record = this.tokens.get(token);
		if (!record) return null;
		return {
			...record,
			user: record.user ?? this.users.get(record.userId) ?? null,
		};
	}

	async revoke(token: string) {
		const record = this.tokens.get(token);
		if (record) {
			this.tokens.set(token, { ...record, revoked: true });
		}
	}

	clear() {
		this.tokens.clear();
		this.users.clear();
	}
}

export const refreshTokenExpiresInMs = 7 * 24 * 60 * 60 * 1000;
export const accessTokenExpiresInSeconds = 15 * 60;

export function getRefreshTokenExpiresAt(now = new Date()) {
	return new Date(now.getTime() + refreshTokenExpiresInMs);
}

export function signAccessToken(user: AuthTokenUser) {
	return jwt.sign(
		{ userId: user.id, username: user.username, role: user.role },
		CONFIG.JWT_SECRET,
		{ expiresIn: "15m" },
	);
}

export function signRefreshToken(user: AuthTokenUser) {
	return jwt.sign(
		{
			jti: randomUUID(),
			userId: user.id,
			username: user.username,
			role: user.role,
		},
		CONFIG.JWT_REFRESH_SECRET,
		{ expiresIn: "7d" },
	);
}

async function persistRefreshToken(
	store: RefreshTokenStore,
	user: AuthTokenUser,
	refreshToken: string,
	now = new Date(),
) {
	await store.create({
		token: refreshToken,
		userId: user.id,
		expiresAt: getRefreshTokenExpiresAt(now),
	});
}

export async function issueTokenPair(
	user: AuthTokenUser,
	store: RefreshTokenStore,
	now = new Date(),
): Promise<TokenPair> {
	const accessToken = signAccessToken(user);
	const refreshToken = signRefreshToken(user);

	await persistRefreshToken(store, user, refreshToken, now);

	return {
		accessToken,
		refreshToken,
		expiresIn: accessTokenExpiresInSeconds,
	};
}

export async function rotateRefreshToken(
	refreshToken: string,
	store: RefreshTokenStore,
	now = new Date(),
): Promise<TokenPair> {
	const payload = jwt.verify(
		refreshToken,
		CONFIG.JWT_REFRESH_SECRET,
	) as jwt.JwtPayload;

	if (!payload?.userId || !payload.username || !payload.role) {
		throw new RefreshTokenValidationError();
	}

	const record = await store.findByToken(refreshToken);
	if (!record || record.revoked || new Date(record.expiresAt) <= now) {
		throw new RefreshTokenValidationError();
	}

	await store.revoke(refreshToken);

	const user = record.user ?? {
		id: String(payload.userId),
		username: String(payload.username),
		role: String(payload.role),
	};

	return issueTokenPair(user, store, now);
}

export async function revokeRefreshToken(
	refreshToken: string,
	store: RefreshTokenStore,
) {
	jwt.verify(refreshToken, CONFIG.JWT_REFRESH_SECRET);

	const record = await store.findByToken(refreshToken);
	if (!record || record.revoked) return false;

	await store.revoke(refreshToken);
	return true;
}
