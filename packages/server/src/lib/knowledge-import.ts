import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { Database } from "bun:sqlite";
import { config } from "../../../../src/config.ts";

export type KnowledgeSourceStatus = "ready" | "disabled";
export type KnowledgeSourceExtractor = "plain-text" | "pdf-text";

export type ImportedKnowledgeSource = {
	id: string;
	name: string;
	mimeType: string;
	size: number;
	userId: string;
	status: KnowledgeSourceStatus;
	extractor: KnowledgeSourceExtractor;
	chunkCount: number;
	createdAt: string;
	updatedAt: string;
};

export type ImportedKnowledgeChunk = {
	id: string;
	sourceId: string;
	sourceName: string;
	userId: string;
	content: string;
	lineStart: number;
	lineEnd: number;
	createdAt: string;
};

export type ImportedKnowledgeSearchResult = {
	path: string;
	line: number;
	score: number;
	snippet: string;
	sourceId: string;
	sourceType: "imported-knowledge";
};

type KnowledgeSourceRow = {
	id: string;
	ownerKey: string;
	name: string;
	mimeType: string;
	size: number;
	status: KnowledgeSourceStatus;
	extractor: KnowledgeSourceExtractor;
	chunkCount: number;
	extractedText?: string | null;
	createdAt: string;
	updatedAt: string;
};

type KnowledgeChunkRow = {
	id: string;
	sourceId: string;
	sourceName: string;
	ownerKey: string;
	content: string;
	lineStart?: number | null;
	lineEnd?: number | null;
	createdAt: string;
	ftsRank?: number | null;
};

const MAX_IMPORT_BYTES = 512 * 1024;
const MAX_CHUNK_CHARS = 1200;
const MAX_SOURCE_NAME = 160;
const FASTAPI_INDEX_TIMEOUT_MS = 3500;
const SUPPORTED_EXTENSIONS = new Set([
	".md",
	".markdown",
	".pdf",
	".txt",
	".text",
]);
const SUPPORTED_MIME_TYPES = new Set([
	"",
	"application/pdf",
	"application/octet-stream",
	"text/markdown",
	"text/plain",
]);

const dbCache = new Map<string, Database>();
const migratedLegacyRoots = new Set<string>();

