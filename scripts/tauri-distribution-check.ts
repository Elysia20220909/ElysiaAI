import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

type FindingLevel = "pass" | "warn" | "blocker";

type Finding = {
	level: FindingLevel;
	area: string;
	message: string;
};

type DistributionPlatform = "windows" | "macos" | "linux";

type TauriConfig = {
	productName?: string;
	version?: string;
	identifier?: string;
	build?: {
		frontendDist?: string;
		devUrl?: string;
		beforeBuildCommand?: string;
	};
	app?: {
		windows?: Array<{ title?: string; width?: number; height?: number }>;
		security?: { csp?: string };
	};
	bundle?: {
		active?: boolean;
		targets?: string | string[];
		icon?: string[];
		resources?: string[];
	};
};

const args = new Set(Bun.argv.slice(2));
const root = process.cwd();
const strict = args.has("--strict");
const json = args.has("--json");
const allowLinuxGlibAdvisory = args.has("--allow-linux-glib-advisory");
const findings: Finding[] = [];

function argValue(name: string) {
	const prefix = `${name}=`;
	const inline = Bun.argv.slice(2).find((arg) => arg.startsWith(prefix));
	if (inline) {
		return inline.slice(prefix.length).trim();
	}
	const index = Bun.argv.indexOf(name);
	if (index >= 0) {
		return Bun.argv[index + 1]?.trim();
	}
	return "";
}

function platformArg(): DistributionPlatform | undefined {
	const value = argValue("--platform").toLowerCase();
	if (!value) {
		return undefined;
	}
	if (value === "windows" || value === "macos" || value === "linux") {
		return value;
	}
	add(
		"blocker",
		"platform",
		`Unsupported platform "${value}". Use windows, macos, or linux.`,
	);
	return undefined;
}

const platform = platformArg();

function add(level: FindingLevel, area: string, message: string) {
	findings.push({ level, area, message });
}

function existsFromRoot(path: string) {
	return existsSync(join(root, path));
}

function readText(path: string) {
	return readFileSync(join(root, path), "utf8");
}

function readJson<T>(path: string): T | undefined {
	try {
		return JSON.parse(readText(path)) as T;
	} catch (error) {
		add(
			"blocker",
			path,
			error instanceof Error ? error.message : "JSON parse failed",
		);
		return undefined;
	}
}

function tomlString(source: string, key: string) {
	const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
	return match?.[1]?.trim() || "";
}

function cargoLockVersion(source: string, packageName: string) {
	const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = source.match(
		new RegExp(
			`\\[\\[package\\]\\]\\s+name = "${escaped}"\\s+version = "([^"]+)"`,
			"m",
		),
	);
	return match?.[1]?.trim() || "";
}

function semverGte(version: string, minimum: string) {
	const toParts = (value: string) =>
		value
			.split(".")
			.map((part) => Number.parseInt(part.replace(/\D.*/, ""), 10) || 0);
	const current = toParts(version);
	const floor = toParts(minimum);
	for (let index = 0; index < Math.max(current.length, floor.length); index++) {
		const left = current[index] || 0;
		const right = floor[index] || 0;
		if (left > right) {
			return true;
		}
		if (left < right) {
			return false;
		}
	}
	return true;
}

function resourceBase(resource: string) {
	return normalize(resource.replace(/\/?\*\*\/\*$/, "").replace(/\/?\*$/, ""));
}

function checkFile(path: string, area: string, message: string) {
	if (existsFromRoot(path)) {
		add("pass", area, message);
		return true;
	}
	add("blocker", area, `${message}: missing ${path}`);
	return false;
}

function warnIfEnvMissing(names: string[], area: string, message: string) {
	const present = names.filter((name) => Boolean(Bun.env[name]));
	if (present.length === names.length) {
		add("pass", area, message);
		return;
	}
	add(
		"warn",
		area,
		`${message}: missing ${names.filter((name) => !Bun.env[name]).join(", ")}`,
	);
}

