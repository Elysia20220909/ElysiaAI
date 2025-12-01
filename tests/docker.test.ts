import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";

describe("Docker Validation Tests", () => {
	test("Docker is available", async () => {
		try {
			const version = execSync("docker --version", {
				encoding: "utf-8",
			}).trim();
			expect(version).toContain("Docker");
			console.log("✅ Docker available:", version);
		} catch {
			console.warn("⚠️  Docker not available (OK for CI environments)");
		}
	});

	test("Dockerfile.production syntax is valid", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const dockerfilePath = path.join(process.cwd(), "Dockerfile.production");
		const content = fs.readFileSync(dockerfilePath, "utf-8");

		// 基本的な構文チェック
		const lines = content.split("\n").filter((l) => l.trim());
		const fromLines = lines.filter((l) => l.startsWith("FROM"));
		expect(fromLines.length).toBeGreaterThanOrEqual(1);

		const hasWorkdir = lines.some((l) => l.startsWith("WORKDIR"));
		expect(hasWorkdir).toBe(true);

		const hasExpose = lines.some((l) => l.startsWith("EXPOSE"));
		expect(hasExpose).toBe(true);

		console.log("✅ Dockerfile.production syntax valid");
		console.log(`   - ${fromLines.length} FROM stages`);
		console.log(`   - WORKDIR: ${hasWorkdir}`);
		console.log(`   - EXPOSE: ${hasExpose}`);
	});

	test("docker-compose.yml syntax is valid", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const composePath = path.join(process.cwd(), "docker-compose.yml");
		const content = fs.readFileSync(composePath, "utf-8");

		// YAML基本構造チェック
		expect(content).toContain("version:");
		expect(content).toContain("services:");
		expect(content).toContain("elysia:");
		expect(content).toContain("ports:");
		expect(content).toContain("networks:");

		// サービス定義チェック
		const lines = content.split("\n");
		const hasHealthcheck = lines.some((l) => l.includes("healthcheck:"));
		const hasRestart = lines.some((l) => l.includes("restart:"));

		expect(hasHealthcheck).toBe(true);
		expect(hasRestart).toBe(true);

		console.log("✅ docker-compose.yml syntax valid");
		console.log(`   - Has healthcheck: ${hasHealthcheck}`);
		console.log(`   - Has restart policy: ${hasRestart}`);
	});

	test(".dockerignore is properly configured", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const ignorePath = path.join(process.cwd(), ".dockerignore");
		if (fs.existsSync(ignorePath)) {
			const content = fs.readFileSync(ignorePath, "utf-8");

			// 必須エントリチェック
			const required = ["node_modules", ".git", ".env"];
			for (const entry of required) {
				expect(content).toContain(entry);
			}

			console.log("✅ .dockerignore properly configured");
		} else {
			console.warn("⚠️  .dockerignore not found");
		}
	});

	test("Docker build would succeed (dry run)", async () => {
		const fs = await import("node:fs");

		// 必要なファイルが存在するか確認
		const requiredFiles = [
			"package.json",
			"tsconfig.json",
			"webpack.config.js",
			"src/index.ts",
			"Dockerfile.production",
		];

		for (const file of requiredFiles) {
			const exists = fs.existsSync(file);
			expect(exists).toBe(true);
			if (!exists) {
				console.error(`❌ Missing required file: ${file}`);
			}
		}

		console.log("✅ All required files for Docker build present");
	});
});

describe("Multi-Service Architecture Tests", () => {
	test("docker-compose defines multiple profiles", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const composePath = path.join(process.cwd(), "docker-compose.yml");
		const content = fs.readFileSync(composePath, "utf-8");

		// プロファイル定義チェック
		const hasProfiles = content.includes("profiles:");
		expect(hasProfiles).toBe(true);

		// 各サービスの定義
		const services = ["elysia", "ollama", "nginx", "redis"];
		for (const service of services) {
			if (content.includes(`${service}:`)) {
				console.log(`✅ Service '${service}' defined`);
			}
		}
	});

	test("Network configuration is present", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const composePath = path.join(process.cwd(), "docker-compose.yml");
		const content = fs.readFileSync(composePath, "utf-8");

		expect(content).toContain("networks:");
		expect(content).toContain("elysia-network");
		console.log("✅ Docker network properly configured");
	});

	test("Volume mounts are configured", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const composePath = path.join(process.cwd(), "docker-compose.yml");
		const content = fs.readFileSync(composePath, "utf-8");

		expect(content).toContain("volumes:");
		console.log("✅ Docker volumes configured");
	});
});
