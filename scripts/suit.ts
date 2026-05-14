import { buildSuitCommsStatus } from "../packages/server/src/lib/suit-comms";
import { buildSuitEdgeRuntimeSnapshot } from "../packages/server/src/lib/suit-edge-runtime";
import { buildSuitHardwareStatus } from "../packages/server/src/lib/suit-hardware-adapter";
import {
	buildHoloLensReferenceProfile,
	planHoloLensVoiceCommand,
} from "../packages/server/src/lib/suit-hololens-profile";
import {
	buildMark85ReferenceProfile,
	planMark85OperationalMode,
} from "../packages/server/src/lib/suit-mark85-profile";
import {
	buildSuitStatus,
	getAegisFridayPersonaPrompt,
	getCinematicPresets,
} from "../packages/server/src/lib/suit-system";

const command = Bun.argv[2] ?? "status";
const asJson = Bun.argv.includes("--json");

function readFlagValue(flag: string): string {
	const index = Bun.argv.indexOf(flag);
	if (index < 0) return "";
	const values: string[] = [];
	for (const arg of Bun.argv.slice(index + 1)) {
		if (arg.startsWith("--")) break;
		values.push(arg);
	}
	return values.join(" ");
}

const phrase = readFlagValue("--phrase");
const mode = readFlagValue("--mode");

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
} else if (command === "comms") {
	const comms = buildSuitCommsStatus();
	if (asJson) {
		console.log(JSON.stringify(comms, null, 2));
	} else {
		console.log("Suit comms: local-first-supervised");
		console.log(`Local AI: ${comms.localAI.mode} / ${comms.localAI.risk}`);
		console.log(`Crypto: ${comms.crypto.algorithm}`);
		for (const channel of comms.network.channels) {
			console.log(
				`- ${channel.kind}: ${channel.status}, ${channel.trustZone}, ${channel.latencyBudgetMs}ms`,
			);
		}
	}
} else if (command === "edge") {
	const edge = buildSuitEdgeRuntimeSnapshot();
	if (asJson) {
		console.log(JSON.stringify(edge, null, 2));
	} else {
		console.log(`Suit edge runtime: ${edge.posture}`);
		console.log(`Local AI: ${edge.localAI.mode} / ${edge.localAI.risk}`);
		for (const node of edge.nodes) {
			console.log(
				`- ${node.id}: ${node.status}, ${node.runtime}, ${node.bus}, ${node.zone}`,
			);
		}
	}
} else if (command === "hardware") {
	const hardware = buildSuitHardwareStatus();
	if (asJson) {
		console.log(JSON.stringify(hardware, null, 2));
	} else {
		console.log(`Suit hardware adapter: ${hardware.mode}`);
		console.log(`Platform: ${hardware.platform}`);
		console.log(
			`GPIO tool: ${hardware.tools.gpioRead} / ${hardware.tools.gpioWrite}`,
		);
		console.log(`CAN tool: ${hardware.tools.canSend}`);
		console.log(`GPIO allowlist: ${hardware.allowlist.gpio.length}`);
		console.log(`CAN allowlist: ${hardware.allowlist.can.length}`);
	}
} else if (command === "hololens") {
	if (phrase) {
		const plan = planHoloLensVoiceCommand(phrase, "local-cli");
		if (asJson) {
			console.log(JSON.stringify(plan, null, 2));
		} else {
			console.log(`HoloLens voice phrase: ${plan.phrase}`);
			console.log(`Decision: ${plan.decision}`);
			console.log(`Matched: ${plan.matched?.id ?? "none"}`);
			for (const reason of plan.reasons) {
				console.log(`- ${reason}`);
			}
		}
	} else {
		const profile = buildHoloLensReferenceProfile();
		if (asJson) {
			console.log(JSON.stringify(profile, null, 2));
		} else {
			console.log(`HoloLens reference: ${profile.source.repository}`);
			console.log(`License: ${profile.source.license}`);
			for (const voiceCommand of profile.voiceCommands) {
				console.log(
					`- ${voiceCommand.phrase}: ${voiceCommand.decision}, ${voiceCommand.category}`,
				);
			}
		}
	}
} else if (command === "mark85") {
	if (mode) {
		const plan = planMark85OperationalMode(mode, "local-cli");
		if (asJson) {
			console.log(JSON.stringify(plan, null, 2));
		} else {
			console.log(`Mark85 mode: ${plan.mode.label}`);
			console.log(`Decision: ${plan.decision}`);
			console.log(`Safe translation: ${plan.mode.safeTranslation}`);
			for (const reason of plan.reasons) {
				console.log(`- ${reason}`);
			}
		}
	} else {
		const profile = buildMark85ReferenceProfile();
		if (asJson) {
			console.log(JSON.stringify(profile, null, 2));
		} else {
			console.log(`${profile.model} / ${profile.version}`);
			for (const modeProfile of profile.operationalModes) {
				console.log(
					`- ${modeProfile.id}: ${modeProfile.decision}, ${modeProfile.safeTranslation}`,
				);
			}
		}
	}
} else {
	console.error(`Unknown suit command: ${command}`);
	console.error(
		'Usage: bun run suit -- [status|presets|persona|comms|edge|hardware|hololens|mark85] [--json] [--phrase "Jarvis Scan"] [--mode guardian]',
	);
	process.exit(1);
}
