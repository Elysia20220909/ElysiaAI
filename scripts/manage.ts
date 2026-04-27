import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		help: { type: "boolean", short: "h" },
		production: { type: "boolean", short: "p" },
	},
	strict: false,
	allowPositionals: true,
});

function showHelp() {
	console.log(`
🌌 ElysiaAI Management CLI
Usage: bun scripts/manage.ts <command> [options]

Commands:
  dev           Start the full local stack
  setup         Run initial environment setup (Bun & env file)
  setup-python  Run Python environment setup (.venv)
  build         Build the project for production
  test          Run Bun tests
  lint          Run linting checks
  clean         Cleanup temporary files and artifacts
  check         Audit project for shortcomings and fragmentation

Options:
  -h, --help        Show this help message
  -p, --production  Run in production mode
`);
}

async function run(command: string, args: string[] = []) {
	const proc = Bun.spawn([command, ...args], {
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	});

	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed with ${exitCode}`);
	}
}

function findPythonCommand(): { command: string; args: string[] } {
	if (process.env.PYTHON?.trim()) {
		return { command: process.env.PYTHON.trim(), args: [] };
	}

	if (process.platform === "win32") {
		return { command: "python", args: [] };
	}

	return { command: "python3", args: [] };
}

function venvPythonPath() {
	const candidates =
		process.platform === "win32"
			? [join(".venv", "Scripts", "python.exe"), join(".venv", "bin", "python")]
			: [
					join(".venv", "bin", "python"),
					join(".venv", "Scripts", "python.exe"),
				];

	return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

async function copyEnvExampleIfMissing() {
	if (existsSync(".env")) return;
	if (!existsSync(".env.example")) {
		throw new Error(".env.example is missing.");
	}

	console.log("Creating default .env...");
	await Bun.write(".env", Bun.file(".env.example"));
}

function walkFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];

	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			files.push(...walkFiles(fullPath));
		} else {
			files.push(fullPath);
		}
	}
	return files;
}

async function runCommand(command: string) {
	switch (command) {
		case "dev":
			console.log("🚀 Starting ElysiaAI local stack...");
			await run("bun", ["run", "boot"]);
			break;
		case "setup":
			console.log("⚙️ Setting up environment...");
			await run("bun", ["install"]);
			await copyEnvExampleIfMissing();
			console.log("✅ Setup complete.");
			break;
		case "setup-python": {
			console.log("🐍 Setting up Python environment...");
			const python = findPythonCommand();

			if (!existsSync(".venv")) {
				console.log("Creating .venv...");
				await run(python.command, [...python.args, "-m", "venv", ".venv"]);
			}

			const venvPython = venvPythonPath();
			if (!existsSync(venvPython)) {
				throw new Error(
					`${venvPython} was not created. Remove .venv and rerun setup-python.`,
				);
			}

			console.log("Installing Python dependencies...");
			await run(venvPython, ["-m", "pip", "install", "-U", "pip"]);
			await run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"]);
			console.log("✅ Python environment ready.");
			break;
		}
		case "build":
			console.log("🏗️ Building project...");
			await run("bun", ["run", "build"]);
			break;
		case "test":
			console.log("🧪 Running tests...");
			console.log("--- Bun Tests ---");
			await run("bun", ["test"]);
			console.log("--- Python Tests ---");
			const venvPython = venvPythonPath();
			if (existsSync(venvPython)) {
				await run(venvPython, ["-m", "pytest", "tests/"]);
			} else {
				console.log("⚠️ Python venv not found. Skipping Python tests.");
			}
			break;
		case "lint":
			console.log("🧹 Linting...");
			await run("bun", ["run", "lint"]);
			break;
		case "clean": {
			console.log("🧹 Cleaning up...");
			const targets = ["dist", "build", ".next", "out", "coverage", ".turbo"];
			for (const target of targets) {
				if (existsSync(target)) {
					console.log(`Removing ${target}...`);
					rmSync(target, { recursive: true, force: true });
				}
			}
			console.log("✅ Clean complete.");
			break;
		}
		case "check": {
			console.log("🔍 Auditing project for shortcomings...");
			const configCandidateFiles = walkFiles(
				join("packages", "server", "src", "lib"),
			)
				.filter((file) => file.endsWith(".ts"))
				.filter((file) => !file.endsWith(".test.ts"))
				.filter(
					(file) =>
						!file.endsWith(`${join("lib", "constants.ts")}`) &&
						!file.endsWith(`${join("lib", "env-validator.ts")}`),
				);

			const filesWithEnvUsage: string[] = [];
			for (const file of configCandidateFiles) {
				const source = await Bun.file(file).text();
				if (source.includes("process.env")) filesWithEnvUsage.push(file);
			}

			if (filesWithEnvUsage.length > 0) {
				console.log("⚠️ Configuration fragmentation detected in:");
				for (const file of filesWithEnvUsage) console.log(`  - ${file}`);
			} else {
				console.log("✅ Configuration centralization: verified.");
			}

			const scriptFiles = readdirSync("scripts").filter((file) =>
				/\.(ps1|sh|ts)$/.test(file),
			);
			if (scriptFiles.length > 10) {
				console.log(
					`⚠️ Script bloat: ${scriptFiles.length} runnable scripts in scripts/.`,
				);
			} else {
				console.log("✅ Script surface: compact.");
			}
			break;
		}
		default:
			console.log(`❌ Unknown command: ${command}`);
			showHelp();
	}
}

const command = positionals[0];

try {
	if (values.help || !command) {
		showHelp();
	} else {
		await runCommand(command);
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
