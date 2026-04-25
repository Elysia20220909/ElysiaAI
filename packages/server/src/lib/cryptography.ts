import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
} from "node:crypto";
import { logger } from "./logger";

/**
 * Sovereign Cryptography Suite (NSA/CIA Grade)
 * Implements AES-256-GCM for authenticated encryption.
 * Phase 143: Cryptographic Sublimation
 */
class SovereignCrypto {
	private readonly algorithm = "aes-256-gcm";
	private readonly key: Buffer;

	constructor() {
		const secret =
			process.env.ENCRYPTION_SECRET || "elysia-default-shadow-key-777";
		const salt = process.env.ENCRYPTION_SALT || "abyssal-salt";
		// Generate a 32-byte key using scrypt
		this.key = scryptSync(secret, salt, 32);
		logger.info("🔐 Sovereign Cryptography Suite Initialized (AES-256-GCM)");
	}

	/**
	 * Encrypt data with AAD (Additional Authenticated Data)
	 */
	public encrypt(text: string, aad = "ELYSIOS"): string {
		const iv = randomBytes(16);
		const cipher = createCipheriv(this.algorithm, this.key, iv);

		cipher.setAAD(Buffer.from(aad));

		let encrypted = cipher.update(text, "utf8", "hex");
		encrypted += cipher.final("hex");

		const authTag = cipher.getAuthTag().toString("hex");

		// Format: iv:authTag:encrypted
		return `${iv.toString("hex")}:${authTag}:${encrypted}`;
	}

	/**
	 * Decrypt data and verify integrity
	 */
	public decrypt(encryptedData: string, aad = "ELYSIOS"): string {
		try {
			const [ivHex, authTagHex, encryptedHex] = encryptedData.split(":");

			const iv = Buffer.from(ivHex, "hex");
			const authTag = Buffer.from(authTagHex, "hex");
			const decipher = createDecipheriv(this.algorithm, this.key, iv);

			decipher.setAuthTag(authTag);
			decipher.setAAD(Buffer.from(aad));

			let decrypted = decipher.update(encryptedHex, "hex", "utf8");
			decrypted += decipher.final("utf8");

			return decrypted;
		} catch (error) {
			logger.error(
				"🛑 Cryptographic Integrity Violation! (Decryption Failed)",
				error as Error,
			);
			throw new Error(
				"INTEGRITY_FAILURE: Data may have been tampered with or key mismatch.",
			);
		}
	}
}

export const sovereignCrypto = new SovereignCrypto();
