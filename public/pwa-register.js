(() => {
	const INSTALL_TIP_KEY = "elysia_ios_install_tip_dismissed";

	function isStandalone() {
		return (
			window.matchMedia("(display-mode: standalone)").matches ||
			window.navigator.standalone === true
		);
	}

	function isMobileSafari() {
		const ua = window.navigator.userAgent;
		const iOS =
			/iPhone|iPad|iPod/.test(ua) ||
			(window.navigator.platform === "MacIntel" &&
				window.navigator.maxTouchPoints > 1);
		return iOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
	}

	function getStored(key) {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	}

	function setStored(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch {}
	}

	function requestRehydrate() {
		if (!("serviceWorker" in navigator)) return;
		const message = { type: "rehydrate" };
		if (navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage(message);
			return;
		}
		navigator.serviceWorker.ready
			.then((registration) => registration.active?.postMessage(message))
			.catch(() => {});
	}

	function showIosInstallTip() {
		if (!isMobileSafari() || isStandalone()) return;
		if (getStored(INSTALL_TIP_KEY) === "1") return;

		const tip = document.createElement("div");
		tip.setAttribute("role", "status");
		tip.innerHTML = `
			<div style="
				position:fixed;left:16px;right:16px;bottom:16px;
				padding:12px 14px;border-radius:12px;
				background:rgba(0,0,0,.82);color:#fff;font-size:14px;line-height:1.4;
				-webkit-backdrop-filter:saturate(180%) blur(10px);backdrop-filter:saturate(180%) blur(10px);
				padding-bottom:calc(12px + env(safe-area-inset-bottom));
				z-index:9999;box-shadow:0 16px 40px rgba(0,0,0,.35);">
				<button id="elysia-ios-install-tip-close" type="button" style="float:right;background:#fff;color:#000;border:none;border-radius:8px;padding:6px 10px;margin-left:8px;font-size:14px;">OK</button>
				<b>ホーム画面に追加</b><br>
				共有ボタンから「ホーム画面に追加」を選ぶと、Elysiaをすぐ呼び戻せます。
			</div>`;
		document.body.appendChild(tip);
		document
			.getElementById("elysia-ios-install-tip-close")
			?.addEventListener("click", () => {
				setStored(INSTALL_TIP_KEY, "1");
				tip.remove();
			});
	}

	if ("serviceWorker" in navigator) {
		window.addEventListener("load", () => {
			navigator.serviceWorker
				.register("/sw.js", { scope: "/" })
				.then(() => {
					console.info("ElysiaAI service worker ready");
					requestRehydrate();
				})
				.catch((error) =>
					console.warn("ElysiaAI service worker registration failed", error),
				);
		});
	}

	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") {
			requestRehydrate();
		}
	});

	window.addEventListener("pageshow", (event) => {
		if (event.persisted) {
			requestRehydrate();
		}
	});

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", showIosInstallTip, { once: true });
	} else {
		showIosInstallTip();
	}
})();
