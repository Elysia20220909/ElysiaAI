import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SCRAPLING_BRIDGE = resolve(
	import.meta.dir,
	"../../../../python/lib/scrapling_bridge.py",
);

export interface ScraplingOptions {
	maxChars?: number;
	timeoutMs?: number;
	mode?: "httpx" | "stealth" | "dynamic";
	aiTargeted?: boolean;
	extractionType?: "text" | "markdown" | "html";
	screenshot?: boolean;
}

export interface ScraplingExtractedPage {
	url: string;
	title: string;
	description: string;
	text: string;
	engine: string;
	screenshot?: string; // Base64 encoded JPEG
}

/**
 * Extracts page content using the Scrapling bridge.
 * 
 * @param url The URL to extract.
 * @param options Extraction options including mode (stealth/dynamic) and AI-targeted cleansing.
 * @returns The extracted page content or null on failure.
 */
export async function extractPageWithScrapling(
	url: string,
	options: ScraplingOptions = {},
): Promise<ScraplingExtractedPage | null> {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return null;
	}

	const python = process.env.ELYSIA_PYTHON || process.env.PYTHON || "python";
	const timeoutMs = options.timeoutMs ?? 30000;
	const maxChars = options.maxChars ?? 10000;
	const mode = options.mode ?? "httpx";
	const extractionType = options.extractionType ?? "text";

	const args = [
		SCRAPLING_BRIDGE,
		parsed.toString(),
		"--timeout",
		String(Math.ceil(timeoutMs / 1000)),
		"--max-chars",
		String(maxChars),
		"--mode",
		mode,
		"--extraction-type",
		extractionType,
	];

	if (options.aiTargeted) {
		args.push("--ai-targeted");
	}

	if (options.screenshot && (mode === "stealth" || mode === "dynamic")) {
		args.push("--screenshot");
	}

	try {
		const { stdout } = await execFileAsync(python, args, {
			timeout: timeoutMs + 5000,
			maxBuffer: Math.max(maxChars * 10, 1024 * 1024), // Buffer for potential screenshots
			windowsHide: true,
		});

		const payload = JSON.parse(stdout) as Partial<ScraplingExtractedPage>;
		if (!payload.text && !payload.title && !payload.description) {
			return null;
		}

		return {
			url: payload.url || parsed.toString(),
			title: payload.title || "",
			description: payload.description || "",
			text: payload.text || "",
			engine: payload.engine || "scrapling",
			screenshot: payload.screenshot,
		};
	} catch (error) {
		console.error("Scrapling extraction failed:", error);
		return null;
	}
}
