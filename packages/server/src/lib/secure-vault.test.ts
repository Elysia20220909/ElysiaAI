import { describe, expect, it } from "bun:test";
import { secureVault } from "./secure-vault";

describe("SecureVault", () => {
	it("should encrypt and decrypt correctly", () => {
		const originalText = "Hello, Elysia!";
		const encrypted = secureVault.encrypt(originalText);

		expect(encrypted).toContain(":");
		expect(encrypted.split(":").length).toBe(3); // iv:tag:content

		const decrypted = secureVault.decrypt(encrypted);
		expect(decrypted).toBe(originalText);
	});

	it("should return error message for corrupted data", () => {
		const corrupted = "invalid:data:format";
		const decrypted = secureVault.decrypt(corrupted);
		expect(decrypted).toContain("ENCRYPTION ERROR");
	});

	it("should handle empty strings", () => {
		const encrypted = secureVault.encrypt("");
		const decrypted = secureVault.decrypt(encrypted);
		expect(decrypted).toBe("");
	});

	it("should detect key mismatch or tampering (GCM benefit)", () => {
		const encrypted = secureVault.encrypt("Sensitive Data");
		const [iv, tag, ciphertext] = encrypted.split(":");

		const tamperedTag = `${tag.slice(0, -1)}${tag.endsWith("0") ? "1" : "0"}`;
		const tampered = `${iv}:${tamperedTag}:${ciphertext}`;

		const decrypted = secureVault.decrypt(tampered);
		expect(decrypted).toContain("ENCRYPTION ERROR");
	});
});
