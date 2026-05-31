#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

type Severity = "fail" | "warn";

type Finding = {
	severity: Severity;
	message: string;
	path: string;
	line?: number;
	detail?: string;
};

const args = new Set(process.argv.slice(2));
const strictPinning = args.has("--strict-pinning");
const cwd = process.cwd();
const workflowsDir = join(cwd, ".github", "workflows");
const findings: Finding[] = [];

const knownIndicators = [
	{
		label: "Megalodon C2 endpoint",
		pattern: /216(?:\.|\[\.\])126(?:\.|\[\.\])225(?:\.|\[\.\])129(?::8443)?/i,
	},
	{ label: "Megalodon campaign marker", pattern: /\bmegalodon\b/i },
	{ label: "Megalodon SysDiag workflow", pattern: /\bSysDiag\b/i },
	{
		label: "Megalodon Optimize-Build workflow",
		pattern: /\bOptimize-Build\b/i,
	},
	{
		label: "Megalodon forged bot identity",
		pattern: /\b(build-bot|auto-ci|ci-bot|pipeline-bot)\b/i,
	},
	{
		label: "Megalodon forged maintenance commit text",
		pattern:
			/\b(ci: add build optimization step|build: improve ci performance|chore: optimize pipeline runtime|chore: sync ci configuration|chore: update ci\/cd pipeline|ci: update build config|fix: correct build workflow)\b/i,
	},
];

const base64DecodeMarkers = [
	/\bbase64\s+(?:-d|--decode)\b/i,
	/\bbase64\s+-di\b/i,
	/\bfromBase64String\b/i,
	/Buffer\.from\([^)]*base64/i,
];

const networkMarkers = [
	/\bcurl\b/i,
	/\bwget\b/i,
	/\bInvoke-WebRequest\b/i,
	/\biwr\b/i,
	/\bnetcat\b/i,
	/\bnc\s+-/i,
	/\bpython\s+-c\b.*https?:\/\//i,
];

const secretMarkers = [
	/\bsecrets\./i,
	/\bGITHUB_TOKEN\b/i,
	/\bACTIONS_ID_TOKEN_REQUEST_(?:URL|TOKEN)\b/i,
	/\/proc\/[^/\s]+\/(?:environ|mem)\b/i,
	/\bAWS_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY|SESSION_TOKEN)\b/i,
	/\bGOOGLE_APPLICATION_CREDENTIALS\b/i,
	/\bAZURE_(?:CLIENT_ID|CLIENT_SECRET|TENANT_ID)\b/i,
	/\bPRIVATE_KEY\b/i,
	/\bAPI_KEY\b/i,
	/\b\.env\b/i,
];

const remoteInstallerPattern =
	/(?:curl|wget)\b[^|\n]*(?:https?:\/\/)[^|\n]*\|\s*(?:sh|bash|pwsh|powershell)\b/i;

function add(
	severity: Severity,
	message: string,
	path: string,
	line?: number,
	detail?: string,
) {
	findings.push({ severity, message, path, line, detail });
}

function displayPath(path: string) {
	return relative(cwd, path).replaceAll("\\", "/");
}

function workflowFiles() {
	if (!existsSync(workflowsDir)) return [];
	return readdirSync(workflowsDir)
		.filter((name) => /\.(ya?ml)$/i.test(name))
		.map((name) => join(workflowsDir, name))
		.filter((path) => {
			try {
				return statSync(path).isFile();
			} catch {
				return false;
			}
		});
}

function firstMatchingLine(lines: string[], patterns: RegExp[]) {
	for (let index = 0; index < lines.length; index++) {
		if (patterns.some((pattern) => pattern.test(lines[index]))) {
			return index + 1;
		}
	}
	return undefined;
}

function hasAny(text: string, patterns: RegExp[]) {
	return patterns.some((pattern) => pattern.test(text));
}

function scanUsesLine(path: string, line: string, lineNumber: number) {
	const match = line.match(/^\s*uses:\s*([^#\s]+)/);
	if (!match) return;

	const spec = match[1].replace(/^["']|["']$/g, "");
	if (spec.startsWith("./") || spec.startsWith("docker://")) return;

	const atIndex = spec.lastIndexOf("@");
	if (atIndex === -1) {
		add(
			"warn",
			"Action reference has no explicit version or SHA",
			path,
			lineNumber,
			spec,
		);
		return;
	}

	const ref = spec.slice(atIndex + 1);
	if (/^[a-f0-9]{40}$/i.test(ref)) return;

	add(
		strictPinning ? "fail" : "warn",
		"Action reference is not pinned to a full commit SHA",
		path,
		lineNumber,
		spec,
	);
}

function scanWorkflow(path: string) {
	const text = readFileSync(path, "utf8");
	const lines = text.split(/\r?\n/);

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		const lineNumber = index + 1;

		for (const indicator of knownIndicators) {
			if (indicator.pattern.test(line)) {
				add("fail", indicator.label, path, lineNumber, line.trim());
			}
		}

		if (/\bpull_request_target\s*:/.test(line)) {
			add(
				"fail",
				"pull_request_target exposes privileged workflow context to PR input",
				path,
				lineNumber,
			);
		}

		if (/^\s*id-token:\s*write\b/i.test(line)) {
			add("warn", "Workflow can mint OIDC tokens", path, lineNumber);
		}

		if (/^\s*contents:\s*write\b/i.test(line)) {
			add("warn", "Workflow can write repository contents", path, lineNumber);
		}

		if (remoteInstallerPattern.test(line)) {
			add(
				"warn",
				"Remote install script is piped directly to a shell",
				path,
				lineNumber,
				line.trim(),
			);
		}

		scanUsesLine(path, line, lineNumber);
	}

	if (
		hasAny(text, base64DecodeMarkers) &&
		hasAny(text, networkMarkers) &&
		hasAny(text, secretMarkers)
	) {
		add(
			"fail",
			"Workflow combines base64 decoding, network egress, and secret access markers",
			path,
			firstMatchingLine(lines, base64DecodeMarkers),
		);
	}

	if (
		hasAny(text, [/\/proc\/[^/\s]+\/(?:environ|mem)\b/i]) &&
		hasAny(text, networkMarkers)
	) {
		add(
			"fail",
			"Workflow reads process environment or memory and has network egress markers",
			path,
			firstMatchingLine(lines, [/\/proc\/[^/\s]+\/(?:environ|mem)\b/i]),
		);
	}
}

const files = workflowFiles();
for (const file of files) {
	scanWorkflow(file);
}

const failures = findings.filter((finding) => finding.severity === "fail");
const warnings = findings.filter((finding) => finding.severity === "warn");

console.log("CI workflow threat scan");
console.log(`Workflows scanned: ${files.length}`);

if (findings.length > 0) {
	console.log("");
	for (const finding of findings) {
		const location =
			finding.line === undefined
				? displayPath(finding.path)
				: `${displayPath(finding.path)}:${finding.line}`;
		const detail = finding.detail ? ` (${finding.detail})` : "";
		console.log(
			`[${finding.severity.toUpperCase()}] ${location} ${finding.message}${detail}`,
		);
	}
}

if (failures.length > 0) {
	console.error("");
	console.error(
		`CI workflow threat scan failed: ${failures.length} blocking finding(s).`,
	);
	process.exit(1);
}

console.log("");
console.log(
	warnings.length > 0
		? `CI workflow threat scan completed with ${warnings.length} warning(s).`
		: "CI workflow threat scan completed with no findings.",
);
