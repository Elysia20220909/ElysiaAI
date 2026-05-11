process.env.DATABASE_URL = "file:./dev.db";
import { describe, expect, it, mock } from "bun:test";
import { actionLogService, prisma, voiceService } from "./database";

describe("Database Encryption Integration", () => {
	it("should encrypt and decrypt VoiceLog text", async () => {
		const mockCreate = mock(async ({ data }: any) => {
			return { ...data, id: "1" };
		});
		const mockFindMany = mock(async () => {
			return [{ id: "1", username: "elysia_user", text: mockCreate.mock.calls[0][0].data.text, emotion: "calm" }];
		});

		if (prisma) {
			prisma.voiceLog.create = mockCreate as any;
			prisma.voiceLog.findMany = mockFindMany as any;
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
		const mockCreate = mock(async ({ data }: any) => {
			return { ...data, id: "1" };
		});
		const mockFindMany = mock(async () => {
			return [{ id: "1", action: mockCreate.mock.calls[0][0].data.action, status: "blocked", hash: "0xdeadbeef" }];
		});

		if (prisma) {
			prisma.actionLog.create = mockCreate as any;
			prisma.actionLog.findMany = mockFindMany as any;
		}

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
