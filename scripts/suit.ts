import {
	buildSuitStatus,
	getAegisFridayPersonaPrompt,
	getCinematicPresets,
} from "../packages/server/src/lib/suit-system";

const command = Bun.argv[2] ?? "status";
const asJson = Bun.argv.includes("--json");

if (command === "status") {
	const status = buildSuitStatus();
	if (asJson) {
		console.log(JSON.stringify(status, null, 2));
	} else {
		console.log(`${status.codename} / ${status.model}`);
		console.log(`Mode: ${status.mode}`);
		console.log(`Core: ${status.coreStability}%`);
		console.log(`Armor: ${status.armorIntegrity}%`);
		console.log(`Pilot stress: ${status.pilotStress}%`);
		console.log(`Risk: ${status.nearbyRisk}`);
		console.log(`Action: ${status.suggestedAction}`);
	}
} else if (command === "presets") {
	const presets = getCinematicPresets();
	if (asJson) {
		console.log(JSON.stringify(presets, null, 2));
	} else {
		for (const preset of presets) {
			console.log(`${preset.id}: ${preset.name}`);
			console.log(`  ${preset.scene}`);
		}
	}
} else if (command === "persona") {
	console.log(getAegisFridayPersonaPrompt());
} else {
	console.error(`Unknown suit command: ${command}`);
	console.error("Usage: bun run suit -- [status|presets|persona] [--json]");
	process.exit(1);
}
