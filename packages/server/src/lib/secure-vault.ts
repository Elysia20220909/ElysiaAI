import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
} from "node:crypto";
import { CONFIG } from "./constants";

const ALGORITHM = "aes-256-gcm";
const KEY = scryptSync(CONFIG.JWT_SECRET, "elysia-salt", 32);

export const secureVault = {
	/**
	 * Encrypt sensitive data using AES-256-GCM
	 */
	encrypt(text: string): string {
		const iv = randomBytes(16);
		const cipher = createCipheriv(ALGORITHM, KEY, iv);
		let encrypted = cipher.update(text, "utf8", "hex");
		encrypted += cipher.final("hex");
		const authTag = cipher.getAuthTag().toString("hex");
		return `${iv.toString("hex")}:${authTag}:${encrypted}`;
	},

	/**
	 * Decrypt data back to plain text
	 */
	decrypt(encryptedText: string): string {
		try {
			const parts = encryptedText.split(":");
			if (parts.length !== 3) return encryptedText; // Fallback for old data or non-encrypted

			const [ivHex, authTagHex, encrypted] = parts;
			if (!ivHex || !authTagHex) return encryptedText;
			const iv = Buffer.from(ivHex, "hex");
			const authTag = Buffer.from(authTagHex, "hex");
			const decipher = createDecipheriv(ALGORITHM, KEY, iv);
			decipher.setAuthTag(authTag);
			let decrypted = encrypted
				? decipher.update(encrypted, "hex", "utf8")
				: "";
			decrypted += decipher.final("utf8");
			return decrypted;
		} catch (_e) {
			// If it's old CBC data (iv:encrypted), try to return it as is or handle it
			if (encryptedText.split(":").length === 2) {
				return "[ ENCRYPTION DEPRECATED: CBC NO LONGER SUPPORTED ]";
			}
			return "[ ENCRYPTION ERROR: DATA CORRUPTED OR KEY MISMATCH ]";
		}
	},

	/**
	 * Private Relay: Strip metadata from requests
	 */
	sanitizeRequest(headers: Record<string, string>): Record<string, string> {
		const sensitiveHeaders = [
			"user-agent",
			"x-forwarded-for",
			"x-real-ip",
			"cookie",
			"referer",
		];
		const sanitized = { ...headers };
		for (const h of sensitiveHeaders) {
			delete sanitized[h];
		}
		sanitized["x-elysia-private-relay"] = "active";
		return sanitized;
	},
};
