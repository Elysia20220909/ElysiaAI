#!/usr/bin/env bun

console.warn(
	"[compat] scripts/start-server.ts now bootstraps packages/server/src/index.ts.",
);

await import("../packages/server/src/index.ts");
