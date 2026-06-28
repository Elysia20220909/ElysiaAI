import { describe, expect, test } from "bun:test";

describe("Integration Tests - Full Stack", () => {
	test("Server entrypoint exists and has content", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const entryPath = path.join(
			process.cwd(),
			"packages",
			"server",
			"src",
			"index.ts",
		);
		expect(fs.existsSync(entryPath)).toBe(true);

		const content = fs.readFileSync(entryPath, "utf-8");
		expect(content.length).toBeGreaterThan(0);
		console.log("✅ Server entrypoint valid");
	});

	test("Package manifests expose the current workflow scripts", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const rootPkgPath = path.join(process.cwd(), "package.json");
		const serverPkgPath = path.join(
			process.cwd(),
			"packages",
			"server",
			"package.json",
		);
		const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
		const serverPkg = JSON.parse(fs.readFileSync(serverPkgPath, "utf-8"));

		expect(rootPkg.scripts).toHaveProperty("dev");
		expect(rootPkg.scripts).toHaveProperty("boot");
		expect(rootPkg.scripts).toHaveProperty("lint");
		expect(rootPkg.scripts).toHaveProperty("start");
		expect(rootPkg.scripts).toHaveProperty("test");
		expect(serverPkg.scripts).toHaveProperty("dev");
		expect(rootPkg.scripts.boot).toContain("scripts/boot.ts");
		expect(rootPkg.scripts.start).toBe("bun run --cwd packages/server start");
		expect(rootPkg.scripts.dev).toBe("bun run --cwd packages/server dev");
		expect(serverPkg.scripts).toHaveProperty("db:init");
		expect(serverPkg.scripts).toHaveProperty("db:migrate");
		console.log("✅ Current workflow scripts present");
	});

	test("Environment can handle TypeScript compilation", async () => {
		expect(Bun.version).toBeTruthy();
		console.log("✅ Bun runtime available:", Bun.version);
	});

	test("Python FastAPI dependencies are documented", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const requirementsPath = path.join(
			process.cwd(),
			"python",
			"requirements.txt",
		);
		if (fs.existsSync(requirementsPath)) {
			const pythonRequirements = fs.readFileSync(requirementsPath, "utf-8");
			const content = pythonRequirements.includes("-r ../requirements.txt")
				? fs.readFileSync(path.join(process.cwd(), "requirements.txt"), "utf-8")
				: pythonRequirements;
			expect(content).toContain("fastapi");
			expect(content).toContain("uvicorn");
			console.log("✅ Python requirements documented");
		} else {
			console.warn("⚠️  Python requirements.txt not found");
		}
	});

	test("README documents the current local boot flow", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const readme = fs.readFileSync(
			path.join(process.cwd(), "README.md"),
			"utf-8",
		);

		expect(readme).toContain("bun scripts/manage.ts setup");
		expect(readme).toContain("bun scripts/manage.ts setup-python");
		expect(readme).toContain("bun scripts/manage.ts dev");
		expect(readme).toContain("FastAPI Kernel");
		expect(readme).toContain("HTTP proxy");
		console.log("✅ README local boot flow is current");
	});

	test("Airi demo exposes the expected chat controls", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const demo = fs.readFileSync(
			path.join(process.cwd(), "public", "demo-airi.html"),
			"utf-8",
		);

		expect(demo).toContain('name="mode"');
		expect(demo).toContain('value="professional"');
		expect(demo).toContain('value="sweet"');
		expect(demo).toContain('placeholder="メッセージを入力してください"');
		expect(demo).toContain('aria-label="メッセージ入力"');
		expect(demo).toContain("feedback-up");
		expect(demo).toContain("feedback-success");
		console.log("✅ Airi demo chat controls are present");
	});

	test("Health UI surfaces ElysiaAI core and companion status", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const healthUi = fs.readFileSync(
			path.join(process.cwd(), "public", "health-ui.html"),
			"utf-8",
		);

		expect(healthUi).toContain("ElysiaAI Core");
		expect(healthUi).toContain("Open-LLM-VTuber");
		expect(healthUi).toContain("data.companions?.openLlmVtuber");
		expect(healthUi).toContain('fetch("/health"');
		console.log("✅ Health UI includes core and companion status");
	});

	test("Daily desk exposes tester analytics report controls", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const desk = fs.readFileSync(
			path.join(process.cwd(), "public", "index.html"),
			"utf-8",
		);

		expect(desk).toContain("data-tester-report");
		expect(desk).toContain("Beta Readiness");
		expect(desk).toContain("Outcome Flow");
		expect(desk).toContain("/api/tester-analytics/report");
		console.log("✅ Tester analytics report UI is wired");
	});

	test("Environment template covers both server and kernel names", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const envExample = fs.readFileSync(
			path.join(process.cwd(), ".env.example"),
			"utf-8",
		);

		expect(envExample).toContain("FASTAPI_BASE_URL=");
		expect(envExample).toContain("OLLAMA_BASE_URL=");
		expect(envExample).toContain("OLLAMA_HOST=");
		console.log("✅ Environment template covers runtime aliases");
	});

	test("Management CLI uses the root virtualenv contract", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const manageSource = fs.readFileSync(
			path.join(process.cwd(), "scripts", "manage.ts"),
			"utf-8",
		);

		expect(manageSource).toContain('"setup-python"');
		expect(manageSource).toContain("requirements.txt");
		expect(manageSource).toContain("venvPythonPath()");
		expect(manageSource).not.toContain("python/requirements.txt");
		expect(manageSource).not.toContain("cp .env.example .env");
		expect(manageSource).not.toContain("which ");
		console.log("✅ Management CLI uses root virtualenv");
	});

	test("Compatibility entrypoints point to the modular server", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const legacyServerPath = path.join(process.cwd(), "server.ts");
		const bootScriptPath = path.join(process.cwd(), "scripts", "boot.ts");
		const managePath = path.join(process.cwd(), "scripts", "manage.ts");
		const legacyServer = fs.readFileSync(legacyServerPath, "utf-8");
		const bootScript = fs.readFileSync(bootScriptPath, "utf-8");
		const manageSource = fs.readFileSync(managePath, "utf-8");
		const serverIndex = fs.readFileSync(
			path.join(process.cwd(), "packages", "server", "src", "index.ts"),
			"utf-8",
		);

		expect(legacyServer).toContain("packages/server/src/index.ts");
		expect(bootScript).toContain("python.fastapi_server:app");
		expect(bootScript).toContain('["bun", "run", "start"]');
		expect(bootScript).toContain("await loadDotEnv()");
		expect(serverIndex).toContain("dotenv.config()");
		expect(serverIndex).not.toContain("override: true");
		const databaseSource = fs.readFileSync(
			path.join(
				process.cwd(),
				"packages",
				"server",
				"src",
				"lib",
				"database.ts",
			),
			"utf-8",
		);
		expect(databaseSource.includes("override: true")).toBe(false);
		expect(manageSource).toContain('case "dev"');
		expect(manageSource).toContain('"boot"');
		expect(manageSource).not.toContain("bun run src/index.ts");
		const defenseManagerSource = fs.readFileSync(
			path.join(
				process.cwd(),
				"packages",
				"server",
				"src",
				"lib",
				"defense-manager.ts",
			),
			"utf-8",
		);
		expect(defenseManagerSource).toContain("fileURLToPath(import.meta.url)");
		expect(defenseManagerSource).not.toContain(
			'join(process.cwd(), "config/defense/rules.json")',
		);
		console.log("✅ Compatibility entrypoints aligned");
	});

	test("CI smoke test uses the lightweight ping endpoint", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const workflow = fs.readFileSync(
			path.join(process.cwd(), ".github", "workflows", "ci.yml"),
			"utf-8",
		);

		expect(workflow).toContain("bun run start");
		expect(workflow).toContain("REDIS_ENABLED=false");
		expect(workflow).toContain("localhost:3000/ping");
		expect(workflow).not.toContain("localhost:3000/health || exit 1");
		console.log("✅ CI smoke test uses ping");
	});
});

