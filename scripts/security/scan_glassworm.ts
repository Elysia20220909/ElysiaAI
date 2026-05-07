#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join, resolve, sep } from "node:path";

type Severity = "fail" | "warn" | "info";

type Finding = {
	severity: Severity;
	message: string;
	path?: string;
	detail?: string;
};

const args = new Set(process.argv.slice(2));
const repoOnly = args.has("--repo-only") || args.has("--ci");
const verbose = args.has("--verbose");
const cwd = process.cwd();
const maxBytes = 2 * 1024 * 1024;

const textExtensions = new Set([
	".cjs",
	".css",
	".env",
	".example",
	".html",
	".js",
	".json",
	".jsx",
	".md",
	".mjs",
	".ps1",
	".py",
	".sh",
	".toml",
	".ts",
	".tsx",
	".txt",
	".yaml",
	".yml",
]);

const textNames = new Set([
	".cleanignore",
	".dockerignore",
	".env.example",
	".gitattributes",
	".gitignore",
	".npmrc",
	".yarnrc.yml",
	"Dockerfile",
	"Makefile",
]);

const knownExtensionIds = new Set([
	"96-studio.json-formatter",
	"aadarkcode.one-dark-material",
	"blockstoks.easily-gitignore-manage",
	"code-wakatime-activity-tracker",
	"lauracode.wrap-selected-code",
	"oorzc.i18n-tools-plus",
	"oorzc.mind-map",
	"oorzc.scss-to-css-compile",
	"oorzc.ssh-tools",
	"quartz.quartz-markdown-editor",
]);

const knownPackageNames = new Set([
	"@aifabrix/miso-client",
	"@iflow-mcp/watercrawl-watercrawl-mcp",
]);

const knownText = new Set([...knownExtensionIds, ...knownPackageNames]);

const dynamicExecutionMarkers = [
	"eval(",
	"new Function",
	"vm.Script",
	"runInThisContext",
	"runInNewContext",
];

const decoderMarkers = [
	"codePointAt",
	"Buffer.from",
	"String.fromCodePoint",
	"0xFE00",
	"0xE0100",
	"\\uFE00",
	"\\U000E0100",
];

const findings: Finding[] = [];
let scannedRepoFiles = 0;
let scannedInstalledExtensions = 0;
let variationSelectorFiles = 0;
let extensionRelationshipFiles = 0;

function add(
	severity: Severity,
	message: string,
	path?: string,
	detail?: string,
) {
	findings.push({ severity, message, path, detail });
}

function normalized(path: string) {
	return path.replaceAll("\\", "/");
}

function isSelf(path: string) {
	return normalized(resolve(path)).endsWith(
		"/scripts/security/scan_glassworm.ts",
	);
}

function shouldScanFile(path: string) {
	if (isSelf(path)) return false;
	const n = normalized(path);
	if (n.includes("/.git/") || n.includes("/node_modules/")) return false;
	const name = basename(path);
	const ext = extname(path);
	if (!textExtensions.has(ext) && !textNames.has(name)) return false;

	try {
		return statSync(path).size <= maxBytes;
	} catch {
		return false;
	}
}

function gitFiles() {
	try {
		const out = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
		return out
			.split(/\r?\n/)
			.filter(Boolean)
			.map((file) => resolve(cwd, file));
	} catch {
		return [];
	}
}

function walk(dir: string, out: string[] = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === ".git" || entry.name === "node_modules") continue;
			walk(path, out);
		} else if (entry.isFile()) {
			out.push(path);
		}
	}
	return out;
}

function repoFiles() {
	const files = gitFiles();
	return files.length > 0 ? files : walk(cwd);
}

function readText(path: string) {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
}

function hasVariationSelectorPayloadRange(text: string) {
	for (let i = 0; i < text.length; i++) {
		const cp = text.codePointAt(i);
		if (cp === undefined) continue;
		if (cp > 0xffff) i++;
		if ((cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef)) {
			return true;
		}
	}
	return false;
}

function containsAny(text: string, needles: Iterable<string>) {
	for (const needle of needles) {
		if (text.includes(needle)) return true;
	}
	return false;
}

function scanJsonDependencies(path: string, text: string) {
	if (basename(path) !== "package.json") return;

	try {
		const pkg = JSON.parse(text);
		const sections = [
			"dependencies",
			"devDependencies",
			"optionalDependencies",
			"peerDependencies",
		];

		for (const section of sections) {
			const deps = pkg?.[section];
			if (!deps || typeof deps !== "object") continue;
			for (const name of Object.keys(deps)) {
				if (knownPackageNames.has(name.toLowerCase())) {
					add(
						"fail",
						`Known GlassWorm-linked npm package in ${section}`,
						path,
						name,
					);
				}
			}
		}
	} catch {
		add("warn", "Could not parse package.json during GlassWorm scan", path);
	}
}