function checkWindowsDistribution() {
	checkFile("src-tauri/icons/icon.ico", "windows", "Windows icon is present");
	warnIfEnvMissing(
		["WINDOWS_CERTIFICATE", "WINDOWS_CERTIFICATE_PASSWORD"],
		"windows-signing",
		"Windows signing secrets are available",
	);
	add(
		"warn",
		"windows-signing",
		"Unsigned beta bundles are allowed only when release notes state the limitation",
	);
}

function checkMacosDistribution() {
	checkFile("src-tauri/icons/icon.icns", "macos", "macOS icon is present");
	warnIfEnvMissing(
		["APPLE_ID", "APPLE_PASSWORD", "APPLE_TEAM_ID"],
		"macos-notarization",
		"macOS notarization credentials are available",
	);
	add(
		"warn",
		"macos-notarization",
		"Unnotarized beta bundles are allowed only when release notes state the limitation",
	);
}

function checkLinuxDistribution() {
	checkFile(
		"docs/TAURI_GLIB_ADVISORY_2026-06-28.md",
		"linux-advisory",
		"glib advisory note is present",
	);
	if (!existsFromRoot("src-tauri/Cargo.lock")) {
		add(
			"blocker",
			"linux-advisory",
			"Cargo.lock is required for advisory gate",
		);
		return;
	}

	const lockfile = readText("src-tauri/Cargo.lock");
	const glibVersion = cargoLockVersion(lockfile, "glib");
	if (!glibVersion) {
		add("warn", "linux-advisory", "glib is not present in Cargo.lock");
		return;
	}
	if (semverGte(glibVersion, "0.20.0")) {
		add("pass", "linux-advisory", `glib ${glibVersion} is in patched range`);
		return;
	}
	const message = `glib ${glibVersion} is below 0.20.0 through the Linux GTK3/WebKit stack`;
	if (allowLinuxGlibAdvisory) {
		add(
			"warn",
			"linux-advisory",
			`${message}; explicit beta waiver flag was supplied`,
		);
		return;
	}
	add(
		"blocker",
		"linux-advisory",
		`${message}; use --allow-linux-glib-advisory only for documented beta waiver`,
	);
}

const config = readJson<TauriConfig>("src-tauri/tauri.conf.json");
checkFile("src-tauri/Cargo.toml", "tauri", "Cargo manifest is present");
checkFile("src-tauri/build.rs", "tauri", "Tauri build script is present");
checkFile("public/index.html", "frontend", "Static frontend entry is present");

if (config) {
	if (config.productName) {
		add("pass", "identity", `productName: ${config.productName}`);
	} else {
		add("blocker", "identity", "productName is required");
	}

	if (/^\d+\.\d+\.\d+/.test(config.version || "")) {
		add("pass", "identity", `version: ${config.version}`);
	} else {
		add("blocker", "identity", "version should be semver-like");
	}

	if (/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/.test(config.identifier || "")) {
		add("pass", "identity", `identifier: ${config.identifier}`);
	} else {
		add("blocker", "identity", "identifier should be reverse-DNS style");
	}

	const frontendDist = config.build?.frontendDist || "";
	if (frontendDist) {
		const frontendPath = normalize(join("src-tauri", frontendDist));
		checkFile(
			frontendPath,
			"frontend",
			`frontendDist resolves to ${frontendDist}`,
		);
	} else {
		add("blocker", "frontend", "build.frontendDist is required");
	}

	if (config.bundle?.active) {
		add("pass", "bundle", "bundle.active is true");
	} else {
		add("blocker", "bundle", "bundle.active should be true for distribution");
	}

	if (config.bundle?.targets) {
		add("pass", "bundle", `bundle.targets: ${String(config.bundle.targets)}`);
	} else {
		add("warn", "bundle", "bundle.targets is not set");
	}

	for (const icon of config.bundle?.icon || []) {
		checkFile(join("src-tauri", icon), "icons", `icon exists: ${icon}`);
	}

	for (const resource of config.bundle?.resources || []) {
		const base = normalize(join("src-tauri", resourceBase(resource)));
		checkFile(base, "resources", `resource base exists: ${resource}`);
	}

	const mainWindow = config.app?.windows?.[0];
	if (mainWindow?.title && mainWindow.width && mainWindow.height) {
		add(
			"pass",
			"window",
			`main window: ${mainWindow.title} (${mainWindow.width}x${mainWindow.height})`,
		);
	} else {
		add("warn", "window", "main window title and size should be explicit");
	}

	const csp = config.app?.security?.csp || "";
	if (!csp) {
		add("blocker", "security", "CSP is required for desktop distribution");
	} else {
		add("pass", "security", "CSP is configured");
		if (csp.includes("*")) {
			add("blocker", "security", "CSP should not contain wildcard sources");
		}
		for (const required of [
			"localhost:3000",
			"localhost:8000",
			"localhost:11434",
		]) {
			if (csp.includes(required)) {
				add("pass", "security", `CSP allows local service ${required}`);
			} else {
				add("warn", "security", `CSP does not mention ${required}`);
			}
		}
		if (csp.includes("'unsafe-inline'")) {
			add(
				"warn",
				"security",
				"CSP still allows unsafe-inline; acceptable for current static MVP, but tighten before store release",
			);
		}
	}
}

