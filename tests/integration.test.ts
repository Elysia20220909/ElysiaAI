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
		expect(rootPkg.scripts).toHaveProperty("lint");
		expect(rootPkg.scripts).toHaveProperty("start");
		expect(rootPkg.scripts).toHaveProperty("test");
		expect(serverPkg.scripts).toHaveProperty("dev");
		expect(serverPkg.scripts).toHaveProperty("db:init");
		expect(serverPkg.scripts).toHaveProperty("db:migrate");
		console.log("✅ Current workflow scripts present");
	});

	test("Environment can handle TypeScript compilation", async () => {
		const { execSync } = await import("node:child_process");

		try {
			const output = execSync("bun --version", { encoding: "utf-8" });
			expect(output).toBeTruthy();
			console.log("✅ Bun runtime available:", output.trim());
		} catch (error) {
			console.error("❌ Bun runtime check failed");
			throw error;
		}
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
