console.warn(
	"[compat] Root server.ts now bootstraps packages/server/src/index.ts.",
);

await import("./packages/server/src/index.ts");
