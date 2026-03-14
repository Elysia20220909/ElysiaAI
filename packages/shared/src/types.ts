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