function makeId(prefix: string) {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sha256(value: string | Buffer) {
	return createHash("sha256").update(value).digest("hex");
}

function normalizeForSearch(value: string): string {
	return value.toLowerCase().normalize("NFKC");
}

function addSearchTerm(terms: string[], term: string) {
	const normalized = normalizeForSearch(term).trim();
	if (normalized.length >= 2) terms.push(normalized);
}

function queryTerms(query: string): string[] {
	const original = normalizeForSearch(query).trim();
	if (!original) return [];

	const normalized = original.replace(/[^\p{L}\p{N}_-]+/gu, " ").trim();
	const terms: string[] = [];
	for (const term of normalized.split(/\s+/).filter(Boolean)) {
		addSearchTerm(terms, term);
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

function scoreText(text: string, terms: string[]): number {
	const normalized = normalizeForSearch(text);
	let score = 0;
	for (const term of terms) {
		if (normalized.includes(term)) score += term.length + 2;
	}
	return score;
}

function sanitizeSourceName(name: string): string {
	const safeName = basename(name || "knowledge.txt")
		.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
		.slice(0, MAX_SOURCE_NAME)
		.trim();
	return safeName || "knowledge.txt";
}

function assertSupportedDocument(name: string, mimeType: string, size: number) {
	if (size > MAX_IMPORT_BYTES) {
		throw new Error("Knowledge import supports files up to 512KB for now");
	}

	const extension = extname(name).toLowerCase();
	if (
		!SUPPORTED_EXTENSIONS.has(extension) &&
		!SUPPORTED_MIME_TYPES.has(mimeType)
	) {
		throw new Error("Knowledge import currently supports TXT, Markdown, and text PDFs");
	}
}

function isPdfDocument(name: string, mimeType = ""): boolean {
	return extname(name).toLowerCase() === ".pdf" || mimeType === "application/pdf";
}

function decodePdfLiteralString(input: string): string {
	const body = input.slice(1, -1);
	let output = "";
	for (let index = 0; index < body.length; index++) {
		const char = body[index];
		if (char !== "\\") {
			output += char;
			continue;
		}

		const next = body[++index];
		if (next === undefined) break;
		if (next === "n") output += "\n";
		else if (next === "r") output += "\r";
		else if (next === "t") output += "\t";
		else if (next === "b") output += "\b";
		else if (next === "f") output += "\f";
		else if (next === "\n") continue;
		else if (next === "\r") {
			if (body[index + 1] === "\n") index++;
		} else if (/[0-7]/.test(next)) {
			let octal = next;
			for (let count = 0; count < 2 && /[0-7]/.test(body[index + 1] || ""); count++) {
				octal += body[++index];
			}
			output += String.fromCharCode(Number.parseInt(octal, 8));
		} else {
			output += next;
		}
	}
	return output;
}

function decodePdfHexString(input: string): string {
	const hex = input.replace(/[<>\s]/g, "");
	const padded = hex.length % 2 === 0 ? hex : `${hex}0`;
	const bytes = Buffer.from(padded, "hex");
	if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
		let text = "";
		for (let index = 2; index + 1 < bytes.length; index += 2) {
			text += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
		}
		return text;
	}
	return bytes.toString("latin1").replace(/\u0000/g, "");
}

function decodePdfStringToken(token: string): string {
	return token.startsWith("(")
		? decodePdfLiteralString(token)
		: decodePdfHexString(token);
}

function extractPdfTextFromContentStream(stream: Buffer): string[] {
	const content = stream.toString("latin1");
	const pieces: string[] = [];
	const stringToken = String.raw`(?:\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>)`;

	for (const match of content.matchAll(new RegExp(`(${stringToken})\\s*Tj`, "g"))) {
		pieces.push(decodePdfStringToken(match[1]));
	}

	for (const match of content.matchAll(new RegExp(`\\[([\\s\\S]*?)\\]\\s*TJ`, "g"))) {
		const arrayBody = match[1];
		const text = [...arrayBody.matchAll(new RegExp(stringToken, "g"))]
			.map((tokenMatch) => decodePdfStringToken(tokenMatch[0]))
			.join("");
		if (text) pieces.push(text);
	}

	for (const match of content.matchAll(new RegExp(`(${stringToken})\\s*'`, "g"))) {
		pieces.push(decodePdfStringToken(match[1]));
	}

	for (const match of content.matchAll(new RegExp(`(?:-?\\d+(?:\\.\\d+)?\\s+){2}(${stringToken})\\s*"`, "g"))) {
		pieces.push(decodePdfStringToken(match[1]));
	}

	return pieces.map((piece) => piece.trim()).filter(Boolean);
}

function extractPdfText(buffer: Buffer): string {
	const binary = buffer.toString("latin1");
	const pieces: string[] = [];
	let cursor = 0;

	while (cursor < binary.length) {
		const streamMarker = binary.indexOf("stream", cursor);
		if (streamMarker === -1) break;
		let streamStart = streamMarker + "stream".length;
		if (binary[streamStart] === "\r" && binary[streamStart + 1] === "\n") {
			streamStart += 2;
		} else if (binary[streamStart] === "\n") {
			streamStart += 1;
		}

		const streamEnd = binary.indexOf("endstream", streamStart);
		if (streamEnd === -1) break;

		const dictStart = Math.max(0, binary.lastIndexOf("<<", streamMarker));
		const dictionary = binary.slice(dictStart, streamMarker);
		let stream = buffer.subarray(streamStart, streamEnd);
		if (stream.length >= 2 && stream[stream.length - 2] === 13 && stream[stream.length - 1] === 10) {
			stream = stream.subarray(0, stream.length - 2);
		} else if (stream.length >= 1 && (stream[stream.length - 1] === 10 || stream[stream.length - 1] === 13)) {
			stream = stream.subarray(0, stream.length - 1);
		}

		if (/\/FlateDecode\b/.test(dictionary)) {
			try {
				stream = inflateSync(stream);
			} catch {
				cursor = streamEnd + "endstream".length;
				continue;
			}
		}

		pieces.push(...extractPdfTextFromContentStream(stream));
		cursor = streamEnd + "endstream".length;
	}

	const text = pieces
		.join("\n")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	if (!text) {
		throw new Error("PDF text extraction found no selectable text. OCR support is not implemented yet");
	}
	return text;
}

function normalizeImportedText(content: string): string {
	return content
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.trim();
}

function buildChunks(
	source: ImportedKnowledgeSource,
	content: string,
): ImportedKnowledgeChunk[] {
	const lines = content.split("\n");
	const chunks: ImportedKnowledgeChunk[] = [];
	let currentLines: string[] = [];
	let currentStart = 1;
	let currentLength = 0;

	const flush = (lineEnd: number) => {
		const text = currentLines.join("\n").trim();
		if (!text) return;
		chunks.push({
			id: makeId("kchunk"),
			sourceId: source.id,
			sourceName: source.name,
			userId: source.userId,
			content: text,
			lineStart: currentStart,
			lineEnd,
			createdAt: source.createdAt,
		});
		currentLines = [];
		currentLength = 0;
		currentStart = lineEnd + 1;
	};

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index] || "";
		if (currentLines.length === 0) currentStart = index + 1;
		currentLines.push(line);
		currentLength += line.length + 1;

		if (currentLength >= MAX_CHUNK_CHARS) {
			flush(index + 1);
		}
	}

	flush(lines.length);
	return chunks;
}

export function getKnowledgeStoreDir(root: string): string {
	return resolve(root, "data", "runtime", "knowledge");
}

export function getKnowledgeDatabasePath(root: string): string {
	const dbUrl =
		process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:")
			? process.env.DATABASE_URL
			: `file:${join(root, "prisma", "dev.db")}`;
	const rawPath = dbUrl.slice("file:".length);
	return isAbsolute(rawPath) ? rawPath : resolve(root, rawPath);
}

