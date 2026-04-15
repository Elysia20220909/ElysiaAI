import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const API_URL_KEY = "@elysia_api_url";
const DEFAULT_API_URL = "http://192.168.1.100:3000";
const ACCESS_TOKEN_KEY = "@elysia_access_token";

export type Message = {
	role: "user" | "assistant";
	content: string;
};

export function useChat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(false);
	const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);

	useEffect(() => {
		const loadApiUrl = async () => {
			try {
				const saved = await AsyncStorage.getItem(API_URL_KEY);
				if (saved) setApiUrl(saved);
			} catch (e) {
				console.error("Failed to load API URL", e);
			}
		};
		loadApiUrl();
	}, []);

	const saveApiUrl = async (url: string) => {
		try {
			await AsyncStorage.setItem(API_URL_KEY, url);
			setApiUrl(url);
			return true;
		} catch (e) {
			console.error("Failed to save API URL", e);
			return false;
		}
	};

	const sendMessage = async (content: string) => {
		if (!content.trim() || loading) return;

		const userMessage: Message = { role: "user", content: content.trim() };
		const newMessages = [...messages, userMessage];
		setMessages(newMessages);
		setLoading(true);

		try {
			const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
			const response = await fetch(`${apiUrl}/elysia-love`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${token}`
				},
				body: JSON.stringify({ messages: sanitizedMessages(newMessages) }),
			});

			if (response.status === 401) {
				throw new Error("Unauthorized: Please login again.");
			}

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			// Bun/Server SSE handling (Manual split for mobile environment compatibility)
			const text = await response.text();
            let assistantContent = "";
            
            // Simple data-stream parsing if multiple chunks were combined by fetch
            const lines = text.split("\n\n");
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        const json = JSON.parse(line.substring(6));
                        if (json.content) assistantContent += json.content;
                    } catch {}
                }
            }

			if (!assistantContent && text) {
				assistantContent = text; // Non-streaming fallback
			}

			setMessages([
				...newMessages,
				{ role: "assistant", content: assistantContent || "応答がありません" },
			]);
		} catch (error) {
			console.error("API Error:", error);
			const errorMessage = `ごめんね…エラーが起きちゃった💦\n${error instanceof Error ? error.message : String(error)}`;
			setMessages([...newMessages, { role: "assistant", content: errorMessage }]);
		} finally {
			setLoading(false);
		}
	};

    const sanitizedMessages = (ms: Message[]) => ms.map(m => ({
        role: m.role,
        content: m.content
    }));

	const clearMessages = () => setMessages([]);

	return {
		messages,
		loading,
		apiUrl,
		saveApiUrl,
		sendMessage,
		clearMessages,
	};
}
