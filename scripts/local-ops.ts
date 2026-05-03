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

console.log("Briefing");
for (const item of overview.briefing) {
	console.log(`- ${item}`);
}
console.log("");

console.log("Host");
console.log(
	`${overview.host.hostname} / ${overview.host.platform} / ${overview.host.arch}`,
);
console.log(
	`CPU: ${overview.host.cpuCores} threads, memory ${overview.host.memory.usedPercent}% used`,
);
console.log(
	`Runtime: Bun ${overview.host.runtime.bun}, ${overview.host.runtime.node}, PID ${overview.host.runtime.pid}`,
);
console.log("");

console.log("Home server gates");
console.log(
	`${overview.homeServer.status} (${overview.homeServer.score}%) - ${overview.homeServer.summary}`,
);
for (const gate of overview.homeServer.gates) {
	console.log(`[${gate.status}] ${gate.label} - ${gate.signal}`);
	console.log(`  next: ${gate.nextAction}`);
	if (gate.evidence.length > 0) {
		console.log(`  evidence: ${gate.evidence.slice(0, 3).join(", ")}`);
	}
}
if (overview.homeServer.probes.length > 0) {
	console.log("Live probes");
	for (const probe of overview.homeServer.probes) {
		console.log(`[${probe.status}] ${probe.label} - ${probe.detail}`);
		if (probe.evidence.length > 0) {
			console.log(`  evidence: ${probe.evidence.slice(0, 3).join(", ")}`);
		}
		if (probe.command) console.log(`  command: ${probe.command}`);
	}
}
console.log("");

console.log("Future build path");
console.log(`${overview.future.codename}: ${overview.future.summary}`);
for (const stage of overview.future.stages) {
	console.log(
		`[${stage.status}/${stage.horizon}/+${stage.readinessGain}%] ${stage.title}`,
	);
	console.log(`  next: ${stage.nextAction}`);
	console.log(`  depends: ${stage.dependencies.join(", ")}`);
	console.log(`  track: ${stage.track}`);
	console.log(`  safety: ${stage.safety}`);
}
console.log("");

console.log("Secure mesh matrix");
console.log(
	`${overview.secureMesh.status} (${overview.secureMesh.score}%) - ${overview.secureMesh.summary}`,
);
for (const route of overview.secureMesh.routes) {
	console.log(`[${route.status}/${route.access}] ${route.label}`);
	console.log(`  entry: ${route.entrypoint}`);
	console.log(`  next: ${route.nextAction}`);
}
for (const guard of overview.secureMesh.guards) {
	console.log(`[${guard.status}] ${guard.label} - ${guard.signal}`);
}
console.log("");

console.log("Client surfaces");
for (const client of overview.clients) {
	console.log(`[${client.status}] ${client.label} - ${client.surface}`);
	console.log(`  entry: ${client.entrypoint}`);
	console.log(`  next: ${client.nextAction}`);
	console.log(`  constraints: ${client.constraints.join(", ")}`);
}
console.log("");

console.log("Diagnostics");
for (const diagnostic of overview.diagnostics) {
	console.log(
		`[${diagnostic.status}] ${diagnostic.label} - ${diagnostic.detail}`,
	);
	console.log(`  next: ${diagnostic.nextAction}`);
	if (diagnostic.command) console.log(`  command: ${diagnostic.command}`);
	if (diagnostic.items?.length) {
		for (const item of diagnostic.items) console.log(`  - ${item}`);
	}
}
console.log("");

console.log("Auto improvement queue");
for (const improvement of overview.improvements) {
	console.log(
		`[${improvement.priority}/${improvement.impact}/${improvement.effort}] ${improvement.title}`,
	);
	console.log(`  reason: ${improvement.reason}`);
	console.log(`  next: ${improvement.nextAction}`);
	if (improvement.command) console.log(`  command: ${improvement.command}`);
	console.log(`  safety: ${improvement.safety}`);
}
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
console.log("Recent logs");
for (const log of overview.logs) {
	console.log(`[${log.status}] ${log.label} - ${log.path}`);
}

console.log("");
console.log("Command center: http://127.0.0.1:3000/stark-ops.html");
