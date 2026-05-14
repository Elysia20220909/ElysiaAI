(() => {
	const status = document.getElementById("pwa-shell-state");
	const statusLabel = status?.querySelector("[data-pwa-label]");
	const installGuide = document.getElementById("install-guide");
	const installCoach = document.getElementById("install-coach");
	const installCopy = document.getElementById("install-copy");
	const installAction = document.getElementById("install-action");
	const installDismiss = document.getElementById("install-dismiss");
	const stepOne = document.getElementById("install-step-one");
	const stepTwo = document.getElementById("install-step-two");
	const stepThree = document.getElementById("install-step-three");
	const themeMeta = document.querySelector('meta[name="theme-color"]');
	const sectionLinks = Array.from(
		document.querySelectorAll("[data-section-nav]"),
	);

	let deferredPrompt = null;

	function isStandalone() {
		return (
			window.matchMedia("(display-mode: standalone)").matches ||
			window.navigator.standalone === true
		);
	}

	function isIosLike() {
		const ua = window.navigator.userAgent.toLowerCase();
		return (
			/iphone|ipad|ipod/.test(ua) ||
			(window.navigator.platform === "MacIntel" &&
				window.navigator.maxTouchPoints > 1)
		);
	}

	function isSafariFamily() {
		const ua = window.navigator.userAgent;
		return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
	}

	function setStatus(text, tone = "unknown") {
		if (!status || !statusLabel) return;
		status.classList.add("is-swapping");
		window.setTimeout(() => {
			statusLabel.textContent = text;
			status.className = `hud-pill ${tone}`;
		}, 90);
	}

	function syncMobileTheme() {
		const standalone = isStandalone();
		document.documentElement.dataset.displayMode = standalone
			? "standalone"
			: "browser";
		document.body.classList.toggle("standalone-shell", standalone);
		if (themeMeta) {
			themeMeta.setAttribute("content", standalone ? "#f7f7f5" : "#101010");
		}
	}

	function syncChromeState() {
		document.documentElement.classList.toggle("scrolled", window.scrollY > 8);
		let currentId = sectionLinks[0]?.dataset.sectionNav || "";
		for (const link of sectionLinks) {
			const id = link.dataset.sectionNav;
			if (!id) continue;
			const target = document.getElementById(id);
			if (target && target.getBoundingClientRect().top <= 136) {
				currentId = id;
			}
		}

		for (const link of sectionLinks) {
			if (link.dataset.sectionNav === currentId) {
				link.setAttribute("aria-current", "page");
			} else {
				link.removeAttribute("aria-current");
			}
		}
	}

	async function registerServiceWorker(options = {}) {
		if (!("serviceWorker" in navigator)) {
			setStatus("Browser shell", "unknown");
			return null;
		}

		try {
			const registration = await navigator.serviceWorker.register(
				"/sw.js",
				{ scope: "/" },
			);
			if (options.force && registration.update) {
				await registration.update();
			}

			const ready = await navigator.serviceWorker.ready;
			setStatus(ready.active ? "PWA shell ready" : "PWA shell warming", "ready");
			return registration;
		} catch {
			setStatus("PWA shell offline", "attention");
			return null;
		}
	}

	function setIosCoachCopy() {
		const safari = isSafariFamily();
		if (!installCopy || !stepOne || !stepTwo || !stepThree || !installAction) {
			return;
		}

		installCopy.textContent = safari
			? "Use Share, choose Add to Home Screen, then confirm Add."
			: "Open this page in Safari first. Then use Share and Add to Home Screen.";
		stepOne.textContent = safari ? "Share" : "Open Safari";
		stepTwo.textContent = "Add to Home Screen";
		stepThree.textContent = "Add";
		installAction.textContent = "Got it";
	}

	function setPromptCoachCopy() {
		if (!installCopy || !stepOne || !stepTwo || !stepThree || !installAction) {
			return;
		}

		installCopy.textContent =
			"Install the local ops shell for faster return visits and offline fallback.";
		stepOne.textContent = "Install";
		stepTwo.textContent = "Confirm";
		stepThree.textContent = "Launch";
		installAction.textContent = "Install app";
	}

	function openCoach() {
		if (!installCoach) return;
		if (deferredPrompt) {
			setPromptCoachCopy();
		} else {
			setIosCoachCopy();
		}
		installCoach.hidden = false;
		window.requestAnimationFrame(() => installAction?.focus());
	}

	function closeCoach() {
		if (installCoach) installCoach.hidden = true;
	}

	function updateInstallAffordance() {
		if (!installGuide) return;
		const shouldShow =
			!isStandalone() && (Boolean(deferredPrompt) || isIosLike());
		installGuide.hidden = !shouldShow;
		if (isStandalone()) {
			setStatus("Standalone", "ready");
		}
	}

	async function handleInstallAction() {
		if (!deferredPrompt) {
			closeCoach();
			return;
		}

		const prompt = deferredPrompt;
		deferredPrompt = null;
		closeCoach();
		prompt.prompt();
		try {
			const choice = await prompt.userChoice;
			setStatus(
				choice?.outcome === "accepted" ? "Install accepted" : "Install later",
				choice?.outcome === "accepted" ? "ready" : "partial",
			);
		} catch {
			setStatus("Install deferred", "partial");
		}
		updateInstallAffordance();
	}

	window.addEventListener("beforeinstallprompt", (event) => {
		event.preventDefault();
		deferredPrompt = event;
		setStatus("Install available", "partial");
		updateInstallAffordance();
	});

	window.addEventListener("appinstalled", () => {
		deferredPrompt = null;
		closeCoach();
		setStatus("Installed", "ready");
		updateInstallAffordance();
	});

	installGuide?.addEventListener("click", openCoach);
	installDismiss?.addEventListener("click", closeCoach);
	installAction?.addEventListener("click", handleInstallAction);
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && installCoach && !installCoach.hidden) {
			closeCoach();
			installGuide?.focus();
		}
	});

	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState !== "visible") return;
		syncMobileTheme();
		void registerServiceWorker({ force: true });
	});

	window.addEventListener("orientationchange", () => {
		window.setTimeout(() => {
			syncMobileTheme();
			void registerServiceWorker({ force: true });
		}, 250);
	});

	window.addEventListener("pageshow", (event) => {
		syncMobileTheme();
		if (event.persisted) {
			void registerServiceWorker({ force: true });
		}
		updateInstallAffordance();
	});

	window.addEventListener("online", () => {
		void registerServiceWorker({ force: true });
	});

	document.addEventListener("scroll", syncChromeState, { passive: true });
	window.addEventListener("resize", syncChromeState);

	syncMobileTheme();
	syncChromeState();
	updateInstallAffordance();
	void registerServiceWorker();
})();
