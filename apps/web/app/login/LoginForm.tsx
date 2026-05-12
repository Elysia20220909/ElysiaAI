"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { ApiRequestError, getSession, login } from "../../lib/auth-api";

const errorMessages: Record<string, string> = {
	AUTH_INVALID_CREDENTIALS: "ユーザー名またはパスワードが違います。",
	CSRF_TOKEN_INVALID: "画面を更新して、もう一度お試しください。",
	AUTH_TOKEN_INVALID: "セッションの期限が切れました。もう一度ログインしてください。",
};

export default function LoginForm() {
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState("未接続");
	const [pending, setPending] = useState(false);

	useEffect(() => {
		let active = true;
		getSession()
			.then((session) => {
				if (active && session.authenticated) router.replace("/dashboard");
			})
			.catch(() => {
				if (active) setStatus("未接続");
			});
		return () => {
			active = false;
		};
	}, [router]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const trimmedUsername = username.trim();
		if (!trimmedUsername || !password) {
			setError("ユーザー名とパスワードを入力してください。");
			return;
		}

		setPending(true);
		setStatus("合鍵を照合しています。");
		try {
			await login(trimmedUsername, password);
			setStatus(`${trimmedUsername} として接続しました。`);
			router.replace("/dashboard");
		} catch (caught) {
			const message =
				caught instanceof ApiRequestError
					? errorMessages[caught.code] || caught.message
					: "認証に失敗しました。";
			setError(message);
			setStatus("接続できませんでした。入力を確かめてください。");
		} finally {
			setPending(false);
		}
	}

	return (
		<main className="auth-shell" aria-labelledby="auth-title">
			<section className="auth-panel">
				<div className="brand-row">
					<div className="brand-mark" aria-hidden="true">
						E
					</div>
					<div>
						<p className="eyebrow">ElysiaAI</p>
						<h1 id="auth-title">サインイン</h1>
					</div>
				</div>

				<p className="lead">いつもの合鍵で、静かにローカルの作業場へ戻ります。</p>

				<form className="auth-form" onSubmit={handleSubmit} noValidate>
					<label className="field">
						<span>ユーザー名</span>
						<input
							type="text"
							name="username"
							autoComplete="username"
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							required
						/>
					</label>

					<label className="field">
						<span>パスワード</span>
						<input
							type="password"
							name="password"
							autoComplete="current-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							required
						/>
					</label>

					{error ? (
						<div className="message message-error" role="alert">
							{error}
						</div>
					) : null}

					<button className="primary-action" type="submit" disabled={pending} aria-busy={pending}>
						{pending ? "確認中" : "ログイン"}
					</button>
				</form>

				<dl className="session-list" aria-label="Session status">
					<div>
						<dt>セッション</dt>
						<dd>{pending ? "確認中" : "待機中"}</dd>
					</div>
					<div>
						<dt>見張り</dt>
						<dd>静穏</dd>
					</div>
					<div>
						<dt>保管</dt>
						<dd>HttpOnly</dd>
					</div>
				</dl>

				<p className={`status-text ${status.includes("接続しました") ? "is-linked" : ""}`} aria-live="polite">
					{status}
				</p>
			</section>
		</main>
	);
}
