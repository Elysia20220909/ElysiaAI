import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ErrorMonitor } from "./error-monitor";

describe("ErrorMonitor", () => {
	let monitor: ErrorMonitor;

	beforeEach(() => {
		monitor = new ErrorMonitor();
		// Enable alerts for testing
		process.env.ERROR_ALERTS_ENABLED = "true";
		process.env.DISCORD_WEBHOOK_URL = "http://fake-webhook.com";
	});

	it("should retry fetch on failure", async () => {
		let callCount = 0;
		const originalFetch = globalThis.fetch;

		globalThis.fetch = mock(async () => {
			callCount++;
			if (callCount < 3) {
				return new Response("Error", { status: 500 });
			}
			return new Response("OK", { status: 200 });
		}) as any;

		// We need to access the private sendDiscordWebhook or trigger an error that calls it
		// For testing purposes, we can trigger a high-severity error
		// But since the method is private, we might need to expose it for testing or test through public API

		// Let's try to trigger it via reportError
		await (monitor as any).sendDiscordWebhook({
			message: "Test Error",
			level: "critical",
			timestamp: new Date(),
		});

		expect(callCount).toBe(3);

		globalThis.fetch = originalFetch;
	});
});
