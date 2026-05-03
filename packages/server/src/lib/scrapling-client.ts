import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SCRAPLING_BRIDGE = resolve(
	import.meta.dir,
	"../../../../python/lib/scrapling_bridge.py",
);

export interface ScraplingExtractedPage {
	url: string;
	title: string;
	description: string;
	text: string;
	engine: string;
}

export async function extractPageWithScrapling(
	url: string,
	options: { maxChars?: number; timeoutMs?: number } = {},
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
	const timeoutMs = options.timeoutMs ?? 15000;
	const maxChars = options.maxChars ?? 4000;

	try {
		const { stdout } = await execFileAsync(
			python,
			[
				SCRAPLING_BRIDGE,
				parsed.toString(),
				"--timeout",
				String(Math.ceil(timeoutMs / 1000)),
				"--max-chars",
				String(maxChars),
			],
			{
				timeout: timeoutMs + 2000,
				maxBuffer: Math.max(maxChars * 4, 32_768),
				windowsHide: true,
			},
		);

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
		};
	} catch {
		return null;
	}
}
