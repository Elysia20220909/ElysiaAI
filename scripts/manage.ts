import { parseArgs } from "node:util";
import { $ } from "bun";

const { values, positionals } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		help: { type: "boolean", short: "h" },
		production: { type: "boolean", short: "p" },
	},
	strict: false,
	allowPositionals: true,
});

async function showHelp() {
	console.log(`
🌌 ElysiaAI Management CLI
Usage: bun scripts/manage.ts <command> [options]

Commands:
  dev           Start development server
  setup         Run initial environment setup (Bun & Node)
  setup-python  Run Python environment setup (.venv)
  build         Build the project for production
  test          Run all tests
  lint          Run linting checks
  clean         Cleanup temporary files and artifacts
  check         Audit project for shortcomings and fragmentation

Options:
  -h, --help        Show this help message
  -p, --production  Run in production mode
`);
}

async function runCommand(command: string) {
	switch (command) {
		case "dev":
			console.log("🚀 Starting development server...");
			await $`bun run dev`;
			break;
		case "setup":
			console.log("⚙️ Setting up environment...");
			await $`bun install`;
			if (!(await $`test -f .env`.quiet().nothrow())) {
				console.log("Creating default .env...");
				await $`cp .env.example .env`.nothrow();
			}
			console.log("✅ Setup complete.");
			break;
		case "setup-python": {
			console.log("🐍 Setting up Python environment...");
			const venvDir =
				process.platform === "win32" ? ".venv/Scripts" : ".venv/bin";
			const pythonExe = process.platform === "win32" ? "python" : "python3";

			if (!(await $`which ${pythonExe}`.quiet().nothrow())) {
				console.error(
					`❌ ${pythonExe} not found. Please install Python 3.11+.`,
				);
				process.exit(1);
			}

			if (!(await $`test -d .venv`.quiet().nothrow())) {
				console.log("Creating .venv...");
				await $`${pythonExe} -m venv .venv`;
			}

			const pip = `${venvDir}/pip`;
			console.log("Installing Python dependencies...");
			await $`${pip} install -U pip`;
			await $`${pip} install -r requirements.txt`;
			console.log("✅ Python environment ready.");
			break;
		}
		case "build":
			console.log("🏗️ Building project...");
			await $`bun run build`;
			break;
		case "test":
			console.log("🧪 Running tests...");
			await $`bun test`;
			break;
		case "lint":
			console.log("🧹 Linting...");
			await $`bun run lint`;
			break;
		case "clean": {
			console.log("🧹 Cleaning up...");
			const targets = ["dist", "build", ".next", "out", "coverage", ".turbo"];
			for (const target of targets) {
				if (await $`test -d ${target}`.quiet().nothrow()) {
					console.log(`Removing ${target}...`);
					await $`rm -rf ${target}`;
				}
			}
			console.log("✅ Clean complete.");
			break;
		}
		case "check": {
			console.log("🔍 Auditing project for shortcomings...");
			// Check for remaining process.env calls in lib files
			const libFiles =
				await $`grep -r "process.env" packages/server/src/lib --exclude="constants.ts" --exclude="env-validator.ts"`
					.quiet()
					.nothrow();
			if (libFiles.stdout.toString().trim()) {
				console.warn("⚠️ Configuration Fragmentation detected in:");
				console.log(libFiles.stdout.toString());
			} else {
				console.log("✅ Configuration centralization: Verified.");
			}

			// Check for legacy scripts
			const legacyScripts = await $`ls scripts/*.ps1 scripts/*.sh`
				.quiet()
				.nothrow();
			const scriptCount = legacyScripts.stdout
				.toString()
				.split("\n")
				.filter(Boolean).length;
			if (scriptCount > 10) {
				console.warn(
					`⚠️ High script bloat: ${scriptCount} legacy scripts remaining in scripts/`,
				);
			}
			break;
		}
		default:
			console.log(`❌ Unknown command: ${command}`);
			await showHelp();
	}
}

const command = positionals[0];

if (values.help || !command) {
	await showHelp();
} else {
	await runCommand(command);
}
