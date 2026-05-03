import { collectLocalOpsOverview } from "../packages/server/src/lib/local-ops";

const asJson = Bun.argv.includes("--json");
const overview = await collectLocalOpsOverview();

if (asJson) {
	console.log(JSON.stringify(overview, null, 2));
	process.exit(0);
}

console.log("ElysiaAI Local Ops");
console.log(`Mode: ${overview.mode}`);
console.log(
	`Readiness: ${overview.readiness.status} (${overview.readiness.score}%) - ${overview.readiness.summary}`,
);
console.log("");

for (const service of overview.services) {
	const status = service.enabled ? service.status : "disabled";
	const timing =
		typeof service.responseTime === "number"
			? `, ${Math.round(service.responseTime)}ms`
			: "";
	const detail = service.detail ? ` - ${service.detail}` : "";
	console.log(`[${status}] ${service.name}${timing}${detail}`);
	if (service.startCommand && status !== "up") {
		console.log(`  start: ${service.startCommand}`);
	}
}

console.log("");
console.log("Command center: http://127.0.0.1:3000/stark-ops.html");
