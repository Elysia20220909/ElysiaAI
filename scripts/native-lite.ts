import {
	bytesToMiB,
	collectNativeLiteSnapshot,
} from "../packages/server/src/lib/native-lite";

const asJson = Bun.argv.includes("--json");
const snapshot = collectNativeLiteSnapshot();

if (asJson) {
	console.log(JSON.stringify(snapshot, null, 2));
	process.exit(0);
}

console.log("ElysiaAI Native Lite Lab");
console.log(`Score: ${snapshot.score}% - ${snapshot.summary}`);
console.log("");

console.log("Lanes");
for (const lane of snapshot.lanes) {
	console.log(`[${lane.status}] ${lane.name} - ${lane.role}`);
	console.log(`  ${lane.detail}`);
}

console.log("");
console.log("Weight Budget");
for (const budget of snapshot.budgets) {
	const marker = budget.truncated ? "sampled" : "exact";
	console.log(
		`[${marker}] ${budget.label}: ${bytesToMiB(budget.bytes)} MiB, ${budget.files} files`,
	);
	if (budget.bytes > 0 || budget.truncated) {
		console.log(`  next: ${budget.action}`);
	}
}

console.log("");
console.log("Lab: http://127.0.0.1:3000/native-lite.html");
