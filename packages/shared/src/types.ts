export type Message = {
	role: "user" | "assistant" | "system";
	content: string;
};

export type ChatMode =
	| "sweet"
	| "normal"
	| "professional"
	| "casual"
	| "creative"
	| "technical"
	| "openai";

export type ChatRequest = {
	messages: Message[];
	mode?: ChatMode;
};

export type ChatSession = {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
};

// --- Sovereign Suit & Neural Metrics ---
export type NaniteState = {
	unitCount: number;
	repairRate: number;
	energyLevel: number;
	isAssembling: boolean;
};

export type Vitals = {
	heartRate: number;
	oxygen: number;
	stability: number;
	temp: number;
};

export type NeuralMetrics = {
	latency: number;
	synapseSync: number;
	pilotAuthorized: boolean;
};

export type SovereignState = {
	suit: NaniteState;
	vitals: Vitals;
	neural: NeuralMetrics;
};

// --- Phase 19: Swarm Nucleus & Ghost Protocol ---
export type AgentState = {
	id: string;
	status: "idle" | "active" | "syncing" | "ghost";
	latency: number;
	position: { x: number; y: number; z: number };
};

export type SwarmNucleus = {
	coreDensity: number;
	activeAgents: number;
	syncCoherence: number; // 0.0 - 1.0
	ghostNodeCount: number;
	isSynchronized: boolean;
};

export type GhostSignal = {
	frequency: number;
	amplitude: number;
	origin: string;
	timestamp: number;
};
