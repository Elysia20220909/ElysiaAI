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

// ==================== 入力サニタイゼーション ====================

/**
 * XSS攻撃を防ぐためのHTMLエスケープ
 */
export function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	};
	return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * SQLインジェクション対策
 */
export function sanitizeSqlInput(input: string): string {
	return input
		.replace(/['";\\]/g, "")
		.replace(/--/g, "")
		.replace(/\/\*/g, "")
		.trim();
}

/**
 * パストラバーサル攻撃を防ぐ
 */
export function sanitizeFilePath(path: string): string {
	return path
		.replace(/\.\./g, "")
		.replace(/[^a-zA-Z0-9._\-/]/g, "")
		.replace(/\/+/g, "/");
}

// ==================== レート制限 ====================

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
	identifier: string,
	options: { maxRequests: number; windowMs: number } = {
		maxRequests: 100,
		windowMs: 60000,
	},
): { allowed: boolean; resetTime?: number } {
	const now = Date.now();
	const entry = rateLimitStore.get(identifier);

	if (!entry || now > entry.resetTime) {
		rateLimitStore.set(identifier, {
			count: 1,
			resetTime: now + options.windowMs,
		});
		return { allowed: true };
	}

	entry.count++;

	if (entry.count > options.maxRequests) {
		return { allowed: false, resetTime: entry.resetTime };
	}

	return { allowed: true };
}

// ==================== セキュリティヘッダー ====================

export function getSecurityHeaders(): Record<string, string> {
	return {
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "DENY",
		"X-XSS-Protection": "1; mode=block",
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
		"Referrer-Policy": "strict-origin-when-cross-origin",
	};
}
