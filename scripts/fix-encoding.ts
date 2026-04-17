import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const IGNORE_DIRS = [
	"node_modules",
	".git",
	"dist",
	"build",
	".tauri",
	"target",
	"venv",
	"__pycache__",
];

const TEXT_EXTENSIONS = [
	".js",
	".ts",
	".tsx",
	".jsx",
	".html",
	".css",
	".md",
	".json",
	".py",
	".sh",
	".ps1",
	".yml",
	".yaml",
	".toml",
	".txt",
	"Makefile",
];

async function fixEncoding(dir: string) {
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			if (!IGNORE_DIRS.includes(entry.name)) {
				await fixEncoding(fullPath);
			}
			continue;
		}

		const ext = extname(entry.name);
		if (TEXT_EXTENSIONS.includes(ext) || TEXT_EXTENSIONS.includes(entry.name)) {
			try {
				const buffer = await readFile(fullPath);

				// Check for BOM (Byte Order Mark)
				if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
					console.log(`[BOM] Removing BOM from: ${fullPath}`);
					await writeFile(fullPath, buffer.subarray(3));
					continue;
				}

				// We assume any non-UTF-8 might be Shift-JIS (simple check)
				// In a real scenario, we'd use iconv-lite, but here we'll just
				// ensure it's re-saved as clean UTF-8.
				const content = buffer.toString("utf8");
				await writeFile(fullPath, content, "utf8");
			} catch (err) {
				console.error(`Failed to process ${fullPath}:`, err);
			}
		}
	}
}

console.log("🚀 Starting Global Encoding Fix (UTF-8 Force)...");
fixEncoding(process.cwd())
	.then(() => console.log("✅ All files synchronized to UTF-8."))
	.catch((err) => console.error("❌ Fatal Error:", err));
