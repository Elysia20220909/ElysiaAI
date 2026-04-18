import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
} from "node:crypto";
import { CONFIG } from "./constants";

const ALGORITHM = "aes-256-cbc";
const KEY = scryptSync(CONFIG.JWT_SECRET, "elysia-salt", 32);

export const secureVault = {
	/**
	 * Encrypt sensitive data using AES-256-CBC
	 */
	encrypt(text: string): string {
		const iv = randomBytes(16);
		const cipher = createCipheriv(ALGORITHM, KEY, iv);
		let encrypted = cipher.update(text, "utf8", "hex");
		encrypted += cipher.final("hex");
		return `${iv.toString("hex")}:${encrypted}`;
	},

	/**
	 * Decrypt data back to plain text
	 */
	decrypt(encryptedText: string): string {
		try {
			const [ivHex, encrypted] = encryptedText.split(":");
			const iv = Buffer.from(ivHex, "hex");
			const decipher = createDecipheriv(ALGORITHM, KEY, iv);
			let decrypted = decipher.update(encrypted, "hex", "utf8");
			decrypted += decipher.final("utf8");
			return decrypted;
		} catch (e) {
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
