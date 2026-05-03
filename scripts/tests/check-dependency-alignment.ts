type PackageManifest = {
	name?: string;
	dependencies?: Record<string, string>;
};

export {};

const rootManifest = (await Bun.file("package.json").json()) as PackageManifest;
const workspaceManifests = ["packages/server/package.json"];

function dependencyVersion(manifest: PackageManifest, name: string) {
	return manifest.dependencies?.[name];
}

const rootDependencies = rootManifest.dependencies ?? {};

const mismatches: string[] = [];

for (const manifestPath of workspaceManifests) {
	const manifest = (await Bun.file(manifestPath).json()) as PackageManifest;
	const workspaceDependencies = manifest.dependencies ?? {};

	for (const dependencyName of Object.keys(workspaceDependencies).sort()) {
		const rootVersion = dependencyVersion(rootManifest, dependencyName);
		const workspaceVersion = dependencyVersion(manifest, dependencyName);

		if (!rootVersion || !workspaceVersion) {
			continue;
		}

		if (rootVersion !== workspaceVersion) {
			mismatches.push(
				`${manifestPath}: ${dependencyName} is ${workspaceVersion}, root is ${rootVersion}`,
			);
		}
	}
}

if (mismatches.length > 0) {
	console.error(
		"Dependency alignment guard failed / 依存バージョン整合チェックに失敗しました。",
	);
	for (const mismatch of mismatches) {
		console.error(`  - ${mismatch}`);
	}
	process.exit(1);
}

console.log(
	`Dependency alignment guard passed / 依存バージョン整合チェックに合格しました。 (${Object.keys(rootDependencies).length} root dependencies)`,
);
