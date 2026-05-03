const allowedEnvFiles = new Set([".env.example"]);

export {};

function isForbiddenEnvPath(path: string) {
	const parts = path.split("/");
	const filename = parts.at(-1) ?? path;

	if (allowedEnvFiles.has(filename) || filename.endsWith(".example")) {
		return false;
	}

	return filename === ".env" || filename.startsWith(".env.");
}

const proc = Bun.spawn(["git", "ls-files"], {
	stdout: "pipe",
	stderr: "inherit",
});

const output = await new Response(proc.stdout).text();
const exitCode = await proc.exited;

if (exitCode !== 0) {
	console.error("Git hygiene guard failed / Git衛生チェックに失敗しました。");
	process.exit(exitCode);
}

const trackedSecrets = output
	.split(/\r?\n/)
	.map((line) => line.trim())
	.filter(Boolean)
	.filter(isForbiddenEnvPath);

if (trackedSecrets.length > 0) {
	console.error(
		"Forbidden environment files are tracked / 禁止された環境ファイルが追跡されています。",
	);
	for (const path of trackedSecrets) {
		console.error(`  - ${path}`);
	}
	console.error("Remove them from the index with: git rm --cached <path>");
	console.error(
		"ローカルファイルを残す場合は git rm --cached <path> で追跡だけ外してください。",
	);
	process.exit(1);
}

console.log("Git hygiene guard passed / Git衛生チェックに合格しました。");
