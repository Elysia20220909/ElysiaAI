// @ts-nocheck
import { test as bunTest } from "bun:test";

// Playwright E2E specs are disabled during normal CI runs to avoid duplicate runner issues.
// Set RUN_E2E=true and replace this placeholder with real tests when explicitly running Playwright.
bunTest.skip(
	"Playwright E2E tests are skipped by default (enable via RUN_E2E=true and add suites)",
	() => {},
);
