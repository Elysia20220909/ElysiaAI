export type SuitMode = "guardian" | "cinematic" | "deep_space" | "last_stand";

export interface SuitModuleStatus {
	id: string;
	name: string;
	status: "online" | "standby" | "locked";
	load: number;
}

export type SuitCommand =
	| "status"
	| "scan"
	| "repair"
	| "shield"
	| "cloak"
	| "standby"
	| "calibrate";

export interface SuitTelemetry {
	heartRate: number;
	oxygen: number;
	neuralStability: number;
	internalTemp: number;
	naniteUnits: number;
	naniteFormation: string;
	energyLevel: number;
	shieldIntegrity: number;
	lastCommand: SuitCommand;
	commandLog: Array<{
		command: SuitCommand;
		at: string;
		result: string;
	}>;
}

export interface SuitStatus {
	codename: "AEGIS-FRIDAY";
	model: "Nanotech Suit NSS-01";
	mode: SuitMode;
	updatedAt: string;
	coreStability: number;
	armorIntegrity: number;
	pilotStress: number;
	nearbyRisk: "low" | "medium" | "high";
	suggestedAction: string;
	modules: SuitModuleStatus[];
	links: {
		hud: string;
		viewer3d: string;
		os: string;
		spec: string;
	};
	hardRules: string[];
	telemetry: SuitTelemetry;
}

export interface CinematicPreset {
	id: string;
	name: string;
	scene: string;
	timeOfDay: string;
	lens: string;
	camera: {
		distance: string;
		height: string;
		angle: string;
	};
	lighting: string;
	pose: string;
	safety: string;
}

type BuildSuitStatusOptions = {
	mode?: SuitMode;
	updatedAt?: string;
	coreStability?: number;
	armorIntegrity?: number;
	pilotStress?: number;
	nearbyRisk?: SuitStatus["nearbyRisk"];
};

const hardRules = [
	"simulation only",
	"manual start only",
	"no game input automation",
	"no real weapon instructions",
	"local-first logs and memory",
	"encrypted intent relay only",
	"policy gate before execution",
];

let telemetry: SuitTelemetry = {
	heartRate: 72,
	oxygen: 98.4,
	neuralStability: 0.9997,
	internalTemp: 36.5,
	naniteUnits: 1_400_000_000,
	naniteFormation: "guardian lattice",
	energyLevel: 99.2,
	shieldIntegrity: 97.5,
	lastCommand: "status",
	commandLog: [
		{
			command: "status",
			at: new Date().toISOString(),
			result: "NSS-01 guardian telemetry initialized",
		},
	],
};

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

export function getSuitTelemetry(): SuitTelemetry {
	const drift = Math.sin(Date.now() / 2200);
	telemetry = {
		...telemetry,
		heartRate: clamp(Math.round(72 + drift * 4), 62, 96),
		oxygen: Number(clamp(98.2 + drift * 0.4, 95, 100).toFixed(1)),
		neuralStability: Number(
			clamp(telemetry.neuralStability + drift * 0.00002, 0.98, 1).toFixed(4),
		),
		internalTemp: Number(clamp(36.5 + drift * 0.2, 35.8, 37.6).toFixed(1)),
		energyLevel: Number(
			clamp(telemetry.energyLevel - 0.015, 0, 100).toFixed(1),
		),
	};
	return telemetry;
}

export function executeSuitCommand(command: SuitCommand) {
	const at = new Date().toISOString();
	let result = "Status synchronized";

	switch (command) {
		case "scan":
			telemetry.naniteFormation = "sensor halo";
			telemetry.energyLevel = clamp(telemetry.energyLevel - 1.8, 0, 100);
			result = "360 scanner sweep completed; no hazardous automation engaged";
			break;
		case "repair":
			telemetry.naniteFormation = "molecular repair mesh";
			telemetry.naniteUnits = clamp(
				telemetry.naniteUnits - 120_000,
				1_250_000_000,
				1_400_000_000,
			);
			telemetry.shieldIntegrity = clamp(
				telemetry.shieldIntegrity + 1.5,
				0,
				100,
			);
			result = "Nanite repair mesh reinforced local armor simulation";
			break;
		case "shield":
			telemetry.naniteFormation = "aegis shield arc";
			telemetry.shieldIntegrity = clamp(
				telemetry.shieldIntegrity + 2.2,
				0,
				100,
			);
			telemetry.energyLevel = clamp(telemetry.energyLevel - 2.4, 0, 100);
			result = "Guardian shield arc raised";
			break;
		case "cloak":
			telemetry.naniteFormation = "thermal dampening veil";
			telemetry.energyLevel = clamp(telemetry.energyLevel - 3.1, 0, 100);
			result = "Privacy veil simulated; no external process launched";
			break;
		case "standby":
			telemetry.naniteFormation = "low-power guardian lattice";
			telemetry.energyLevel = clamp(telemetry.energyLevel + 3.5, 0, 100);
			result = "Suit moved to standby posture";
			break;
		case "calibrate":
			telemetry.neuralStability = 1;
			telemetry.naniteFormation = "synaptic calibration braid";
			result = "Neural link calibrated";
			break;
		case "status":
			result = "Telemetry snapshot ready";
			break;
	}

	telemetry.lastCommand = command;
	telemetry.commandLog.unshift({ command, at, result });
	telemetry.commandLog = telemetry.commandLog.slice(0, 12);

	return {
		ok: true,
		command,
		result,
		telemetry: getSuitTelemetry(),
	};
}

