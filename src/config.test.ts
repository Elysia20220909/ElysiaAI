import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { getEnv } from "./config";

describe("Configuration Utility", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("should return the environment variable value if it exists", () => {
		process.env.TEST_KEY = "test_value";
		expect(getEnv("TEST_KEY")).toBe("test_value");
	});

	it("should return the default value if the environment variable is missing", () => {
		process.env.TEST_KEY = undefined;
		expect(getEnv("TEST_KEY", "default")).toBe("default");
	});

	it("should throw an error in production if required variables are missing", () => {
		process.env.NODE_ENV = "production";
		process.env.DB_URL = undefined;
		expect(() => getEnv("DB_URL")).toThrow(
			/CRITICAL: Missing required production environment variable/,
		);
	});

	it("should not fall back to defaults for required production variables", () => {
		process.env.NODE_ENV = "production";
		process.env.DATABASE_URL = undefined;
		expect(() => getEnv("DATABASE_URL", "file:./prisma/dev.db")).toThrow(
			/CRITICAL: Missing required production environment variable/,
		);
	});

	it("should reject known insecure production values", () => {
		process.env.NODE_ENV = "production";
		process.env.JWT_SECRET = ["elysia", "sovereign", "secret"].join("-");
		expect(() => getEnv("JWT_SECRET")).toThrow(
			/CRITICAL: Insecure production environment variable value/,
		);
	});

	it("should return an empty string if missing and no default is provided in non-production", () => {
		process.env.NODE_ENV = "development";
		process.env.NON_EXISTENT = undefined;
		expect(getEnv("NON_EXISTENT")).toBe("");
	});
});
