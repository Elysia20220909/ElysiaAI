import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const REGISTRY_URL = "https://npm.flatt.tech/";
const REGISTRY_HOST = "npm.flatt.tech";
const PROJECT_ROOT = process.cwd();
const TAKUMI_TOKEN_ENV = "TAKUMI_GUARD_TOKEN";

type FileResult = {
	file: string;
	status: "updated" | "unchanged";
	detail: string;
};

function readLines(file: string): string[] {
	if (!existsSync(file)) {
		return [];
	}

	return readFileSync(file, "utf8").split(/\r?\n/).filter((line, index, lines) => {
		return !(index === lines.length - 1 && line === "");
	});
}

function writeLinesIfChanged(file: string, lines: string[], detail: string): FileResult {
	const next = `${lines.join("\n")}\n`;
	const previous = existsSync(file) ? readFileSync(file, "utf8") : "";

	if (previous === next) {
		return { file, status: "unchanged", detail };
	}

	writeFileSync(file, next, "utf8");
	return { file, status: "updated", detail };
}

function ensureProjectNpmrc(file: string): FileResult {
	const lines = readLines(file).filter((line) => {
		return !/^\s*registry\s*=/.test(line) && !/^\s*\/\/npm\.flatt\.tech\/:_authToken\s*=/.test(line);
	});

	return writeLinesIfChanged(
		file,
		[`registry=${REGISTRY_URL}`, ...lines],
		"project registry configured; auth token kept out of Git",
	);
}

function ensureUserNpmrc(file: string, token: string | undefined): FileResult {
	const lines = readLines(file).filter((line) => {
		if (/^\s*registry\s*=/.test(line)) {
			return false;
		}

		if (token && /^\s*\/\/npm\.flatt\.tech\/:_authToken\s*=/.test(line)) {
			return false;
		}

		return true;
	});

	const next = [`registry=${REGISTRY_URL}`, ...lines];

	if (token) {
		next.push(`//npm.flatt.tech/:_authToken=${token}`);
	}

	return writeLinesIfChanged(
		file,
		next,
		token ? "user registry and auth token configured" : "user registry configured; existing token preserved if present",
	);
}

function ensureYarnrc(file: string): FileResult {
	const lines = readLines(file).filter((line) => !/^\s*npmRegistryServer\s*:/.test(line));

	return writeLinesIfChanged(
		file,
		[`npmRegistryServer: "${REGISTRY_URL}"`, ...lines],
		"Yarn registry configured",
	);
}

function ensureBunfig(file: string): FileResult {
	const registryLine = `registry = { url = "${REGISTRY_URL}" }`;

	if (!existsSync(file)) {
		return writeLinesIfChanged(file, ["[install]", registryLine], "Bun registry configured");
	}

	const lines = readLines(file);
	const installIndex = lines.findIndex((line) => /^\s*\[install\]\s*$/.test(line));

	if (installIndex === -1) {
		return writeLinesIfChanged(file, [...lines, "", "[install]", registryLine], "Bun registry configured");
	}

	const nextSectionIndex = lines.findIndex((line, index) => {
		return index > installIndex && /^\s*\[.+\]\s*$/.test(line);
	});
	const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
	const registryIndex = lines.findIndex((line, index) => {
		return index > installIndex && index < endIndex && /^\s*registry\s*=/.test(line);
	});

	const next = [...lines];
	if (registryIndex === -1) {
		next.splice(installIndex + 1, 0, registryLine);
	} else {
		next[registryIndex] = registryLine;
	}

	return writeLinesIfChanged(file, next, "Bun registry configured");
}

function hasTakumiToken(file: string): boolean {
	return readLines(file).some((line) => /^\s*\/\/npm\.flatt\.tech\/:_authToken\s*=\s*\S+/.test(line));
}

async function verifyBlockedPackage(token: string | undefined): Promise<boolean> {
	const headers: Record<string, string> = {};
	if (token) {
		headers.authorization = `Bearer ${token}`;
	}

	try {
		const response = await fetch(`https://${REGISTRY_HOST}/@panda-guard%2Ftest-malicious`, {
			headers,
		});

		if (response.status === 403) {
			console.log("[ok] Takumi Guard blocked @panda-guard/test-malicious with 403");
			return true;
		}

		console.log(`[warn] Expected 403 for blocked test package, received ${response.status}`);
		return false;
	} catch (error) {
		console.log(`[warn] Blocklist verification failed: ${(error as Error).message}`);
		return false;
	}
}

async function main() {
	const args = new Set(process.argv.slice(2));
	const token = process.env[TAKUMI_TOKEN_ENV]?.trim() || undefined;
	const userNpmrc = join(homedir(), ".npmrc");
	const results = [
		ensureProjectNpmrc(join(PROJECT_ROOT, ".npmrc")),
		ensureBunfig(join(PROJECT_ROOT, "bunfig.toml")),
		ensureYarnrc(join(PROJECT_ROOT, ".yarnrc.yml")),
		ensureUserNpmrc(userNpmrc, token),
	];

	for (const result of results) {
		console.log(`[${result.status}] ${result.file} - ${result.detail}`);
	}

	if (hasTakumiToken(userNpmrc)) {
		console.log("[ok] Takumi Guard auth token is configured in the user npm config");
	} else {
		console.log(`[info] No auth token found. Set ${TAKUMI_TOKEN_ENV} to enable tracking and notifications.`);
	}

	if (args.has("--verify-block")) {
		const verified = await verifyBlockedPackage(token);
		if (!verified) {
			process.exitCode = 1;
		}
	}
}

main().catch((error) => {
	console.error(`[error] ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
});
