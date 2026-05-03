import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export type NativeLiteLaneStatus = "ready" | "fallback" | "unavailable";

export interface NativeLiteLane {
	id: "rust" | "swift" | "bun";
	name: string;
	role: string;
	status: NativeLiteLaneStatus;
	detail: string;
	weight: "native" | "optional" | "fallback";
}

export interface NativeLiteBudget {
	id: string;
	label: string;
	path: string;
	bytes: number;
	files: number;
	truncated: boolean;
	action: string;
}

export interface NativeLiteSnapshot {
	codename: "NativeLiteLab";
	generatedAt: string;
	mode: "rust-swift-bun-hybrid";
	summary: string;
	score: number;
	lanes: NativeLiteLane[];
	budgets: NativeLiteBudget[];
	commands: string[];
	links: {
		lab: string;
		ops: string;
		tauri: string;
	};
}

type CollectNativeLiteOptions = {
	cwd?: string;
	now?: string;
	detectToolchains?: boolean;
	maxFilesPerBudget?: number;
};

const budgetTargets = [
	{
		id: "node-modules",
		label: "Node modules",
		path: "node_modules",
		action:
			"Keep Bun as the single package manager and avoid duplicate installs",
	},
	{
		id: "python-venv",
		label: "Python venv",
		path: ".venv",
		action: "Use dev:lite by default; reserve full embeddings for RAG work",
	},
	{
		id: "tauri-target",
		label: "Rust target",
		path: join("src-tauri", "target"),
		action: "Run cargo clean only when the desktop build cache is stale",
	},
	{
		id: "dist",
		label: "Build output",
		path: "dist",
		action: "Regenerate from source and keep committed artifacts intentional",
	},
	{
		id: "tmp",
		label: "Temporary logs",
		path: ".tmp",
		action: "Rotate local run logs after verification",
	},
	{
		id: "logs",
		label: "Runtime logs",
		path: "logs",
		action: "Keep debug logs local and prune old sessions",
	},
	{
		id: "uploads",
		label: "Uploads",
		path: "uploads",
		action: "Archive large media outside the repo when no longer active",
	},
	{
		id: "docs-archive",
		label: "Docs archive",
		path: join("docs", "archive"),
		action: "Compress long-lived research notes into short indexes",
	},
];

function commandExists(command: string) {
	const executable = process.platform === "win32" ? "where" : "which";
	const args = [command];
	const result = Bun.spawnSync([executable, ...args], {
		stdout: "ignore",
		stderr: "ignore",
	});
	return result.exitCode === 0;
}

function scanPathSize(path: string, maxFiles: number) {
	if (!existsSync(path)) {
		return { bytes: 0, files: 0, truncated: false };
	}

	const stack = [path];
	let bytes = 0;
	let files = 0;
	let truncated = false;

	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) continue;

		let entries: string[];
		try {
			entries = readdirSync(current);
		} catch {
			continue;
		}

		for (const entry of entries) {
			const fullPath = join(current, entry);
			let stats: ReturnType<typeof statSync>;
			try {
				stats = statSync(fullPath);
			} catch {
				continue;
			}

			if (stats.isDirectory()) {
				stack.push(fullPath);
				continue;
			}

			files += 1;
			bytes += stats.size;
			if (files >= maxFiles) {
				truncated = true;
				return { bytes, files, truncated };
			}
		}
	}

	return { bytes, files, truncated };
}

function resolveRepoCwd(cwd = process.cwd()) {
	if (basename(cwd).toLowerCase() === "server") {
		const parent = dirname(cwd);
		if (basename(parent).toLowerCase() === "packages") {
			return resolve(cwd, "..", "..");
		}
	}

	return cwd;
}

export function bytesToMiB(bytes: number) {
	return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

export function summarizeNativeLiteScore(
	budgets: Pick<NativeLiteBudget, "bytes" | "truncated">[],
	lanes: Pick<NativeLiteLane, "status">[],
) {
	const totalMiB = budgets.reduce(
		(sum, budget) => sum + bytesToMiB(budget.bytes),
		0,
	);
	const nativeBonus =
		lanes.filter((lane) => lane.status === "ready").length * 8;
	const fallbackBonus =
		lanes.filter((lane) => lane.status === "fallback").length * 4;
	const truncationPenalty =
		budgets.filter((budget) => budget.truncated).length * 3;
	const weightPenalty = Math.min(45, Math.floor(totalMiB / 500));

	return Math.max(
		25,
		Math.min(
			100,
			86 + nativeBonus + fallbackBonus - truncationPenalty - weightPenalty,
		),
	);
}

export function collectNativeLiteSnapshot(
	options: CollectNativeLiteOptions = {},
): NativeLiteSnapshot {
	const cwd = resolveRepoCwd(resolve(options.cwd ?? process.cwd()));
	const maxFilesPerBudget = options.maxFilesPerBudget ?? 2500;
	const detectToolchains = options.detectToolchains ?? true;
	const rustReady = detectToolchains ? commandExists("rustc") : true;
	const swiftReady = detectToolchains ? commandExists("swift") : false;

	const lanes: NativeLiteLane[] = [
		{
			id: "rust",
			name: "Rust Pulse Engine",
			role: "Fast local scan, desktop commands, memory-safe native kernels",
			status: rustReady ? "ready" : "unavailable",
			detail: rustReady
				? "Rust toolchain detected; Tauri native commands can be built once a linker is available"
				: "Rust compiler not found on PATH",
			weight: "native",
		},
		{
			id: "swift",
			name: "Swift Resonance Layer",
			role: "macOS-native scoring, Secure Enclave-ready hooks, animation math",
			status: swiftReady ? "ready" : "fallback",
			detail: swiftReady
				? "Swift compiler detected"
				: "Swift source is prepared; this Windows host uses Rust fallback math",
			weight: "optional",
		},
		{
			id: "bun",
			name: "Bun Fallback Surface",
			role: "Immediate web API and CLI snapshot without waiting for native builds",
			status: "ready",
			detail: "Live now through /api/native-lite and bun run native:lite",
			weight: "fallback",
		},
	];

	const budgets = budgetTargets.map((target) => {
		const absolutePath = join(cwd, target.path);
		const scan = scanPathSize(absolutePath, maxFilesPerBudget);
		return {
			id: target.id,
			label: target.label,
			path: target.path,
			bytes: scan.bytes,
			files: scan.files,
			truncated: scan.truncated,
			action: target.action,
		};
	});

	const score = summarizeNativeLiteScore(budgets, lanes);
	const biggest = budgets
		.slice()
		.sort((a, b) => b.bytes - a.bytes)
		.at(0);

	return {
		codename: "NativeLiteLab",
		generatedAt: options.now ?? new Date().toISOString(),
		mode: "rust-swift-bun-hybrid",
		summary: biggest
			? `${biggest.label} is the largest sampled weight at ${bytesToMiB(biggest.bytes)} MiB`
			: "Native lightweight lanes are ready",
		score,
		lanes,
		budgets,
		commands: [
			"bun scripts/manage.ts dev:lite",
			"bun run native:lite",
			"cargo fmt --manifest-path src-tauri/Cargo.toml",
			"bun run ops",
		],
		links: {
			lab: "/native-lite.html",
			ops: "/stark-ops.html",
			tauri: "/",
		},
	};
}