function getSourcesPath(root: string): string {
	return join(getKnowledgeStoreDir(root), "sources.json");
}

function getChunksPath(root: string): string {
	return join(getKnowledgeStoreDir(root), "chunks.jsonl");
}

function getSourceTextPath(root: string, sourceId: string): string {
	return join(getKnowledgeStoreDir(root), "source-text", `${sourceId}.txt`);
}

function ensureColumn(db: Database, table: string, column: string, ddl: string) {
	const columns = db.query(`PRAGMA table_info("${table}")`).all() as Array<{
		name: string;
	}>;
	if (columns.some((candidate) => candidate.name === column)) return;
	db.exec(`ALTER TABLE "${table}" ADD COLUMN ${ddl}`);
}

function ensureKnowledgeSchema(db: Database) {
	db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "knowledge_sources" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"ownerKey" TEXT NOT NULL,
	"userId" TEXT,
	"projectId" TEXT,
	"name" TEXT NOT NULL,
	"mimeType" TEXT NOT NULL,
	"size" INTEGER NOT NULL,
	"status" TEXT NOT NULL DEFAULT 'ready',
	"extractor" TEXT NOT NULL DEFAULT 'plain-text',
	"storagePath" TEXT,
	"extractedText" TEXT,
	"sourceHash" TEXT,
	"chunkCount" INTEGER NOT NULL DEFAULT 0,
	"lastIndexedAt" DATETIME,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "document_chunks" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"sourceId" TEXT NOT NULL,
	"ownerKey" TEXT NOT NULL,
	"userId" TEXT,
	"projectId" TEXT,
	"chunkIndex" INTEGER NOT NULL,
	"path" TEXT,
	"heading" TEXT,
	"content" TEXT NOT NULL,
	"contentHash" TEXT,
	"lineStart" INTEGER,
	"lineEnd" INTEGER,
	"tokenCount" INTEGER,
	"embeddingKey" TEXT,
	"vectorStatus" TEXT NOT NULL DEFAULT 'pending',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "embedding_jobs" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"sourceId" TEXT NOT NULL,
	"ownerKey" TEXT NOT NULL,
	"userId" TEXT,
	"projectId" TEXT,
	"status" TEXT NOT NULL DEFAULT 'queued',
	"backend" TEXT NOT NULL DEFAULT 'sentence-transformers',
	"model" TEXT,
	"vectorStore" TEXT NOT NULL DEFAULT 'milvus-lite',
	"error" TEXT,
	"startedAt" DATETIME,
	"completedAt" DATETIME,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "knowledge_sources_ownerKey_idx" ON "knowledge_sources"("ownerKey");
CREATE INDEX IF NOT EXISTS "knowledge_sources_userId_idx" ON "knowledge_sources"("userId");
CREATE INDEX IF NOT EXISTS "knowledge_sources_status_idx" ON "knowledge_sources"("status");
CREATE INDEX IF NOT EXISTS "document_chunks_ownerKey_idx" ON "document_chunks"("ownerKey");
CREATE UNIQUE INDEX IF NOT EXISTS "document_chunks_sourceId_chunkIndex_key" ON "document_chunks"("sourceId", "chunkIndex");
CREATE INDEX IF NOT EXISTS "document_chunks_sourceId_idx" ON "document_chunks"("sourceId");
CREATE INDEX IF NOT EXISTS "document_chunks_vectorStatus_idx" ON "document_chunks"("vectorStatus");
CREATE INDEX IF NOT EXISTS "embedding_jobs_sourceId_idx" ON "embedding_jobs"("sourceId");
CREATE INDEX IF NOT EXISTS "embedding_jobs_ownerKey_idx" ON "embedding_jobs"("ownerKey");
CREATE INDEX IF NOT EXISTS "embedding_jobs_status_idx" ON "embedding_jobs"("status");

CREATE VIRTUAL TABLE IF NOT EXISTS "document_chunks_fts" USING fts5(
	"chunkId" UNINDEXED,
	"sourceId" UNINDEXED,
	"sourceName",
	"content",
	tokenize = 'unicode61'
);

CREATE TRIGGER IF NOT EXISTS "document_chunks_ai" AFTER INSERT ON "document_chunks" BEGIN
	INSERT INTO "document_chunks_fts"("rowid", "chunkId", "sourceId", "sourceName", "content")
	VALUES (
		new.rowid,
		new."id",
		new."sourceId",
		COALESCE((SELECT "name" FROM "knowledge_sources" WHERE "id" = new."sourceId"), ''),
		new."content"
	);
END;

CREATE TRIGGER IF NOT EXISTS "document_chunks_ad" AFTER DELETE ON "document_chunks" BEGIN
	DELETE FROM "document_chunks_fts" WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "document_chunks_au" AFTER UPDATE ON "document_chunks" BEGIN
	DELETE FROM "document_chunks_fts" WHERE rowid = old.rowid;
	INSERT INTO "document_chunks_fts"("rowid", "chunkId", "sourceId", "sourceName", "content")
	VALUES (
		new.rowid,
		new."id",
		new."sourceId",
		COALESCE((SELECT "name" FROM "knowledge_sources" WHERE "id" = new."sourceId"), ''),
		new."content"
	);
END;
`);

	ensureColumn(db, "knowledge_sources", "ownerKey", `"ownerKey" TEXT`);
	ensureColumn(db, "knowledge_sources", "extractedText", `"extractedText" TEXT`);
	ensureColumn(db, "document_chunks", "ownerKey", `"ownerKey" TEXT`);
	ensureColumn(db, "embedding_jobs", "ownerKey", `"ownerKey" TEXT`);
}

function getKnowledgeDb(root: string): Database {
	const dbPath = getKnowledgeDatabasePath(root);
	const existing = dbCache.get(dbPath);
	if (existing) return existing;

	mkdirSync(dirname(dbPath), { recursive: true });
	const db = new Database(dbPath);
	ensureKnowledgeSchema(db);
	dbCache.set(dbPath, db);
	return db;
}

export function closeKnowledgeDatabases(root?: string) {
	if (root) {
		const dbPath = getKnowledgeDatabasePath(root);
		const db = dbCache.get(dbPath);
		if (!db) return;
		try {
			db.exec("PRAGMA optimize; PRAGMA wal_checkpoint(TRUNCATE);");
		} catch {
			// Best effort cleanup for Windows test file locks.
		}
		db.close();
		dbCache.delete(dbPath);
		migratedLegacyRoots.delete(root);
		return;
	}

	for (const [dbPath, db] of dbCache) {
		try {
			db.exec("PRAGMA optimize; PRAGMA wal_checkpoint(TRUNCATE);");
		} catch {
			// Best effort cleanup for Windows test file locks.
		}
		db.close();
		dbCache.delete(dbPath);
	}
	migratedLegacyRoots.clear();
}

function sourceFromRow(row: KnowledgeSourceRow): ImportedKnowledgeSource {
	return {
		id: row.id,
		name: row.name,
		mimeType: row.mimeType,
		size: Number(row.size),
		userId: row.ownerKey,
		status: row.status,
		extractor: row.extractor,
		chunkCount: Number(row.chunkCount || 0),
		createdAt: String(row.createdAt),
		updatedAt: String(row.updatedAt),
	};
}

function chunkFromRow(row: KnowledgeChunkRow): ImportedKnowledgeChunk {
	return {
		id: row.id,
		sourceId: row.sourceId,
		sourceName: row.sourceName,
		userId: row.ownerKey,
		content: row.content,
		lineStart: Number(row.lineStart || 1),
		lineEnd: Number(row.lineEnd || row.lineStart || 1),
		createdAt: String(row.createdAt),
	};
}

async function readLegacySources(root: string): Promise<ImportedKnowledgeSource[]> {
	try {
		return JSON.parse(await readFile(getSourcesPath(root), "utf8"));
	} catch {
		return [];
	}
}

async function readLegacyChunks(root: string): Promise<ImportedKnowledgeChunk[]> {
	try {
		const text = await readFile(getChunksPath(root), "utf8");
		return text
			.split(/\r?\n/)
			.filter(Boolean)
			.map((line) => {
				try {
					return JSON.parse(line) as ImportedKnowledgeChunk;
				} catch {
					return null;
				}
			})
			.filter((chunk): chunk is ImportedKnowledgeChunk => Boolean(chunk));
	} catch {
		return [];
	}
}

async function legacySourceText(
	root: string,
	source: ImportedKnowledgeSource,
	chunks: ImportedKnowledgeChunk[],
) {
	try {
		return await readFile(getSourceTextPath(root, source.id), "utf8");
	} catch {
		return chunks
			.filter((chunk) => chunk.sourceId === source.id)
			.sort((left, right) => left.lineStart - right.lineStart)
			.map((chunk) => chunk.content)
			.join("\n\n");
	}
}

async function migrateLegacyFileStore(root: string) {
	if (migratedLegacyRoots.has(root)) return;
	migratedLegacyRoots.add(root);
	if (!existsSync(getSourcesPath(root))) return;

	const sources = await readLegacySources(root);
	if (sources.length === 0) return;

	const legacyChunks = await readLegacyChunks(root);
	const db = getKnowledgeDb(root);
	const insertLegacy = db.transaction(
		(source: ImportedKnowledgeSource, chunks: ImportedKnowledgeChunk[], text: string) => {
			const existing = db
				.query('SELECT "id" FROM "knowledge_sources" WHERE "id" = ?')
				.get(source.id);
			if (existing) return;

			db.prepare(`
INSERT INTO "knowledge_sources"
("id", "ownerKey", "userId", "projectId", "name", "mimeType", "size", "status", "extractor", "storagePath", "extractedText", "sourceHash", "chunkCount", "lastIndexedAt", "createdAt", "updatedAt")
VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
`).run(
				source.id,
				source.userId,
				source.name,
				source.mimeType,
				source.size,
				source.status,
				source.extractor,
				text,
				sha256(text),
				chunks.length,
				source.updatedAt,
				source.createdAt,
				source.updatedAt,
			);

			for (let index = 0; index < chunks.length; index++) {
				const chunk = chunks[index];
				db.prepare(`
INSERT INTO "document_chunks"
("id", "sourceId", "ownerKey", "userId", "projectId", "chunkIndex", "path", "heading", "content", "contentHash", "lineStart", "lineEnd", "tokenCount", "embeddingKey", "vectorStatus", "createdAt", "updatedAt")
VALUES (?, ?, ?, NULL, NULL, ?, ?, NULL, ?, ?, ?, ?, NULL, NULL, 'pending', ?, ?)
`).run(
					chunk.id,
					source.id,
					source.userId,
					index,
					`knowledge/${source.name}`,
					chunk.content,
					sha256(chunk.content),
					chunk.lineStart,
					chunk.lineEnd,
					chunk.createdAt,
					source.updatedAt,
				);
			}
		},
	);

	for (const source of sources) {
		const chunks = legacyChunks.filter((chunk) => chunk.sourceId === source.id);
		insertLegacy(source, chunks, await legacySourceText(root, source, chunks));
	}
}

function insertChunks(
	db: Database,
	source: ImportedKnowledgeSource,
	chunks: ImportedKnowledgeChunk[],
	vectorStatus: "pending" | "queued" | "indexed" = "pending",
) {
	for (let index = 0; index < chunks.length; index++) {
		const chunk = chunks[index];
		db.prepare(`
INSERT INTO "document_chunks"
("id", "sourceId", "ownerKey", "userId", "projectId", "chunkIndex", "path", "heading", "content", "contentHash", "lineStart", "lineEnd", "tokenCount", "embeddingKey", "vectorStatus", "createdAt", "updatedAt")
VALUES (?, ?, ?, NULL, NULL, ?, ?, NULL, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
`).run(
			chunk.id,
			source.id,
			source.userId,
			index,
			`knowledge/${source.name}`,
			chunk.content,
			sha256(chunk.content),
			chunk.lineStart,
			chunk.lineEnd,
			vectorStatus,
			chunk.createdAt,
			source.updatedAt,
		);
	}
}

function shouldUseFastApiIndex() {
	return process.env.ELYSIA_KNOWLEDGE_INDEX_FASTAPI === "1";
}

function shouldUseFastApiExtraction() {
	return process.env.ELYSIA_KNOWLEDGE_EXTRACT_FASTAPI === "1";
}

async function extractWithFastApi({
	name,
	mimeType,
	content,
}: {
	name: string;
	mimeType: string;
	content: Buffer;
}): Promise<{ text: string; extractor: KnowledgeSourceExtractor } | null> {
	if (!shouldUseFastApiExtraction()) return null;

	const abort = new AbortController();
	const timeout = setTimeout(() => abort.abort(), FASTAPI_INDEX_TIMEOUT_MS);
	try {
		const response = await fetch(`${config.fastApiBaseUrl}/knowledge/extract`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				...(config.fastApiApiKey ? { "X-API-Key": config.fastApiApiKey } : {}),
			},
			body: JSON.stringify({
				name,
				mime_type: mimeType,
				content_base64: content.toString("base64"),
			}),
			signal: abort.signal,
		});
		clearTimeout(timeout);
		if (!response.ok) return null;
		const result = (await response.json()) as {
			text?: string;
			extractor?: KnowledgeSourceExtractor;
		};
		if (!result.text) return null;
		return {
			text: result.text,
			extractor: result.extractor || "plain-text",
		};
	} catch {
		clearTimeout(timeout);
		return null;
	}
}

function updateEmbeddingJobStatus({
	root,
	jobId,
	status,
	error,
}: {
	root: string;
	jobId: string;
	status: "running" | "completed" | "failed" | "skipped";
	error?: string;
}) {
	const db = getKnowledgeDb(root);
	const now = new Date().toISOString();
	db.prepare(`
UPDATE "embedding_jobs"
SET "status" = ?, "error" = ?, "startedAt" = COALESCE("startedAt", ?), "completedAt" = ?, "updatedAt" = ?
WHERE "id" = ?
`).run(status, error || null, now, status === "running" ? null : now, now, jobId);
}

function markChunksVectorStatus({
	root,
	sourceId,
	status,
}: {
	root: string;
	sourceId: string;
	status: "queued" | "indexed" | "failed" | "pending";
}) {
	const db = getKnowledgeDb(root);
	db.prepare(`
UPDATE "document_chunks"
SET "vectorStatus" = ?, "updatedAt" = ?
WHERE "sourceId" = ?
`).run(status, new Date().toISOString(), sourceId);
}

async function queueFastApiKnowledgeIndex({
	root,
	source,
	chunks,
	jobId,
}: {
	root: string;
	source: ImportedKnowledgeSource;
	chunks: ImportedKnowledgeChunk[];
	jobId: string;
}) {
	if (!shouldUseFastApiIndex()) {
		updateEmbeddingJobStatus({ root, jobId, status: "skipped" });
		return;
	}

	updateEmbeddingJobStatus({ root, jobId, status: "running" });
	markChunksVectorStatus({ root, sourceId: source.id, status: "queued" });

	const abort = new AbortController();
	const timeout = setTimeout(() => abort.abort(), FASTAPI_INDEX_TIMEOUT_MS);
	try {
		const response = await fetch(`${config.fastApiBaseUrl}/knowledge/index`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				...(config.fastApiApiKey ? { "X-API-Key": config.fastApiApiKey } : {}),
			},
			body: JSON.stringify({
				source_id: source.id,
				source_name: source.name,
				owner_key: source.userId,
				chunks: chunks.map((chunk) => ({
					chunk_id: chunk.id,
					content: chunk.content,
					path: `knowledge/${source.name}`,
					line_start: chunk.lineStart,
					line_end: chunk.lineEnd,
				})),
			}),
			signal: abort.signal,
		});
		clearTimeout(timeout);

		if (!response.ok) {
			throw new Error(`FastAPI knowledge index returned ${response.status}`);
		}

		const result = (await response.json().catch(() => ({}))) as {
			status?: string;
			indexed?: number;
		};
		const completed = result.status !== "error";
		updateEmbeddingJobStatus({
			root,
			jobId,
			status: completed ? "completed" : "failed",
			error: completed ? undefined : "FastAPI knowledge index returned error",
		});
		markChunksVectorStatus({
			root,
			sourceId: source.id,
			status: completed ? "indexed" : "failed",
		});
	} catch (error) {
		clearTimeout(timeout);
		updateEmbeddingJobStatus({
			root,
			jobId,
			status: "failed",
			error: error instanceof Error ? error.message : "FastAPI index failed",
		});
		markChunksVectorStatus({ root, sourceId: source.id, status: "failed" });
	}
}

export async function importKnowledgeDocument({
	root,
	userId,
	name,
	mimeType,
	content,
}: {
	root: string;
	userId: string;
	name: string;
	mimeType?: string;
	content: string | Buffer;
}): Promise<{
	source: ImportedKnowledgeSource;
	chunks: ImportedKnowledgeChunk[];
}> {
	await migrateLegacyFileStore(root);
	const safeName = sanitizeSourceName(name);
	const rawBuffer = Buffer.isBuffer(content)
		? content
		: Buffer.from(content, "utf8");
	const byteSize = rawBuffer.byteLength;
	assertSupportedDocument(safeName, mimeType || "", byteSize);
	const extractor: KnowledgeSourceExtractor = isPdfDocument(safeName, mimeType)
		? "pdf-text"
		: "plain-text";
	const fastApiExtraction = await extractWithFastApi({
		name: safeName,
		mimeType: mimeType || "",
		content: rawBuffer,
	});
	const finalExtractor = fastApiExtraction?.extractor || extractor;
	const extractedText = fastApiExtraction?.text
		? fastApiExtraction.text
		: finalExtractor === "pdf-text"
			? extractPdfText(rawBuffer)
			: rawBuffer.toString("utf8");
	const normalizedText = normalizeImportedText(extractedText);
	if (!normalizedText) throw new Error("Knowledge document is empty");

	const now = new Date().toISOString();
	const source: ImportedKnowledgeSource = {
		id: makeId("ksrc"),
		name: safeName,
		mimeType: mimeType || "text/plain",
		size: byteSize,
		userId,
		status: "ready",
		extractor: finalExtractor,
		chunkCount: 0,
		createdAt: now,
		updatedAt: now,
	};
	const chunks = buildChunks(source, normalizedText);
	source.chunkCount = chunks.length;
	const db = getKnowledgeDb(root);
	const jobId = makeId("embjob");

	const save = db.transaction(() => {
		db.prepare(`
INSERT INTO "knowledge_sources"
("id", "ownerKey", "userId", "projectId", "name", "mimeType", "size", "status", "extractor", "storagePath", "extractedText", "sourceHash", "chunkCount", "lastIndexedAt", "createdAt", "updatedAt")
VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
`).run(
			source.id,
			userId,
			source.name,
			source.mimeType,
			source.size,
			source.status,
			source.extractor,
			normalizedText,
			sha256(rawBuffer),
			source.chunkCount,
			now,
			source.createdAt,
			source.updatedAt,
		);
		insertChunks(db, source, chunks, shouldUseFastApiIndex() ? "queued" : "pending");
		db.prepare(`
INSERT INTO "embedding_jobs"
("id", "sourceId", "ownerKey", "userId", "projectId", "status", "backend", "model", "vectorStore", "error", "startedAt", "completedAt", "createdAt", "updatedAt")
VALUES (?, ?, ?, NULL, NULL, ?, 'sentence-transformers', NULL, 'milvus-lite', NULL, NULL, NULL, ?, ?)
`).run(
			jobId,
			source.id,
			userId,
			shouldUseFastApiIndex() ? "queued" : "skipped",
			now,
			now,
		);
	});
	save();

	if (shouldUseFastApiIndex()) {
		void queueFastApiKnowledgeIndex({ root, source, chunks, jobId });
	}

	return { source, chunks };
}

export async function listKnowledgeSources({
	root,
	userId,
	includeDisabled = false,
}: {
	root: string;
	userId?: string;
	includeDisabled?: boolean;
}): Promise<ImportedKnowledgeSource[]> {
	await migrateLegacyFileStore(root);
	const db = getKnowledgeDb(root);
	const rows = db
		.query(`
SELECT "id", COALESCE("ownerKey", "userId", '') AS "ownerKey", "name", "mimeType", "size", "status", "extractor", "chunkCount", "createdAt", "updatedAt"
FROM "knowledge_sources"
WHERE (? IS NULL OR "ownerKey" = ?)
AND (? = 1 OR "status" != 'disabled')
ORDER BY "updatedAt" DESC, "createdAt" DESC
`)
		.all(userId || null, userId || null, includeDisabled ? 1 : 0) as KnowledgeSourceRow[];
	return rows.map(sourceFromRow);
}

export async function deleteKnowledgeSource({
	root,
	sourceId,
	userId,
}: {
	root: string;
	sourceId: string;
	userId: string;
}): Promise<{ deleted: boolean; source?: ImportedKnowledgeSource }> {
	await migrateLegacyFileStore(root);
	const db = getKnowledgeDb(root);
	const row = db
		.query(`
SELECT "id", COALESCE("ownerKey", "userId", '') AS "ownerKey", "name", "mimeType", "size", "status", "extractor", "chunkCount", "createdAt", "updatedAt"
FROM "knowledge_sources"
WHERE "id" = ? AND "ownerKey" = ?
`)
		.get(sourceId, userId) as KnowledgeSourceRow | undefined;
	if (!row) return { deleted: false };

	const source = sourceFromRow(row);
	const remove = db.transaction(() => {
		db.prepare('DELETE FROM "document_chunks" WHERE "sourceId" = ?').run(sourceId);
		db.prepare('DELETE FROM "embedding_jobs" WHERE "sourceId" = ?').run(sourceId);
		db.prepare('DELETE FROM "knowledge_sources" WHERE "id" = ?').run(sourceId);
	});
	remove();
	await rm(getSourceTextPath(root, sourceId), { force: true });
	return { deleted: true, source };
}

export async function setKnowledgeSourceStatus({
	root,
	sourceId,
	userId,
	status,
}: {
	root: string;
	sourceId: string;
	userId: string;
	status: KnowledgeSourceStatus;
}): Promise<{ updated: boolean; source?: ImportedKnowledgeSource }> {
	await migrateLegacyFileStore(root);
	const db = getKnowledgeDb(root);
	const now = new Date().toISOString();
	const result = db
		.prepare(`
UPDATE "knowledge_sources"
SET "status" = ?, "updatedAt" = ?
WHERE "id" = ? AND "ownerKey" = ?
`)
		.run(status, now, sourceId, userId);
	if (Number(result.changes || 0) === 0) return { updated: false };

	const row = db
		.query(`
SELECT "id", COALESCE("ownerKey", "userId", '') AS "ownerKey", "name", "mimeType", "size", "status", "extractor", "chunkCount", "createdAt", "updatedAt"
FROM "knowledge_sources"
WHERE "id" = ? AND "ownerKey" = ?
`)
		.get(sourceId, userId) as KnowledgeSourceRow;
	return { updated: true, source: sourceFromRow(row) };
}

export async function reindexKnowledgeSource({
	root,
	sourceId,
	userId,
}: {
	root: string;
	sourceId: string;
	userId: string;
}): Promise<{
	reindexed: boolean;
	source?: ImportedKnowledgeSource;
	chunks?: ImportedKnowledgeChunk[];
}> {
	await migrateLegacyFileStore(root);
	const db = getKnowledgeDb(root);
	const row = db
		.query(`
SELECT "id", COALESCE("ownerKey", "userId", '') AS "ownerKey", "name", "mimeType", "size", "status", "extractor", "chunkCount", "extractedText", "createdAt", "updatedAt"
FROM "knowledge_sources"
WHERE "id" = ? AND "ownerKey" = ?
`)
		.get(sourceId, userId) as KnowledgeSourceRow | undefined;
	if (!row) return { reindexed: false };

	let content = row.extractedText || "";
	if (!content) {
		try {
			content = await readFile(getSourceTextPath(root, sourceId), "utf8");
		} catch {
			const chunkRows = db
				.query(`
SELECT c."id", c."sourceId", s."name" AS "sourceName", c."ownerKey", c."content", c."lineStart", c."lineEnd", c."createdAt"
FROM "document_chunks" c
JOIN "knowledge_sources" s ON s."id" = c."sourceId"
WHERE c."sourceId" = ?
ORDER BY c."chunkIndex" ASC
`)
				.all(sourceId) as KnowledgeChunkRow[];
			content = chunkRows.map((chunk) => chunk.content).join("\n\n");
		}
	}

	const normalizedText = normalizeImportedText(content);
	if (!normalizedText) throw new Error("Knowledge source has no stored text to reindex");

	const now = new Date().toISOString();
	const source = sourceFromRow({
		...row,
		chunkCount: 0,
		updatedAt: now,
	});
	const chunks = buildChunks(source, normalizedText);
	source.chunkCount = chunks.length;
	const jobId = makeId("embjob");

	const update = db.transaction(() => {
		db.prepare('DELETE FROM "document_chunks" WHERE "sourceId" = ?').run(sourceId);
		db.prepare(`
UPDATE "knowledge_sources"
SET "extractedText" = ?, "sourceHash" = ?, "chunkCount" = ?, "lastIndexedAt" = ?, "updatedAt" = ?
WHERE "id" = ?
`).run(normalizedText, sha256(normalizedText), chunks.length, now, now, sourceId);
		insertChunks(db, source, chunks, shouldUseFastApiIndex() ? "queued" : "pending");
		db.prepare(`
INSERT INTO "embedding_jobs"
("id", "sourceId", "ownerKey", "userId", "projectId", "status", "backend", "model", "vectorStore", "error", "startedAt", "completedAt", "createdAt", "updatedAt")
VALUES (?, ?, ?, NULL, NULL, ?, 'sentence-transformers', NULL, 'milvus-lite', NULL, NULL, NULL, ?, ?)
`).run(
			jobId,
			source.id,
			userId,
			shouldUseFastApiIndex() ? "queued" : "skipped",
			now,
			now,
		);
	});
	update();

	if (shouldUseFastApiIndex()) {
		void queueFastApiKnowledgeIndex({ root, source, chunks, jobId });
	}
	return { reindexed: true, source, chunks };
}

function buildFtsQuery(terms: string[]): string {
	return terms
		.filter((term) => /^[a-z0-9_-]+$/i.test(term))
		.map((term) => `"${term.replace(/"/g, '""')}"`)
		.join(" OR ");
}