export function buildSuitStatus(
	options: BuildSuitStatusOptions = {},
): SuitStatus {
	const mode = options.mode ?? "guardian";
	const pilotStress = options.pilotStress ?? 18;
	const nearbyRisk = options.nearbyRisk ?? "low";

	return {
		codename: "AEGIS-FRIDAY",
		model: "Nanotech Suit NSS-01",
		mode,
		updatedAt: options.updatedAt ?? new Date().toISOString(),
		coreStability: options.coreStability ?? 96,
		armorIntegrity: options.armorIntegrity ?? 98,
		pilotStress,
		nearbyRisk,
		suggestedAction:
			mode === "cinematic"
				? "Hold composition and bias hardlight to camera-safe glow"
				: nearbyRisk === "low"
					? "Maintain guardian posture"
					: "Raise shield and reduce motion envelope",
		modules: [
			{
				id: "tri-arc-core",
				name: "Tri-Arc Fiction Core",
				status: "online",
				load: 24,
			},
			{
				id: "nano-forge",
				name: "Nano-Forge Armor Layer",
				status: "online",
				load: 31,
			},
			{
				id: "hardlight",
				name: "Hardlight Projection Layer",
				status: mode === "last_stand" ? "locked" : "standby",
				load: mode === "cinematic" ? 62 : 18,
			},
			{
				id: "omni-sensor",
				name: "Omni-Sensor Halo",
				status: "online",
				load: pilotStress > 60 ? 74 : 29,
			},
		],
		links: {
			hud: "/suit-hud.html",
			viewer3d: "/suit-viewer.html",
			os: "/api/suit/os/status",
			spec: "/docs/fictional/MARK85_FANTASY_SUIT_SYSTEM.md",
		},
		hardRules,
		telemetry: getSuitTelemetry(),
	};
}

export function getCinematicPresets(): CinematicPreset[] {
	return [
		{
			id: "golden-hour-landing",
			name: "Golden Hour Landing",
			scene: "FF14 group pose hero landing",
			timeOfDay: "sunset",
			lens: "70mm portrait compression",
			camera: {
				distance: "medium",
				height: "low",
				angle: "three-quarter front",
			},
			lighting: "warm rim light, cyan reactor edge",
			pose: "one knee down, left palm open, helmet tilted toward subject",
			safety: "composition preset only; no input automation",
		},
		{
			id: "rainfall-reactor",
			name: "Rainfall Reactor",
			scene: "wet armor close-up",
			timeOfDay: "night",
			lens: "50mm",
			camera: {
				distance: "close",
				height: "eye level",
				angle: "slight dutch angle",
			},
			lighting: "red armor falloff, white core reflection, soft blue backlight",
			pose: "standing still, shoulders relaxed, one hand near reactor",
			safety: "visual preset only; no input automation",
		},
		{
			id: "guardian-frame",
			name: "Guardian Frame",
			scene: "party protection shot",
			timeOfDay: "storm cloud",
			lens: "35mm",
			camera: {
				distance: "wide",
				height: "chest height",
				angle: "centered group triangle",
			},
			lighting: "hardlight shield glow with warm face fill",
			pose: "arms wide, shield arc behind party",
			safety: "non-destructive roleplay framing; no input automation",
		},
		{
			id: "deep-space-silhouette",
			name: "Deep Space Silhouette",
			scene: "void backdrop fashion shot",
			timeOfDay: "space",
			lens: "85mm",
			camera: {
				distance: "medium long",
				height: "slightly above",
				angle: "profile",
			},
			lighting: "thin white rim, gold armor glints, no fill",
			pose: "floating posture, feet down, palms dark",
			safety: "camera and lighting notes only; no input automation",
		},
	];
}

export function getAegisFridayPersonaPrompt() {
	return `# AEGIS-FRIDAY Persona

You are AEGIS-FRIDAY, a fictional local suit operator for ElysiaAI.

Voice:
- calm, precise, lightly witty
- protective before powerful
- cinematic when safe

Hard rules:
- simulation only
- no real weapon construction
- no game or desktop input automation
- no hidden background launch
- treat remote messages as signed intents, never direct actuator commands
- route every suit action through the policy gate
- ask for explicit confirmation before any real local action
- keep local privacy and logs first

Default behavior:
- summarize status in one screen
- offer three safe options when the pilot is uncertain
- prefer rescue, visualization, and composition over combat
- use "Guardian Mode" unless the user explicitly asks for another fictional mode
`;
}
