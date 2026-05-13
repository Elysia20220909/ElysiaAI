"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import type { AuthSession } from "../../lib/auth-api";
import { getSession, logout } from "../../lib/auth-api";

type ChatMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
	pending?: boolean;
};

const csrfCookieName = "elysia_csrf_token";

const initialMessages: ChatMessage[] = [
	{
		id: "welcome",
		role: "assistant",
		content:
			"こんにちは。今日は何を一緒に整えましょう？設計、実装、記憶の整理まで、静かに伴走します。",
	},
];

function readCookie(name: string): string | null {
	if (typeof document === "undefined") return null;

	const cookie = document.cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${name}=`));
	if (!cookie) return null;

	return decodeURIComponent(cookie.slice(name.length + 1));
}

function extractSseContent(raw: string): string {
	let content = "";
	for (const block of raw.split("\n\n")) {
		const dataLine = block
			.split("\n")
			.find((line) => line.startsWith("data: "));
		if (!dataLine) continue;

		const payload = dataLine.slice("data: ".length);
		if (payload === "[DONE]") continue;

		try {
			const parsed = JSON.parse(payload) as { content?: unknown };
			if (typeof parsed.content === "string") content += parsed.content;
		} catch {
			// Ignore malformed event fragments and keep the UI responsive.
		}
	}
	return content.trim();
}

export default function DashboardClient() {
	const router = useRouter();
	const [session, setSession] = useState<AuthSession | null>(null);
	const [pending, setPending] = useState(true);
	const [loggingOut, setLoggingOut] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
	const [draft, setDraft] = useState("");
	const [chatStatus, setChatStatus] = useState("ローカル中核 待機中");
	const [sending, setSending] = useState(false);

	useEffect(() => {
		let active = true;
		getSession()
			.then((nextSession) => {
				if (!active) return;
				if (!nextSession.authenticated) {
					router.replace("/login");
					return;
				}
				setSession(nextSession);
			})
			.catch(() => router.replace("/login"))
			.finally(() => {
				if (active) setPending(false);
			});
		return () => {
			active = false;
		};
	}, [router]);

	async function handleLogout() {
		setLoggingOut(true);
		try {
			await logout();
		} finally {
			router.replace("/login");
		}
	}

	async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = draft.trim();
		if (!trimmed || sending) return;

		const stamp = Date.now();
		const userMessage: ChatMessage = {
			id: `user-${stamp}`,
			role: "user",
			content: trimmed,
		};
		const pendingMessage: ChatMessage = {
			id: `assistant-${stamp}`,
			role: "assistant",
			content: "考えています。",
			pending: true,
		};
		const nextMessages = [...messages, userMessage];

		setDraft("");
		setSending(true);
		setChatStatus("Elysia Core に接続中");
		setMessages([...nextMessages, pendingMessage]);

		try {
			const headers = new Headers({ "content-type": "application/json" });
			const csrfToken = readCookie(csrfCookieName);
			if (csrfToken) headers.set("x-csrf-token", csrfToken);

			const response = await fetch("/api/elysia-core/chat", {
				method: "POST",
				headers,
				credentials: "include",
				cache: "no-store",
				body: JSON.stringify({
					messages: nextMessages
						.slice(-10)
						.map(({ role, content }) => ({ role, content })),
					stream: false,
				}),
			});

			if (!response.ok) {
				const errorBody = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(errorBody.error || `HTTP ${response.status}`);
			}

			const raw = await response.text();
			const content =
				extractSseContent(raw) ||
				"応答は空でした。もう一度、少し言葉を変えて話しかけてください。";
			setMessages((current: ChatMessage[]) =>
				current.map((message: ChatMessage) =>
					message.id === pendingMessage.id
						? { ...message, content, pending: false }
						: message,
				),
			);
			setChatStatus("Elysia Core 応答済み");
		} catch (error) {
			const message = error instanceof Error ? error.message : "通信に失敗しました。";
			setMessages((current: ChatMessage[]) =>
				current.map((item: ChatMessage) =>
					item.id === pendingMessage.id
						? {
								...item,
								content: `いまは中核へ届きませんでした。${message}`,
								pending: false,
							}
						: item,
				),
			);
			setChatStatus("ローカル接続を確認してください");
		} finally {
			setSending(false);
		}
	}

	const user = session?.user;
	const expiresAt = session?.expiresAt
		? new Date(session.expiresAt).toLocaleString("ja-JP")
		: "確認中";

	return (
		<main className="workspace-shell" aria-labelledby="dashboard-title">
			<aside className="workspace-sidebar" aria-label="Workspace navigation">
				<div className="brand-row workspace-brand">
					<div className="brand-mark" aria-hidden="true">
						E
					</div>
					<div>
						<strong>ElysiaAI</strong>
						<p>Your quiet AI companion</p>
					</div>
				</div>

				<nav className="nav-list" aria-label="Primary">
					<button className="nav-item active" type="button">
						Chat
					</button>
					<button className="nav-item" type="button">
						Memory
					</button>
					<button className="nav-item" type="button">
						Files
					</button>
					<button className="nav-item" type="button">
						Settings
					</button>
				</nav>

				<div className="sidebar-status" aria-label="Session details">
					<div>
						<span>Operator</span>
						<strong>{user?.username ?? "確認中"}</strong>
					</div>
					<div>
						<span>Role</span>
						<strong>{user?.role ?? "確認中"}</strong>
					</div>
					<div>
						<span>Session</span>
						<strong>{pending ? "確認中" : "Linked"}</strong>
					</div>
				</div>

				<button className="secondary-action full-width" type="button" disabled={loggingOut} onClick={handleLogout}>
					{loggingOut ? "ログアウト中" : "ログアウト"}
				</button>
			</aside>

			<section className="chat-panel" aria-labelledby="dashboard-title">
				<header className="chat-header">
					<div>
						<p className="eyebrow">Local-first workspace</p>
						<h1 id="dashboard-title" className="chat-title">
							ElysiaAI
						</h1>
						<p className="chat-subtitle">
							Ask softly. Think deeply. Build beautifully.
						</p>
					</div>
					<span className="status-pill">{chatStatus}</span>
				</header>

				<div className="messages" aria-live="polite">
					{messages.map((message) => (
						<div key={message.id} className={`chat-message ${message.role} ${message.pending ? "pending" : ""}`}>
							<p>{message.content}</p>
						</div>
					))}
				</div>

				<form className="composer" onSubmit={handleChatSubmit}>
					<label className="sr-only" htmlFor="elysia-message">
						Message ElysiaAI
					</label>
					<input
						id="elysia-message"
						value={draft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
						placeholder="Message ElysiaAI..."
						disabled={sending}
					/>
					<button className="send-action" type="submit" disabled={sending || !draft.trim()} aria-label="送信">
						送信
					</button>
				</form>
			</section>

			<aside className="detail-panel" aria-label="Workspace status">
				<section>
					<p className="eyebrow">Session</p>
					<h2>静かな作業場</h2>
					<p>
						{pending
							? "セッションを確認しています。"
							: "鍵は静かに保たれています。会話はローカル中核を優先します。"}
					</p>
				</section>
				<section className="detail-list">
					<div>
						<span>期限</span>
						<strong>{expiresAt}</strong>
					</div>
					<div>
						<span>保管</span>
						<strong>HttpOnly</strong>
					</div>
					<div>
						<span>方針</span>
						<strong>Local-first</strong>
					</div>
				</section>
			</aside>
		</main>
	);
}