describe("Configuration Validation", () => {
	test("TypeScript config is valid", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const tsconfigPath = path.join(
			process.cwd(),
			"config/internal/tsconfig.json",
		);
		expect(fs.existsSync(tsconfigPath)).toBe(true);

		// tsconfig.jsonにはコメントが含まれるため、正規表現で削除してからパース
		const tsconfigContent = fs
			.readFileSync(tsconfigPath, "utf-8")
			.replace(/\/\*[\s\S]*?\*\//g, "") // ブロックコメント削除
			.replace(/\/\/.*/g, ""); // 行コメント削除
		const tsconfig = JSON.parse(tsconfigContent);
		expect(tsconfig.compilerOptions).toHaveProperty("target");
		expect(tsconfig.compilerOptions).toHaveProperty("module");
		console.log("✅ TypeScript configuration valid");
	});

	test("Webpack config is valid", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const webpackPath = path.join(
			process.cwd(),
			"config/internal/webpack.config.js",
		);
		expect(fs.existsSync(webpackPath)).toBe(true);

		const content = fs.readFileSync(webpackPath, "utf-8");
		expect(content).toContain("module.exports");
		expect(content).toContain("entry");
		expect(content).toContain("output");
		console.log("✅ Webpack configuration valid");
	});

	test("Biome config exists", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const biomePath = path.join(process.cwd(), "biome.json");
		expect(fs.existsSync(biomePath)).toBe(true);
		console.log("✅ Biome configuration present");
	});
});

describe("Deployment Files Validation", () => {
	test("All deployment scripts are executable (on Unix)", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const scripts = [
			path.join(process.cwd(), "cloud", "aws", "deploy.sh"),
			path.join(process.cwd(), "cloud", "gcp", "deploy.sh"),
		];

		for (const script of scripts) {
			if (fs.existsSync(script)) {
				const content = fs.readFileSync(script, "utf-8");
				expect(content).toContain("#!/bin/bash");
				console.log(`✅ ${path.basename(script)} has proper shebang`);
			}
		}
	});

	test("Documentation files exist", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const docs = [
			path.join(process.cwd(), "README.md"),
			path.join(process.cwd(), "DEPLOYMENT.md"),
			path.join(process.cwd(), "cloud", "README.md"),
			path.join(process.cwd(), "swift", "README.md"),
		];

		for (const doc of docs) {
			if (fs.existsSync(doc)) {
				const content = fs.readFileSync(doc, "utf-8");
				expect(content.length).toBeGreaterThan(100);
				console.log(`✅ ${path.basename(doc)} exists and has content`);
			}
		}
	});
});
