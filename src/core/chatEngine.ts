import * as fs from "fs/promises";


const systemPromptPath = new URL("./systemPrompt.txt", import.meta.url).pathname;
let systemPrompt = "";
async function loadSystemPrompt() {
  try {
    systemPrompt = await fs.readFile(systemPromptPath, "utf-8");
  } catch (e) {
    systemPrompt = "You are a helpful AI assistant.";
  }
}
await loadSystemPrompt();

const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];

// LLM呼び出し部分は仮実装
async function callLLM(messages: any[]): Promise<string> {
  // 実際はAPI呼び出し等に置き換えてください
  return "（ここにAIの返答が入ります）";
}

export async function chat(input: string): Promise<string> {
  if (!messages.length && systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: input });
  const reply = await callLLM(messages);
  messages.push({ role: "assistant", content: reply });
  return reply;
}
