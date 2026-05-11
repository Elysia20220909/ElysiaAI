import { expect, test } from "@playwright/test";

test("Login should work with correct credentials", async ({ page }) => {
	// Navigate to the login page
	await page.goto("http://127.0.0.1:8000/standalone/login/index.html");

	// Check if the form is visible
	await expect(page.locator("#login-form")).toBeVisible();

	// Fill in credentials
	await page.fill("#username", "admin");
	await page.fill("#password", process.env.AUTH_PASSWORD ?? "");

	// Submit the form
	await page.click("#login-btn");

	// Wait for the redirect or success message
	// According to app.js, it redirects to /desktop.html after 1500ms
	await page.waitForURL("**/desktop.html", { timeout: 10000 });

	// Verify successful login
	expect(page.url()).toContain("desktop.html");
});

test("Login should fail with incorrect credentials", async ({ page }) => {
	await page.goto("http://127.0.0.1:8000/standalone/login/index.html");

	await page.fill("#username", "wronguser");
	await page.fill("#password", "wrongpass");

	await page.click("#login-btn");

	// Check for error message
	const errorMsg = page.locator("#error-msg");
	await expect(errorMsg).toBeVisible();
	await expect(errorMsg).toContainText("ERROR: INVALID CREDENTIALS");
});
