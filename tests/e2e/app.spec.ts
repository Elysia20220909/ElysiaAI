// E2E Tests with Playwright
import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
	test("should load the homepage", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(/Elysia AI/i);
	});

	test("should display chat interface", async ({ page }) => {
		await page.goto("/");
		const chatInput = page.locator('textarea[placeholder*="メッセージ"]');
		await expect(chatInput).toBeVisible();
	});
});

test.describe("Chat Functionality", () => {
	test("should send a message", async ({ page }) => {
		await page.goto("/");

		// Wait for page to load
		await page.waitForLoadState("networkidle");

		// Type a message
		const chatInput = page.locator("textarea");
		await chatInput.fill("こんにちは");

		// Click send button
		const sendButton = page.locator('button[type="submit"]');
		await sendButton.click();

		// Check if message appears in chat
		await expect(page.locator(".message")).toContainText("こんにちは");
	});

	test("should receive AI response", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const chatInput = page.locator("textarea");
		await chatInput.fill("テスト");

		const sendButton = page.locator('button[type="submit"]');
		await sendButton.click();

		// Wait for AI response
		await page.waitForSelector(".ai-message", { timeout: 10000 });
		const aiMessage = page.locator(".ai-message").last();
		await expect(aiMessage).toBeVisible();
	});
});

test.describe("Mode Switching", () => {
	test("should switch between modes", async ({ page }) => {
		await page.goto("/");

		// Test mode selector
		const modeSelector = page.locator('select[name="mode"]');
		await expect(modeSelector).toBeVisible();

		// Switch to professional mode
		await modeSelector.selectOption("professional");
		await expect(modeSelector).toHaveValue("professional");

		// Switch to sweet mode
		await modeSelector.selectOption("sweet");
		await expect(modeSelector).toHaveValue("sweet");
	});
});

test.describe("Feedback", () => {
	test("should submit positive feedback", async ({ page }) => {
		await page.goto("/");

		// Send a message first
		const chatInput = page.locator("textarea");
		await chatInput.fill("テストメッセージ");

		const sendButton = page.locator('button[type="submit"]');
		await sendButton.click();

		// Wait for response
		await page.waitForSelector(".ai-message", { timeout: 10000 });

		// Click thumbs up
		const thumbsUp = page.locator(".feedback-up").last();
		await thumbsUp.click();

		// Check for confirmation
		await expect(page.locator(".feedback-success")).toBeVisible();
	});
});

test.describe("Responsive Design", () => {
	test("should work on mobile", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/");

		const chatInput = page.locator("textarea");
		await expect(chatInput).toBeVisible();
	});

	test("should work on tablet", async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto("/");

		const chatInput = page.locator("textarea");
		await expect(chatInput).toBeVisible();
	});
});

test.describe("Accessibility", () => {
	test("should have no accessibility violations", async ({ page }) => {
		await page.goto("/");

		// Check for basic accessibility
		const chatInput = page.locator("textarea");
		await expect(chatInput).toHaveAttribute("aria-label");

		const sendButton = page.locator('button[type="submit"]');
		await expect(sendButton).toHaveAttribute("aria-label");
	});

	test("should support keyboard navigation", async ({ page }) => {
		await page.goto("/");

		// Tab to chat input
		await page.keyboard.press("Tab");
		const chatInput = page.locator("textarea");
		await expect(chatInput).toBeFocused();

		// Type message
		await page.keyboard.type("キーボードテスト");

		// Tab to send button
		await page.keyboard.press("Tab");
		const sendButton = page.locator('button[type="submit"]');
		await expect(sendButton).toBeFocused();
	});
});

test.describe("Error Handling", () => {
	test("should display error on network failure", async ({ page, context }) => {
		await page.goto("/");

		// Simulate offline
		await context.setOffline(true);

		const chatInput = page.locator("textarea");
		await chatInput.fill("オフラインテスト");

		const sendButton = page.locator('button[type="submit"]');
		await sendButton.click();

		// Check for error message
		await expect(page.locator(".error-message")).toBeVisible();

		// Restore online
		await context.setOffline(false);
	});
});