function searchDbCandidates({
	db,
	userId,
	terms,
	limit,
}: {
	db: Database;
	userId?: string;
	terms: string[];
	limit: number;
}): KnowledgeChunkRow[] {
	const ftsQuery = buildFtsQuery(terms);
	if (ftsQuery) {
		const rows = db
			.query(`
SELECT c."id", c."sourceId", s."name" AS "sourceName", c."ownerKey", c."content", c."lineStart", c."lineEnd", c."createdAt", bm25("document_chunks_fts") AS "ftsRank"
FROM "document_chunks_fts"
JOIN "document_chunks" c ON c."id" = "document_chunks_fts"."chunkId"
JOIN "knowledge_sources" s ON s."id" = c."sourceId"
WHERE "document_chunks_fts" MATCH ?
AND s."status" != 'disabled'
AND (? IS NULL OR c."ownerKey" = ?)
ORDER BY "ftsRank" ASC
LIMIT ?
`)
			.all(ftsQuery, userId || null, userId || null, limit * 4) as KnowledgeChunkRow[];
		if (rows.length > 0) return rows;
	}

	return db
		.query(`
SELECT c."id", c."sourceId", s."name" AS "sourceName", c."ownerKey", c."content", c."lineStart", c."lineEnd", c."createdAt", NULL AS "ftsRank"
FROM "document_chunks" c
JOIN "knowledge_sources" s ON s."id" = c."sourceId"
WHERE s."status" != 'disabled'
AND (? IS NULL OR c."ownerKey" = ?)
ORDER BY s."updatedAt" DESC, c."chunkIndex" ASC
LIMIT ?
`)
		.all(userId || null, userId || null, limit * 12) as KnowledgeChunkRow[];
}

