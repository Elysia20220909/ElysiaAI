<<<<<<< HEAD
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
=======
export type Message = { role: "user" | "assistant" | "system"; content: string };

export type ChatMode = 
  | "sweet"
  | "normal"
  | "professional"
  | "casual"
  | "creative"
  | "technical"
  | "openai";
>>>>>>> 9b18ad410eda46b5782a6881e9b0d61d11be7572

export type ChatRequest = {
	messages: Message[];
	mode?: ChatMode;
};

export interface ChatSession {
<<<<<<< HEAD
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
=======
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
>>>>>>> 9b18ad410eda46b5782a6881e9b0d61d11be7572
}
