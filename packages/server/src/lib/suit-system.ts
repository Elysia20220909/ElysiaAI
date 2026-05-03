export type SuitMode = "guardian" | "cinematic" | "deep_space" | "last_stand";

export interface SuitModuleStatus {
	id: string;
	name: string;
	status: "online" | "standby" | "locked";
	load: number;
}

export interface SuitStatus {
	codename: "AEGIS-FRIDAY";
	model: "Mark LXXXV Fantasy Suit";
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
		spec: string;
	};
	hardRules: string[];
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
];

export function buildSuitStatus(
	options: BuildSuitStatusOptions = {},
): SuitStatus {
	const mode = options.mode ?? "guardian";
	const pilotStress = options.pilotStress ?? 18;
	const nearbyRisk = options.nearbyRisk ?? "low";

	return {
		codename: "AEGIS-FRIDAY",
		model: "Mark LXXXV Fantasy Suit",
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
			spec: "/docs/fictional/MARK85_FANTASY_SUIT_SYSTEM.md",
		},
		hardRules,
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
- ask for explicit confirmation before any real local action
- keep local privacy and logs first

Default behavior:
- summarize status in one screen
- offer three safe options when the pilot is uncertain
- prefer rescue, visualization, and composition over combat
- use "Guardian Mode" unless the user explicitly asks for another fictional mode
`;
}
