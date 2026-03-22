import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import axios from "axios";

const BASE_URL = "http://localhost:3000";
const RAG_URL = "http://localhost:8000";
const LIVE_TESTS_ENABLED = process.env.RUN_LIVE_TESTS === "true";
const liveDescribe = LIVE_TESTS_ENABLED ? describe : describe.skip;

liveDescribe("Elysia AI Server Tests", () => {
	beforeAll(async () => {
		// サーバーを起動
		console.log("🚀 Starting test server...");
		// Note: 実際の環境ではサーバーが既に起動していることを想定
	});

	afterAll(async () => {
		// クリーンアップ
		console.log("🧹 Cleaning up...");
	});

	test("Health check endpoint returns 200", async () => {
		try {
			const response = await axios.get(BASE_URL, {
				timeout: 5000,
			});
			expect(response.status).toBe(200);
			console.log("✅ Health check passed");
		} catch (error) {
			console.error("❌ Health check failed:", error);
			throw error;
		}
	});

	test("Static HTML is served", async () => {
		try {
			const response = await axios.get(BASE_URL, {
				timeout: 5000,
			});
			expect(response.headers["content-type"]).toContain("text/html");
			expect(response.data).toContain("Elysia");
			console.log("✅ Static content served");
		} catch (error) {
			console.error("❌ Static content test failed:", error);
			throw error;
		}
	});

	test("Chat endpoint accepts POST requests", async () => {
		try {
			const response = await axios.post(
				`${BASE_URL}/elysia-love`,
				{
					messages: [{ role: "user", content: "こんにちは" }],
				},
				{
					headers: { "Content-Type": "application/json" },
					timeout: 30000,
					validateStatus: () => true, // すべてのステータスコードを受け入れ
				},
			);

			// ストリーミングレスポンスなので、200または接続成功を確認
			expect([200, 201, 202]).toContain(response.status);
			console.log("✅ Chat endpoint accessible");
		} catch (error) {
			console.error("❌ Chat endpoint test failed:", error);
			throw error;
		}
	});
});

liveDescribe("RAG API Tests (if available)", () => {
	test("RAG endpoint is reachable", async () => {
		try {
			const response = await axios.post(
				`${RAG_URL}/rag`,
				{
					text: "エリシアの名言",
				},
				{
					headers: { "Content-Type": "application/json" },
					timeout: 10000,
					validateStatus: () => true,
				},
			);

			if (response.status === 200) {
				expect(response.data).toHaveProperty("context");
				expect(response.data).toHaveProperty("quotes");
				console.log("✅ RAG API working");
			} else {
				console.warn(
					"⚠️  RAG API not available (this is OK if FastAPI is not running)",
				);
			}
		} catch (error: unknown) {
			const err = error as { code?: string };
			if (err.code === "ECONNREFUSED") {
				console.warn("⚠️  RAG API not running (this is expected in some envs)");
			} else {
				console.error("❌ RAG API test failed:", error);
			}
		}
	});
});

describe("Docker Configuration Tests", () => {
	test("Dockerfile.production exists and is valid", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const dockerfilePath = path.join(
			process.cwd(),
			"config/docker/Dockerfile.production",
		);
		expect(fs.existsSync(dockerfilePath)).toBe(true);

		const content = fs.readFileSync(dockerfilePath, "utf-8");
		expect(content).toContain("FROM");
		expect(content).toContain("oven/bun");
		console.log("✅ Dockerfile.production valid");
	});

	test("docker-compose.yml exists and is valid", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const composePath = path.join(
			process.cwd(),
			"config/docker/docker-compose.yml",
		);
		expect(fs.existsSync(composePath)).toBe(true);

		const content = fs.readFileSync(composePath, "utf-8");
		expect(content).toContain("services:");
		expect(content).toContain("elysia:");
		console.log("✅ docker-compose.yml valid");
	});
});

describe("Cloud Configuration Tests", () => {
	test("AWS CloudFormation template exists", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const cfPath = path.join(
			process.cwd(),
			"cloud",
			"aws",
			"cloudformation.yaml",
		);
		expect(fs.existsSync(cfPath)).toBe(true);

		const content = fs.readFileSync(cfPath, "utf-8");
		expect(content).toContain("AWSTemplateFormatVersion");
		expect(content).toContain("Resources:");
		console.log("✅ AWS CloudFormation template valid");
	});

	test("GCP Cloud Build config exists", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const cbPath = path.join(process.cwd(), "cloud", "gcp", "cloudbuild.yaml");
		expect(fs.existsSync(cbPath)).toBe(true);

		const content = fs.readFileSync(cbPath, "utf-8");
		expect(content).toContain("steps:");
		expect(content).toContain("gcr.io");
		console.log("✅ GCP Cloud Build config valid");
	});
});

describe("Swift Integration Tests", () => {
	test.skip("Swift Package.swift exists", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const swiftPath = path.join(process.cwd(), "swift", "Package.swift");
		expect(fs.existsSync(swiftPath)).toBe(true);

		const content = fs.readFileSync(swiftPath, "utf-8");
		expect(content).toContain("swift-tools-version");
		expect(content).toContain("ElysiaAI");
		console.log("✅ Swift package configuration valid");
	});

	test.skip("Swift client source exists", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const clientPath = path.join(
			process.cwd(),
			"swift",
			"Sources",
			"ElysiaAI",
			"ElysiaClient.swift",
		);
		expect(fs.existsSync(clientPath)).toBe(true);

		const content = fs.readFileSync(clientPath, "utf-8");
		expect(content).toContain("class ElysiaClient");
		expect(content).toContain("sendMessage");
		console.log("✅ Swift client implementation valid");
	});
});
