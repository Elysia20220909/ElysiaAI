import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type TauriConfig = {
	bundle?: {
		externalBin?: string[];
		[key: string]: unknown;
	};
	[key: string]: unknown;
};

const root = process.cwd();
const sourcePath = join(root, "src-tauri", "tauri.conf.json");
const outputPath = join(root, "src-tauri", "tauri.sidecar.conf.json");
const config = JSON.parse(readFileSync(sourcePath, "utf8")) as TauriConfig;

config.bundle = {
	...(config.bundle || {}),
	externalBin: ["bin/fastapi_server"],
};

writeFileSync(`${outputPath}`, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
