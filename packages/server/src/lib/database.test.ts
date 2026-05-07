import { describe, expect, it } from "bun:test";
import { actionLogService, prisma, voiceService } from "./database";

describe("Database Encryption Integration", () => {
	// Note: These tests assume a test database or mock is used.
	// In this environment, prisma might be null as per database.ts fallback.

	it("should encrypt and decrypt VoiceLog text", async () => {
		if (!prisma) {
			console.log("Skipping DB test: Prisma not initialized");
			return;
		}

		const logData = {
			username: "elysia_user",
			text: "This is a secret voice message",
			emotion: "calm",
		};

		const created = await voiceService.create(logData);
		expect(created.text).not.toBe(logData.text); // Should be encrypted in DB

		const recent = await voiceService.getRecent(1);
		expect(recent[0].text).toBe(logData.text); // Should be decrypted automatically
	});

	it("should encrypt and decrypt ActionLog action", async () => {
		if (!prisma) return;

		const actionData = {
			action: "System Override Attempt",
			status: "blocked",
			hash: "0xdeadbeef",
		};

		const created = await actionLogService.create(actionData);
		expect(created.action).not.toBe(actionData.action);

		const logs = await actionLogService.getAll(1);
		expect(logs[0].action).toBe(actionData.action);
	});
});
