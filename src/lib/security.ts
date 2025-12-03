/**
 * Security Service - Password Hashing & User Management
 * bcryptを使用した安全なパスワード管理
 */

import bcrypt from "bcryptjs";
import { userService } from "./database";

const SALT_ROUNDS = 12;

/**
 * パスワードをハッシュ化
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * パスワードを検証
 */
export async function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/**
 * ユーザーを作成（パスワードハッシュ化込み）
 */
export async function createUser(
	username: string,
	password: string,
	role = "user",
) {
	const passwordHash = await hashPassword(password);
	return userService.create({
		username,
		passwordHash,
		role,
	});
}

/**
 * ユーザー認証
 */
export async function authenticateUser(
	username: string,
	password: string,
): Promise<{ success: boolean; user?: unknown; error?: string }> {
	const user = await userService.findByUsername(username);

	if (!user) {
		return { success: false, error: "User not found" };
	}

	const isValid = await verifyPassword(password, user.passwordHash);

	if (!isValid) {
		return { success: false, error: "Invalid password" };
	}

	return { success: true, user };
}

/**
 * パスワード変更
 */
export async function changePassword(
	userId: string,
	oldPassword: string,
	newPassword: string,
): Promise<{ success: boolean; error?: string }> {
	const user = await userService.findById(userId);

	if (!user) {
		return { success: false, error: "User not found" };
	}

	const isValid = await verifyPassword(oldPassword, user.passwordHash);

	if (!isValid) {
		return { success: false, error: "Invalid old password" };
	}

	const newHash = await hashPassword(newPassword);
	await userService.update(userId, { passwordHash: newHash });

	return { success: true };
}
