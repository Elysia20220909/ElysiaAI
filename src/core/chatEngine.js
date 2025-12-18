import * as fs from "fs/promises";
const systemPromptPath = new URL("./systemPrompt.txt", import.meta.url).pathname;
let systemPrompt = "";
async function loadSystemPrompt() {
    try {
        systemPrompt = await fs.readFile(systemPromptPath, "utf-8");
    }
    catch (e) {
        systemPrompt = "You are a helpful AI assistant.";
    }
}
await loadSystemPrompt();
const messages = [];
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();
// OpenAI APIで実際に返答を取得
async function callLLM(messages) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return "[OpenAI APIキー未設定]";
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: 0.7
        })
    });
    if (!res.ok) return `[OpenAI APIエラー: ${res.status}]`;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "[AI返答なし]";
}
export async function chat(input) {
    if (!messages.length && systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: input });
    const reply = await callLLM(messages);
    messages.push({ role: "assistant", content: reply });
    return reply;
}
