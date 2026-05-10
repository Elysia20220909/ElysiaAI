"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthSession } from "../../lib/auth-api";
import { getSession, logout } from "../../lib/auth-api";

export default function DashboardClient() {
	const router = useRouter();
	const [session, setSession] = useState<AuthSession | null>(null);
	const [pending, setPending] = useState(true);
	const [loggingOut, setLoggingOut] = useState(false);

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

	const user = session?.user;

	return (
		<main className="auth-shell" aria-labelledby="dashboard-title">
			<section className="dashboard-panel">
				<div className="brand-row">
					<div className="brand-mark" aria-hidden="true">
						E
					</div>
					<div>
						<p className="eyebrow">ElysiaAI</p>
						<h1 id="dashboard-title">ワークスペース</h1>
					</div>
				</div>

				<p className="lead">
					{pending ? "セッションを確認しています。" : "鍵は静かに保たれています。"}
				</p>

				<dl className="session-list" aria-label="Session details">
					<div>
						<dt>ユーザー</dt>
						<dd>{user?.username ?? "確認中"}</dd>
					</div>
					<div>
						<dt>ロール</dt>
						<dd>{user?.role ?? "確認中"}</dd>
					</div>
					<div>
						<dt>期限</dt>
						<dd>{session?.expiresAt ? new Date(session.expiresAt).toLocaleString("ja-JP") : "確認中"}</dd>
					</div>
				</dl>

				<div className="dashboard-actions">
					<button className="secondary-action" type="button" disabled={loggingOut} onClick={handleLogout}>
						{loggingOut ? "ログアウト中" : "ログアウト"}
					</button>
				</div>
			</section>
		</main>
	);
}
