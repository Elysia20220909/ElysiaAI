import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const API_URL_KEY = "@elysia_api_url";
const DEFAULT_API_URL = "http://192.168.1.100:3000";

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
			const response = await fetch(`${apiUrl}/elysia-love`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ messages: newMessages }),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			// Note: Streaming is handled here if supported by the environment
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			let assistantContent = "";

			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					assistantContent += chunk;

					setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
				}
			} else {
				// Fallback for non-streaming environments
				const data = await response.json();
				assistantContent = data.content || "応答がありません";
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
