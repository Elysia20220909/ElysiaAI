import { existsSync, type Stats } from "node:fs";
import {
	appendFile,
	mkdir,
	readdir,
	readFile,
	stat,
	writeFile,
} from "node:fs/promises";
import {
	basename,
	dirname,
	extname,
	isAbsolute,
	join,
	relative,
	resolve,
	sep,
} from "node:path";
import { config } from "../../../../src/config.ts";

export type MvpSearchResult = {
	path: string;
	line: number;
	score: number;
	snippet: string;
};

export type MvpRagContext = {
	context: string;
	sources: MvpSearchResult[];
};

export type MvpMemoryRecord = {
	id: string;
	sessionId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: string;
	sources?: string[];
};

export type MvpOllamaResult =
	| {
			ok: true;
			mode: "local-ollama";
			model: string;
			content: string;
	  }
	| {
			ok: false;
			mode: "local-ollama";
			model: string;
			error: string;
	  };

const DEFAULT_SEARCH_TARGETS = [
	"README.md",
	"README.ja.md",
	"docs",
	"prompts",
	"packages/server/src",
	"packages/shared/src",
	"python",
	"kernel",
];

const SEARCHABLE_EXTENSIONS = new Set([
	".css",
	".html",
	".js",
	".json",
	".md",
	".py",
	".rs",
	".toml",
	".ts",
	".tsx",
	".txt",
	".yml",
	".yaml",
]);

const EXCLUDED_PARTS = new Set([
	".git",
	".tmp",
	".venv",
	"backups",
	"build",
	"coverage",
	"dist",
	"logs",
	"node_modules",
	"out",
	"target",
	"uploads",
]);

const MAX_SEARCH_FILES = 600;
const MAX_FILE_BYTES = 160 * 1024;
const MAX_RESULT_COUNT = 8;

export function getWorkspaceRoot(start = process.cwd()): string {
	let current = resolve(process.env.ELYSIA_WORKSPACE_ROOT || start);

	while (true) {
		if (
			existsSync(join(current, ".git")) ||
			existsSync(join(current, "src-tauri", "tauri.conf.json")) ||
			(existsSync(join(current, "package.json")) &&
				existsSync(join(current, "packages")))
		) {
			return current;
		}

		const parent = dirname(current);
		if (parent === current) return resolve(start);
		current = parent;
	}
}

function normalizeForSearch(value: string): string {
	return value.toLowerCase().normalize("NFKC");
}

const JAPANESE_QUERY_EXPANSIONS: Array<[RegExp, string[]]> = [
	[/ローカル|local/i, ["local", "localhost", "private"]],
	[/オラマ|ollama/i, ["ollama", "local-ollama", "model"]],
	[/rag|検索拡張|文脈|参照/i, ["rag", "context", "source", "sources"]],
	[/ファイル検索|ファイル|探す|検索/i, ["file", "files", "search"]],
	[/メモリー|メモリ|記憶|memory/i, ["memory", "runtime"]],
	[
		/セキュリティ|監査|secret|secrets|脆弱性/i,
		["security", "audit", "gitleaks", "secret"],
	],
	[/mvp|現在地|状況|準備|完成/i, ["mvp", "readiness", "status"]],
	[
		/tauri|デスクトップ|windows|macos/i,
		["tauri", "desktop", "windows", "macos"],
	],
	[/毎日|日常|道具|使える/i, ["daily", "tool", "workflow", "local"]],
];

function addSearchTerm(terms: string[], term: string) {
	const normalized = normalizeForSearch(term).trim();
	if (normalized.length >= 2) terms.push(normalized);
}

function queryTerms(query: string): string[] {
	const original = normalizeForSearch(query).trim();
	if (!original) return [];

	const normalized = original.replace(/[^\p{L}\p{N}_-]+/gu, " ").trim();
	if (!normalized) return [];

	const terms: string[] = [];
	for (const term of normalized.split(/\s+/)) {
		addSearchTerm(terms, term);
	}

	for (const [pattern, expandedTerms] of JAPANESE_QUERY_EXPANSIONS) {
		if (!pattern.test(original)) continue;
		for (const term of expandedTerms) addSearchTerm(terms, term);
	}

	for (const run of original.match(/[\u3040-\u30ff\u3400-\u9fff]{2,}/g) || []) {
		addSearchTerm(terms, run);
		const compact = run.slice(0, 14);
		for (const width of [2, 3]) {
			for (let index = 0; index <= compact.length - width; index++) {
				addSearchTerm(terms, compact.slice(index, index + width));
				if (terms.length >= 30) break;
			}
			if (terms.length >= 30) break;
		}
	}

	return [...new Set(terms)].slice(0, 20);
}

