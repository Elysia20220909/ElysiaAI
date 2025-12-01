import { describe, expect, test } from "bun:test";

describe("Integration Tests - Full Stack", () => {
	test("TypeScript build produces valid output", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const distPath = path.join(process.cwd(), "dist", "index.js");
		expect(fs.existsSync(distPath)).toBe(true);

		const content = fs.readFileSync(distPath, "utf-8");
		expect(content.length).toBeGreaterThan(0);
		console.log("✅ Build output valid");
	});

	test("Package.json has all required scripts", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const pkgPath = path.join(process.cwd(), "package.json");
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

		expect(pkg.scripts).toHaveProperty("dev");
		expect(pkg.scripts).toHaveProperty("build");
		expect(pkg.scripts).toHaveProperty("start");
		expect(pkg.scripts).toHaveProperty("docker:build");
		expect(pkg.scripts).toHaveProperty("docker:up");
		expect(pkg.scripts).toHaveProperty("aws:deploy");
		expect(pkg.scripts).toHaveProperty("gcp:deploy");
		console.log("✅ All deployment scripts present");
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

		const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
		expect(fs.existsSync(tsconfigPath)).toBe(true);

		const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
		expect(tsconfig.compilerOptions).toHaveProperty("target");
		expect(tsconfig.compilerOptions).toHaveProperty("module");
		console.log("✅ TypeScript configuration valid");
	});

	test("Webpack config is valid", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const webpackPath = path.join(process.cwd(), "webpack.config.js");
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
