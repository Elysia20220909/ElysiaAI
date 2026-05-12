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
  dev:lite      Start the local stack with fast lightweight kernel startup
  dev:ci        Start the server in lightweight CI mode (mocked AI)
  branch:auto   Create or switch to a safe codex work branch
  native-lite   Show Rust/Swift/Bun lightweighting snapshot
  ops           Show local house server readiness
  suit          Show fictional suit status
  setup         Run initial environment setup (Bun & env file)
  setup-db      Validate Prisma schema and regenerate Prisma client
  setup-python  Run Python environment setup (.venv)
  build         Build the project for production
  test          Run Bun tests
  lint          Run linting checks
  clean         Cleanup temporary files and artifacts
  check         Audit project for shortcomings and fragmentation
  check-encoding
                Verify UTF-8 text and mojibake markers
  check-git-hygiene
                Verify local secrets are not tracked
  stars         Witness the resonance of stars in the terminal ✨

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
		env: process.env,
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

function seasonalGreeting() {
	const now = new Date();
	const month = now.getMonth() + 1;
	const date = now.getDate();

	if (month === 10 && date >= 25) {
		console.log(
			"\x1b[35m🎃 Happy Halloween! The Abyss whispers tricks and treats... 🍬\x1b[0m",
		);
	} else if (month === 12 && date >= 20 && date <= 25) {
		console.log(
			"\x1b[32m🎄 Merry Christmas! Resonance of joy to you and the AI... 🎁\x1b[0m",
		);
	} else if (month === 1 && date <= 5) {
		console.log(
			"\x1b[33m🎍 Happy New Year! A new cycle of intelligence begins... 🌅\x1b[0m",
		);
	} else if ((month === 4 && date >= 29) || (month === 5 && date <= 5)) {
		console.log(
			"\x1b[33m🎏 Happy Golden Week! A time for rest and resonance... 🕊️\x1b[0m",
		);
	} else if ((month === 3 && date >= 20) || (month === 4 && date <= 10)) {
		console.log(
			"\x1b[38;5;213m🌸 Sakura Resonance: Spring has arrived in the OS... 🍃\x1b[0m",
		);
	}
}

async function startAnimation() {
	const width = process.stdout.columns || 80;
	const height = 15;
	const colors = ["\x1b[37m", "\x1b[97m", "\x1b[94m", "\x1b[95m", "\x1b[96m"]; // White, Bright White, Blue, Magenta, Cyan
	const chars = ["*", "+", ".", "✨", "⊹", "·"];

	process.stdout.write("\x1b[?25l"); // Hide cursor

	for (let i = 0; i < 50; i++) {
		const x = Math.floor(Math.random() * width);
		const y = Math.floor(Math.random() * height);
		const char = chars[Math.floor(Math.random() * chars.length)];
		const color = colors[Math.floor(Math.random() * colors.length)];

		process.stdout.write(`\x1b[${y};${x}H${color}${char}\x1b[0m`);
		await new Promise((resolve) => setTimeout(resolve, 50));
	}

	process.stdout.write("\x1b[?25h"); // Show cursor
	console.log("\n\n🌌 The resonance is complete. The stars guide your path.");
}

async function runCommand(command: string, args: string[] = []) {
	switch (command) {
		case "branch:auto":
			await run("bun", ["run", "branch:auto", "--", ...args]);
			break;
		case "dev":
			console.log("🚀 Starting ElysiaAI local stack...");
			await run("bun", ["run", "boot"]);
			break;
		case "dev:lite":
			console.log("⚡ Starting ElysiaAI local stack in lite mode...");
			process.env.ELYSIA_KERNEL_LITE = "1";
			process.env.REDIS_ENABLED = "false";
			await run("bun", ["scripts/boot.ts", "--lite"]);
			break;
		case "dev:ci":
			console.log("🧪 Starting ElysiaAI in CI (Mocked) mode...");
			process.env.ELYSIA_TEST_MODE = "1";
			process.env.REDIS_ENABLED = "false";
			await run("bun", ["scripts/boot.ts", "--ci"]);
			break;
		case "native-lite":
			await run("bun", ["run", "native:lite"]);
			break;
		case "ops":
			await run("bun", ["run", "ops"]);
			break;
		case "suit":
			await run("bun", ["run", "suit"]);
			break;
		case "setup":
			console.log("⚙️ Setting up environment...");
			await run("bun", ["install", "--backend=copyfile", "--ignore-scripts"]);
			await copyEnvExampleIfMissing();
			process.env.DATABASE_URL ??= "file:./prisma/dev.db";
			await run("bun", ["run", "db:validate"]);
			await run("bun", ["run", "db:generate"]);
			console.log("✅ Setup complete.");
			break;
		case "setup-db":
			console.log("🗄️ Repairing local Prisma client...");
			process.env.DATABASE_URL ??= "file:./prisma/dev.db";
			await run("bun", ["run", "db:validate"]);
			await run("bun", ["run", "db:generate"]);
			console.log("✅ Local Prisma client ready.");
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
			await run("bun", [
				"build",
				"packages/server/src/index.ts",
				"--target=bun",
				"--outdir",
				"dist/server",
			]);
			break;
		case "test": {
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
		}
		case "lint":
			console.log("🧹 Linting...");
			await run("bun", ["run", "lint"]);
			break;
		case "check-encoding":
			await run("bun", ["run", "check:encoding"]);
			break;
		case "check-git-hygiene":
			await run("bun", ["run", "check:git-hygiene"]);
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
			await run("bun", ["run", "check:git-hygiene"]);
			await run("bun", ["run", "check:encoding"]);

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
		case "stars":
			await startAnimation();
			break;
		default:
			console.log(`❌ Unknown command: ${command}`);
			showHelp();
	}
}

const command = positionals[0];
const rawArgs = Bun.argv.slice(2);
const commandIndex = command ? rawArgs.indexOf(command) : -1;
const commandArgs =
	commandIndex >= 0 ? rawArgs.slice(commandIndex + 1) : positionals.slice(1);

try {
	if (values.help || !command) {
		showHelp();
		seasonalGreeting();
	} else {
		await runCommand(command, commandArgs);
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