function isInside(root: string, candidate: string): boolean {
	const rel = relative(root, candidate);
	return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function isExcludedPath(path: string): boolean {
	const parts = path.split(/[\\/]+/);
	if (parts.some((part) => EXCLUDED_PARTS.has(part))) return true;

	const name = basename(path).toLowerCase();
	if (
		name === ".env" ||
		name.startsWith(".env.") ||
		name.endsWith(".lock") ||
		name.endsWith(".map") ||
		name.includes("secret") ||
		name.includes("credential")
	) {
		return true;
	}

	return false;
}

async function collectSearchFiles(root: string): Promise<string[]> {
	const files: string[] = [];
	const queue = DEFAULT_SEARCH_TARGETS.map((target) => resolve(root, target));

	while (queue.length > 0 && files.length < MAX_SEARCH_FILES) {
		const current = queue.shift();
		if (!current || !isInside(root, current) || isExcludedPath(current))
			continue;

		let currentStat: Stats;
		try {
			currentStat = await stat(current);
		} catch {
			continue;
		}

		if (currentStat.isDirectory()) {
			const entries = await readdir(current, { withFileTypes: true });
			for (const entry of entries) {
				queue.push(join(current, entry.name));
			}
			continue;
		}

		if (
			currentStat.isFile() &&
			currentStat.size <= MAX_FILE_BYTES &&
			SEARCHABLE_EXTENSIONS.has(extname(current).toLowerCase())
		) {
			files.push(current);
		}
	}

	return files;
}

function scoreLine(line: string, terms: string[]): number {
	const normalized = normalizeForSearch(line);
	let score = 0;
	for (const term of terms) {
		if (normalized.includes(term)) score += term.length + 2;
	}
	return score;
}

export async function searchLocalWorkspace(
	query: string,
	options: { root?: string; limit?: number } = {},
): Promise<MvpSearchResult[]> {
	const root = resolve(options.root || getWorkspaceRoot());
	const terms = queryTerms(query);
	if (terms.length === 0) return [];

	const files = await collectSearchFiles(root);
	const results: MvpSearchResult[] = [];

	for (const file of files) {
		let text = "";
		try {
			text = await readFile(file, "utf8");
		} catch {
			continue;
		}

		const lines = text.split(/\r?\n/);
		for (let index = 0; index < lines.length; index++) {
			const score = scoreLine(lines[index] || "", terms);
			if (score <= 0) continue;

			const before = lines[index - 1]?.trim();
			const current = lines[index]?.trim() || "";
			const after = lines[index + 1]?.trim();
			const snippet = [before, current, after]
				.filter(Boolean)
				.join(" ")
				.slice(0, 320);

			results.push({
				path: relative(root, file).split(sep).join("/"),
				line: index + 1,
				score,
				snippet,
			});
		}
	}

	return results
		.sort(
			(left, right) =>
				right.score - left.score || left.path.localeCompare(right.path),
		)
		.slice(0, Math.max(1, Math.min(options.limit || MAX_RESULT_COUNT, 20)));
}

export async function buildLocalRagContext(
	query: string,
	options: { root?: string; limit?: number } = {},
): Promise<MvpRagContext> {
	const sources = await searchLocalWorkspace(query, {
		root: options.root,
		limit: options.limit || 5,
	});

	if (sources.length === 0) {
		return {
			context: "",
			sources,
		};
	}

	const context = sources
		.map((source) => `[${source.path}:${source.line}]\n${source.snippet}`)
		.join("\n\n");

	return { context, sources };
}

function isLocalOrPrivateHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	if (host === "localhost" || host === "::1") return true;
	if (host.startsWith("127.")) return true;
	if (host.startsWith("10.")) return true;
	if (host.startsWith("192.168.")) return true;
	return /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function resolveOllamaUrl(path: string): string {
	const base = new URL(config.ollamaBaseUrl);
	if (!isLocalOrPrivateHost(base.hostname)) {
		throw new Error(
			"OLLAMA_BASE_URL must point to localhost or a private LAN host",
		);
	}
	return new URL(path, base).toString();
}

export async function chatWithOllama(
	messages: Array<{ role: string; content: string }>,
	options: { model?: string; timeoutMs?: number } = {},
): Promise<MvpOllamaResult> {
	const model = options.model || config.ollamaModel;

	try {
		const abort = new AbortController();
		const timeout = setTimeout(() => abort.abort(), options.timeoutMs || 45000);

		const response = await fetch(resolveOllamaUrl("/api/chat"), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model,
				messages,
				stream: false,
				options: {
					temperature: 0.4,
				},
			}),
			signal: abort.signal,
		});
		clearTimeout(timeout);

		if (!response.ok) {
			return {
				ok: false,
				mode: "local-ollama",
				model,
				error: `Ollama returned ${response.status}`,
			};
		}

		const data = (await response.json()) as {
			message?: { content?: string };
			response?: string;
		};
		const content = (data.message?.content || data.response || "").trim();
		if (!content) {
			return {
				ok: false,
				mode: "local-ollama",
				model,
				error: "Ollama returned an empty message",
			};
		}

		return { ok: true, mode: "local-ollama", model, content };
	} catch (error) {
		return {
			ok: false,
			mode: "local-ollama",
			model,
			error: error instanceof Error ? error.message : "Ollama request failed",
		};
	}
}