if (existsFromRoot("src-tauri/Cargo.toml")) {
	const cargo = readText("src-tauri/Cargo.toml");
	if (tomlString(cargo, "rust-version")) {
		add("pass", "rust", `rust-version: ${tomlString(cargo, "rust-version")}`);
	} else {
		add("warn", "rust", "rust-version should be pinned");
	}
	if (tomlString(cargo, "license")) {
		add("pass", "metadata", "Cargo license is set");
	} else {
		add("warn", "metadata", "Cargo license is empty; set before public bundle");
	}
	if (tomlString(cargo, "repository")) {
		add("pass", "metadata", "Cargo repository is set");
	} else {
		add(
			"warn",
			"metadata",
			"Cargo repository is empty; set before public bundle",
		);
	}
}

checkFile(
	"docs/THIRD_PARTY_NOTICES.md",
	"release",
	"Third-party notices are present",
);
checkFile(
	"docs/RELEASE_CHECKLIST.md",
	"release",
	"Release checklist is present",
);
checkFile(
	"docs/BETA_0_1_RELEASE_NOTES.md",
	"release",
	"Beta release notes are present",
);

if (existsFromRoot("src-tauri/target/release/bundle")) {
	add("pass", "artifacts", "Tauri bundle directory exists");
} else {
	add(
		"warn",
		"artifacts",
		"No local Tauri bundle directory yet; run desktop build only after review",
	);
}

if (platform === "windows") {
	checkWindowsDistribution();
}
if (platform === "macos") {
	checkMacosDistribution();
}
if (platform === "linux") {
	checkLinuxDistribution();
}

const counts = findings.reduce<Record<FindingLevel, number>>(
	(acc, finding) => {
		acc[finding.level] += 1;
		return acc;
	},
	{ pass: 0, warn: 0, blocker: 0 },
);

if (json) {
	console.log(
		JSON.stringify({ ok: counts.blocker === 0, counts, findings }, null, 2),
	);
} else {
	console.log(
		`Tauri distribution readiness${platform ? ` (${platform})` : ""}`,
	);
	console.log(
		`pass=${counts.pass} warn=${counts.warn} blocker=${counts.blocker}`,
	);
	for (const finding of findings) {
		const mark =
			finding.level === "pass"
				? "PASS"
				: finding.level === "warn"
					? "WARN"
					: "BLOCK";
		console.log(`[${mark}] ${finding.area}: ${finding.message}`);
	}
}

if (counts.blocker > 0 || (strict && counts.warn > 0)) {
	process.exit(1);
}