function scanExtensionManifest(path: string, text: string) {
	const name = basename(path);
	const lowerPath = normalized(path).toLowerCase();
	if (name !== "extensions.json" && name !== "package.json") return;
	if (
		!lowerPath.includes("/.vscode/") &&
		!lowerPath.includes(`${sep}.vscode${sep}`)
	)
		return;

	try {
		const manifest = JSON.parse(text);
		const values = [
			...(Array.isArray(manifest.recommendations)
				? manifest.recommendations
				: []),
			...(Array.isArray(manifest.unwantedRecommendations)
				? manifest.unwantedRecommendations
				: []),
			...(Array.isArray(manifest.extensionPack) ? manifest.extensionPack : []),
			...(Array.isArray(manifest.extensionDependencies)
				? manifest.extensionDependencies
				: []),
		].map((value) => String(value).toLowerCase());

		for (const value of values) {
			if (knownExtensionIds.has(value)) {
				add(
					"fail",
					"Known GlassWorm-linked VS Code extension reference",
					path,
					value,
				);
			}
		}
	} catch {
		add("warn", "Could not parse VS Code extension manifest", path);
	}
}

function scanRepoFile(path: string) {
	const text = readText(path);
	if (!text) return;
	scannedRepoFiles++;

	const lower = text.toLowerCase();
	scanJsonDependencies(path, text);
	scanExtensionManifest(path, text);

	for (const indicator of knownText) {
		if (lower.includes(indicator.toLowerCase())) {
			add(
				"fail",
				"Known GlassWorm indicator string in repository file",
				path,
				indicator,
			);
		}
	}

	const hasVariationSelectors = hasVariationSelectorPayloadRange(text);
	if (hasVariationSelectors) {
		variationSelectorFiles++;
	}

	const hasDecoder = containsAny(text, decoderMarkers);
	const hasDynamicExecution = containsAny(text, dynamicExecutionMarkers);
	if (hasVariationSelectors && hasDecoder && hasDynamicExecution) {
		add(
			"fail",
			"GlassWorm-style invisible Unicode decoder plus dynamic execution",
			path,
		);
	}

	if (
		lower.includes("extensionpack") ||
		lower.includes("extensiondependencies")
	) {
		extensionRelationshipFiles++;
	}
}

function extensionRoots() {
	const home = homedir();
	return [
		join(home, ".vscode", "extensions"),
		join(home, ".vscode-insiders", "extensions"),
		join(home, ".vscodium", "extensions"),
		join(home, ".cursor", "extensions"),
		join(home, ".windsurf", "extensions"),
	];
}

function scanInstalledExtensionDir(path: string) {
	const manifestPath = join(path, "package.json");
	if (!existsSync(manifestPath)) return;

	const text = readText(manifestPath);
	if (!text) return;
	scannedInstalledExtensions++;

	try {
		const manifest = JSON.parse(text);
		const id =
			`${String(manifest.publisher ?? "")}.${String(manifest.name ?? "")}`.toLowerCase();
		if (knownExtensionIds.has(id)) {
			add(
				"fail",
				"Known GlassWorm-linked extension is installed",
				manifestPath,
				id,
			);
		}

		const relationships = [
			...(Array.isArray(manifest.extensionPack) ? manifest.extensionPack : []),
			...(Array.isArray(manifest.extensionDependencies)
				? manifest.extensionDependencies
				: []),
		].map((value) => String(value).toLowerCase());

		if (relationships.length > 0) {
			extensionRelationshipFiles++;
		}

		for (const value of relationships) {
			if (knownExtensionIds.has(value)) {
				add(
					"fail",
					"Installed extension pulls a known GlassWorm-linked extension",
					manifestPath,
					`${id} -> ${value}`,
				);
			}
		}
	} catch {
		add(
			"warn",
			"Could not parse installed VS Code extension manifest",
			manifestPath,
		);
	}
}

for (const file of repoFiles()) {
	if (shouldScanFile(file)) scanRepoFile(file);
}

if (!repoOnly) {
	for (const root of extensionRoots()) {
		if (!existsSync(root)) continue;
		for (const entry of readdirSync(root, { withFileTypes: true })) {
			if (entry.isDirectory())
				scanInstalledExtensionDir(join(root, entry.name));
		}
	}
}

const failures = findings.filter((finding) => finding.severity === "fail");
const warnings = findings.filter((finding) => finding.severity === "warn");

console.log("GlassWorm supply-chain scan");
console.log(`Repo files scanned: ${scannedRepoFiles}`);
console.log(
	`Installed extensions scanned: ${repoOnly ? "skipped" : scannedInstalledExtensions}`,
);
console.log(`Files with variation selectors: ${variationSelectorFiles}`);
console.log(
	`Extension relationship manifests seen: ${extensionRelationshipFiles}`,
);

if (
	findings.length > 0 &&
	(verbose || failures.length > 0 || warnings.length > 0)
) {
	console.log("");
	for (const finding of findings) {
		const where = finding.path ? ` ${finding.path}` : "";
		const detail = finding.detail ? ` (${finding.detail})` : "";
		console.log(
			`[${finding.severity.toUpperCase()}] ${finding.message}${where}${detail}`,
		);
	}
}

if (failures.length > 0) {
	console.error("");
	console.error(
		`GlassWorm scan failed: ${failures.length} blocking finding(s).`,
	);
	process.exit(1);
}

console.log("");
console.log(
	warnings.length > 0
		? `GlassWorm scan completed with ${warnings.length} warning(s).`
		: "GlassWorm scan completed with no blocking findings.",
);
