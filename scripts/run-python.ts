import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

type PythonCandidate = {
	args: string[];
	command: string;
};

const [, , scriptPath, ...scriptArgs] = Bun.argv;

if (!scriptPath) {
	console.error("Usage: bun scripts/run-python.ts <script.py> [args...]");
	process.exit(2);
}

function candidates(): PythonCandidate[] {
	const envPython = process.env.PYTHON?.trim();
	const options: PythonCandidate[] = [];

	if (envPython) options.push({ command: envPython, args: [] });

	const venvPaths =
		process.platform === "win32"
			? [join(".venv", "Scripts", "python.exe"), join(".venv", "bin", "python")]
			: [
					join(".venv", "bin", "python"),
					join(".venv", "Scripts", "python.exe"),
				];

	for (const pythonPath of venvPaths) {
		if (existsSync(pythonPath)) options.push({ command: pythonPath, args: [] });
	}

	if (process.platform === "win32") {
		options.push({ command: "py", args: ["-3"] });
		options.push({ command: "python", args: [] });
		options.push({ command: "python3", args: [] });
	} else {
		options.push({ command: "python3", args: [] });
		options.push({ command: "python", args: [] });
	}

	return options;
}

const env = {
	...process.env,
	PYTHONUTF8: process.env.PYTHONUTF8 ?? "1",
};

const attempted: string[] = [];

for (const candidate of candidates()) {
	const commandLine = [candidate.command, ...candidate.args].join(" ");
	attempted.push(commandLine);

	const result = spawnSync(
		candidate.command,
		[...candidate.args, scriptPath, ...scriptArgs],
		{
			env,
			stdio: "inherit",
		},
	);

	if (result.error) {
		const code = (result.error as NodeJS.ErrnoException).code;
		if (code === "ENOENT") continue;

		console.error(result.error.message);
		process.exit(1);
	}

	process.exit(result.status ?? 1);
}

console.error("Python was not found. Tried:");
for (const commandLine of attempted) console.error(`  - ${commandLine}`);
process.exit(127);
