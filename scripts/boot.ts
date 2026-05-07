#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();
const args = new Set(Bun.argv.slice(2));

// Force UTF-8 environment for child processes
process.env.PYTHONUTF8 = "1";
process.env.LANG = "en_US.UTF-8";

async function loadDotEnv(path = join(rootDir, ".env")) {
	if (!existsSync(path)) return;

	const text = await Bun.file(path).text();
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		const separatorIndex = line.indexOf("=");
		if (separatorIndex <= 0) continue;

		const key = line.slice(0, separatorIndex).trim();
		let value = line.slice(separatorIndex + 1).trim();
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		process.env[key] ??= value;
	}
}

await loadDotEnv();

if (args.has("--ci")) {
	process.env.ELYSIA_TEST_MODE ??= "1";
	process.env.REDIS_ENABLED ??= "false";
}

if (args.has("--lite") || args.has("--fast")) {
	process.env.ELYSIA_KERNEL_LITE ??= "1";
	process.env.REDIS_ENABLED ??= "false";
}

const { getEnv } = await import("../src/config.ts");

const bindHost = getEnv("BIND_HOST", getEnv("HOST", "127.0.0.1"));
const healthHost = getEnv(
	"HEALTH_HOST",
	bindHost === "0.0.0.0" ? "127.0.0.1" : bindHost,
);
const appPort = getEnv("PORT", "3000");
const fastApiPort = getEnv("FASTAPI_PORT", "8000");
const fastApiBaseUrl = getEnv(
	"FASTAPI_BASE_URL",
	`http://${healthHost}:${fastApiPort}`,
);

const children = new Set<Bun.Subprocess>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function resolvePythonCommand() {
	if (process.env.PYTHON?.trim()) return process.env.PYTHON.trim();
	if (process.platform === "win32") {
		const windowsVenvPython = join(rootDir, ".venv", "Scripts", "python.exe");
		if (existsSync(windowsVenvPython)) return windowsVenvPython;
		return "python";
	}

	const venvPython = join(rootDir, ".venv", "bin", "python");
	if (existsSync(venvPython)) return venvPython;
	return "python";
}

function startProcess(
	label: string,
	cmd: string[],
	env: Record<string, string>,
) {
	console.log(`\n> ${label}`);
	console.log(`$ ${cmd.join(" ")}`);

	const child = Bun.spawn(cmd, {
		cwd: rootDir,
		env: { ...process.env, ...env },
		stdout: "inherit",
		stderr: "inherit",
	});

	children.add(child);
	void child.exited.finally(() => {
		children.delete(child);
	});

	return child;
}

async function stopChildren() {
	const runningChildren = [...children];
	for (const child of runningChildren) {
		try {
			child.kill();
		} catch {
			// Ignore already-exited processes.
		}
	}
	await Promise.allSettled(runningChildren.map((child) => child.exited));
}

async function waitFor(
	url: string,
	label: string,
	attempts = Number.parseInt(
		process.env.ELYSIA_BOOT_WAIT_ATTEMPTS ?? "120",
		10,
	),
	delayMs = 1000,
) {
	const maxAttempts =
		Number.isFinite(attempts) && attempts > 0 ? attempts : 120;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				console.log(`✔ ${label} ready at ${url}`);
				return;
			}
		} catch {
			// Retry until the service is reachable.
		}

		await sleep(delayMs);
	}

	throw new Error(`${label} did not become ready at ${url}`);
}

async function shutdown(exitCode: number) {
	await stopChildren();
	process.exit(exitCode);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		void shutdown(0);
	});
}

async function main() {
	const mode = args.has("--ci")
		? "ci"
		: process.env.ELYSIA_KERNEL_LITE === "1"
			? "lite"
			: "full";
	console.log(`🌸 Booting the local ElysiaAI stack (${mode} mode)...`);

	const python = startProcess(
		"FastAPI kernel",
		[
			resolvePythonCommand(),
			"-m",
			"uvicorn",
			"python.fastapi_server:app",
			"--host",
			bindHost,
			"--port",
			fastApiPort,
		],
		{
			PYTHONUTF8: "1",
			...(mode === "lite" ? { ELYSIA_KERNEL_LITE: "1" } : {}),
			...(mode === "ci"
				? { ELYSIA_TEST_MODE: "1", REDIS_ENABLED: "false" }
				: {}),
		},
	);

	try {
		await waitFor(
			`http://${healthHost}:${fastApiPort}/health`,
			"FastAPI kernel",
		);
	} catch (error) {
		console.error(error);
		await shutdown(1);
	}

	const server = startProcess("Elysia server", ["bun", "run", "start"], {
		PORT: appPort,
		FASTAPI_BASE_URL: fastApiBaseUrl,
	});

	try {
		await waitFor(`http://${healthHost}:${appPort}/ping`, "Elysia server");
	} catch (error) {
		console.error(error);
		await shutdown(1);
	}

	console.log("\nStack ready:");
	console.log(`- App:     http://${healthHost}:${appPort}`);
	console.log(`- FastAPI: ${fastApiBaseUrl}`);

	const result = await Promise.race([
		python.exited.then((code) => ({ label: "FastAPI kernel", code })),
		server.exited.then((code) => ({ label: "Elysia server", code })),
	]);

	console.error(
		`\n${result.label} exited with code ${result.code}. Shutting down the stack.`,
	);
	await shutdown(result.code === 0 ? 1 : result.code);
}

main().catch(async (error) => {
	console.error(error);
	await shutdown(1);
});
