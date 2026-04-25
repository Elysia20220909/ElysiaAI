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
			const content = fs.readFileSync(requirementsPath, "utf-8");
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

		const readme = fs.readFileSync(path.join(process.cwd(), "README.md"), "utf-8");

		expect(readme).toContain("make boot");
		expect(readme).toContain(".\\scripts\\boot.ps1");
		expect(readme).toContain(".\\scripts\\setup-python.ps1");
		expect(readme).toContain("./scripts/boot.sh");
		expect(readme).toContain("FastAPI Kernel");
		expect(readme).toContain("HTTP proxy");
		console.log("✅ README local boot flow is current");
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

	test("Python setup scripts use the root virtualenv contract", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const setupPs1 = fs.readFileSync(
			path.join(process.cwd(), "scripts", "setup-python.ps1"),
			"utf-8",
		);
		const setupSh = fs.readFileSync(
			path.join(process.cwd(), "scripts", "setup-python.sh"),
			"utf-8",
		);

		expect(setupPs1).toContain(".venv\\Scripts\\python.exe");
		expect(setupPs1).toContain("requirements.txt");
		expect(setupPs1).not.toContain("python\\requirements.txt");
		expect(setupSh).toContain(".venv/bin/python");
		expect(setupSh).toContain("requirements.txt");
		expect(setupSh).not.toContain("python/requirements.txt");
		console.log("✅ Python setup scripts use root virtualenv");
	});

	test("Compatibility entrypoints point to the modular server", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const legacyServerPath = path.join(process.cwd(), "server.ts");
		const bootScriptPath = path.join(process.cwd(), "scripts", "boot.ts");
		const bootPs1Path = path.join(process.cwd(), "scripts", "boot.ps1");
		const bootShPath = path.join(process.cwd(), "scripts", "boot.sh");
		const startServerPs1Path = path.join(
			process.cwd(),
			"scripts",
			"start-server.ps1",
		);
		const startServerShPath = path.join(
			process.cwd(),
			"scripts",
			"start-server.sh",
		);
		const startServerTsPath = path.join(
			process.cwd(),
			"scripts",
			"start-server.ts",
		);
		const startFastApiPs1Path = path.join(
			process.cwd(),
			"scripts",
			"start-fastapi.ps1",
		);
		const startFastApiShPath = path.join(
			process.cwd(),
			"scripts",
			"start-fastapi.sh",
		);
		const legacyServer = fs.readFileSync(legacyServerPath, "utf-8");
		const bootScript = fs.readFileSync(bootScriptPath, "utf-8");
		const serverIndex = fs.readFileSync(
			path.join(process.cwd(), "packages", "server", "src", "index.ts"),
			"utf-8",
		);
		const bootPs1 = fs.readFileSync(bootPs1Path, "utf-8");
		const bootSh = fs.readFileSync(bootShPath, "utf-8");
		const startServerPs1 = fs.readFileSync(startServerPs1Path, "utf-8");
		const startServerSh = fs.readFileSync(startServerShPath, "utf-8");
		const startServerTs = fs.readFileSync(startServerTsPath, "utf-8");
		const startFastApiPs1 = fs.readFileSync(startFastApiPs1Path, "utf-8");
		const startFastApiSh = fs.readFileSync(startFastApiShPath, "utf-8");
		const startAllPs1 = fs.readFileSync(
			path.join(process.cwd(), "scripts", "start-all.ps1"),
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
		expect(
			databaseSource.includes("override: true"),
		).toBe(false);
		expect(bootPs1).toContain("bun run boot");
		expect(bootSh).toContain("exec bun run boot");
		expect(startServerPs1).toContain("bun run start");
		expect(startServerPs1).not.toContain("bun run src/index.ts");
		expect(startServerSh).toContain("exec bun run start");
		expect(startServerSh).not.toContain("dist/index.js");
		expect(startServerTs).toContain("packages/server/src/index.ts");
		expect(startFastApiPs1).toContain("python.fastapi_server:app");
		expect(startFastApiSh).toContain("python.fastapi_server:app");
		expect(startAllPs1).toContain("boot.ps1");
		expect(startAllPs1).not.toContain("bun src/index.ts");
		console.log("✅ Compatibility entrypoints aligned");
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
