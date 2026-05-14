import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const defaultTestDirectories = [
	"src",
	"tests",
	"tests/integration",
	"tests/performance",
	"packages/server/src/lib",
];
const routeTestDirectory = "packages/server/src/routes";

function toBunPath(path: string): string {
	return path.replace(/\\/g, "/");
}

function listImmediateTestFiles(directory: string): string[] {
	if (!existsSync(directory)) return [];

	return readdirSync(directory, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".test.ts"))
		.map((entry) => toBunPath(join(directory, entry.name)));
}

async function runTestGroup(
	label: string,
	testFiles: string[],
): Promise<number> {
	if (testFiles.length === 0) return 0;

	console.log(`Running ${testFiles.length} Bun test files: ${label}.`);

	const proc = Bun.spawn(["bun", "test", ...testFiles], {
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
		env: process.env,
	});

	return await proc.exited;
}

const routeTestFiles = listImmediateTestFiles(routeTestDirectory).sort();
const defaultTestFiles = defaultTestDirectories
	.flatMap(listImmediateTestFiles)
	.sort();
const testFileCount = routeTestFiles.length + defaultTestFiles.length;

if (testFileCount === 0) {
	console.error("No Bun test files matched the default test manifest.");
	process.exit(1);
}

const routeExitCode = await runTestGroup("server route tests", routeTestFiles);
if (routeExitCode !== 0) process.exit(routeExitCode);

process.exit(await runTestGroup("default manifest", defaultTestFiles));
