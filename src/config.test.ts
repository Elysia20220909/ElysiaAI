import { describe, expect, it, beforeEach, afterEach } from "bun:test";
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
    delete process.env.TEST_KEY;
    expect(getEnv("TEST_KEY", "default")).toBe("default");
  });

  it("should throw an error in production if required variables are missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.DB_URL;
    expect(() => getEnv("DB_URL")).toThrow(/CRITICAL: Missing required production environment variable/);
  });

  it("should return an empty string if missing and no default is provided in non-production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.NON_EXISTENT;
    expect(getEnv("NON_EXISTENT")).toBe("");
  });
});