export async function searchImportedKnowledge(
	query: string,
	options: { root: string; userId?: string; limit?: number },
): Promise<ImportedKnowledgeSearchResult[]> {
	await migrateLegacyFileStore(options.root);
	const terms = queryTerms(query);
	if (terms.length === 0) return [];

	const db = getKnowledgeDb(options.root);
	const limit = Math.max(1, Math.min(options.limit || 8, 20));
	const candidates = searchDbCandidates({
		db,
		userId: options.userId,
		terms,
		limit,
	});
	const results: ImportedKnowledgeSearchResult[] = [];

	for (const row of candidates) {
		const chunk = chunkFromRow(row);
		const lexicalScore = scoreText(`${chunk.sourceName}\n${chunk.content}`, terms);
		const ftsScore = row.ftsRank === null || row.ftsRank === undefined ? 0 : 8;
		const score = lexicalScore + ftsScore;
		if (score <= 0) continue;
		results.push({
			path: `knowledge/${chunk.sourceName}`,
			line: chunk.lineStart,
			score: score + 4,
			snippet: chunk.content.replace(/\s+/g, " ").trim().slice(0, 360),
			sourceId: chunk.sourceId,
			sourceType: "imported-knowledge",
		});
	}

	return results
		.sort(
			(left, right) =>
				right.score - left.score || left.path.localeCompare(right.path),
		)
		.slice(0, limit);
}