export async function checkOllamaStatus(timeoutMs = 2000) {
	try {
		const abort = new AbortController();
		const timeout = setTimeout(() => abort.abort(), timeoutMs);
		const response = await fetch(resolveOllamaUrl("/api/tags"), {
			signal: abort.signal,
		});
		clearTimeout(timeout);

		if (!response.ok) {
			return {
				status: "down" as const,
				model: config.ollamaModel,
				error: `Ollama returned ${response.status}`,
			};
		}

		const data = (await response.json()) as {
			models?: Array<{ name?: string; model?: string }>;
		};
		const models = (data.models || [])
			.map((model) => model.name || model.model)
			.filter(Boolean) as string[];

		return {
			status: "up" as const,
			model: config.ollamaModel,
			models,
			modelAvailable:
				models.length === 0 ||
				models.some(
					(name) =>
						name === config.ollamaModel ||
						name.startsWith(`${config.ollamaModel}:`),
				),
		};
	} catch (error) {
		return {
			status: "down" as const,
			model: config.ollamaModel,
			error: error instanceof Error ? error.message : "Ollama status failed",
		};
	}
}

export function getMvpMemoryPath(root = getWorkspaceRoot()): string {
	return resolve(
		process.env.ELYSIA_MVP_MEMORY_PATH ||
			join(root, "data", "runtime", "mvp-memory.jsonl"),
	);
}

export async function appendMvpMemory(
	record: Omit<MvpMemoryRecord, "id" | "createdAt">,
	options: { root?: string } = {},
): Promise<MvpMemoryRecord> {
	const memory: MvpMemoryRecord = {
		...record,
		id: `mvp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
		content: record.content.slice(0, 4000),
		createdAt: new Date().toISOString(),
	};
	const path = getMvpMemoryPath(options.root);
	await mkdir(dirname(path), { recursive: true });
	await appendFile(path, `${JSON.stringify(memory)}\n`, "utf8");
	return memory;
}

export async function readRecentMvpMemory(
	sessionId: string,
	options: { root?: string; limit?: number } = {},
): Promise<MvpMemoryRecord[]> {
	const path = getMvpMemoryPath(options.root);
	const records = await readMvpMemoryRecords(path);
	const limit = Math.max(1, Math.min(options.limit || 8, 20));
	return records
		.filter((record) => record.sessionId === sessionId)
		.slice(-limit);
}

async function readMvpMemoryRecords(path: string): Promise<MvpMemoryRecord[]> {
	let text = "";
	try {
		text = await readFile(path, "utf8");
	} catch {
		return [];
	}

	return text
		.split(/\r?\n/)
		.filter(Boolean)
		.map((line) => {
			try {
				return JSON.parse(line) as MvpMemoryRecord;
			} catch {
				return null;
			}
		})
		.filter((record): record is MvpMemoryRecord => Boolean(record));
}

async function writeMvpMemoryRecords(path: string, records: MvpMemoryRecord[]) {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(
		path,
		records.length > 0
			? `${records.map((record) => JSON.stringify(record)).join("\n")}\n`
			: "",
		"utf8",
	);
}

export async function deleteMvpMemoryRecord(
	sessionId: string,
	id: string,
	options: { root?: string } = {},
): Promise<{ deleted: boolean; records: number }> {
	const path = getMvpMemoryPath(options.root);
	const records = await readMvpMemoryRecords(path);
	const nextRecords = records.filter(
		(record) => !(record.sessionId === sessionId && record.id === id),
	);
	if (nextRecords.length === records.length) {
		return { deleted: false, records: records.length };
	}

	await writeMvpMemoryRecords(path, nextRecords);
	return { deleted: true, records: nextRecords.length };
}

export async function clearMvpMemory(
	sessionId: string,
	options: { root?: string } = {},
): Promise<{ deleted: number; records: number }> {
	const path = getMvpMemoryPath(options.root);
	const records = await readMvpMemoryRecords(path);
	const nextRecords = records.filter(
		(record) => record.sessionId !== sessionId,
	);
	const deleted = records.length - nextRecords.length;
	if (deleted > 0) {
		await writeMvpMemoryRecords(path, nextRecords);
	}

	return { deleted, records: nextRecords.length };
}

export async function getMvpMemoryStats(options: { root?: string } = {}) {
	const path = getMvpMemoryPath(options.root);
	let text = "";
	try {
		text = await readFile(path, "utf8");
	} catch {
		return {
			path,
			exists: false,
			records: 0,
		};
	}

	return {
		path,
		exists: true,
		records: text.split(/\r?\n/).filter(Boolean).length,
	};
}
