import { describe, expect, it } from "bun:test";

describe("PWA install surface", () => {
	it("links install metadata and registers the shell from the landing page", async () => {
		const index = await Bun.file("public/index.html").text();

		expect(index).toContain(
			'<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">',
		);
		expect(index).toContain('<link rel="manifest" href="/manifest.json">');
		expect(index).toContain(
			'<link rel="apple-touch-icon" href="/icons/icon-192.png">',
		);
		expect(index).toContain(
			'<script src="/assets/js/liquid-glass-webgl.js" defer></script>',
		);
		expect(index).toContain('<script src="/pwa-register.js" defer></script>');
		expect(index).toContain('id="liquidGlassWebgl"');
		expect(index).toContain("env(safe-area-inset-top, 0px)");
		expect(index).toContain("min-height: 100dvh");
		expect(index).toContain("-webkit-overflow-scrolling: touch");
	});

	it("registers the root service worker and refreshes it after iOS resumes", async () => {
		const source = await Bun.file("public/pwa-register.js").text();

		expect(source).toContain('"serviceWorker" in navigator');
		expect(source).toContain('.register("/sw.js", { scope: "/" })');
		expect(source).toContain('type: "rehydrate"');
		expect(source).toContain("visibilitychange");
		expect(source).toContain("elysia_ios_install_tip_dismissed");
		expect(source).toContain("ホーム画面に追加");
	});

	it("lets the service worker rehydrate critical shell assets", async () => {
		const source = await Bun.file("public/sw.js").text();

		expect(source).toContain('CACHE_NAME = "elysiaai-shell-v6"');
		expect(source).toContain('"/assets/js/liquid-glass-webgl.js"');
		expect(source).toContain("async function rehydrateShell()");
		expect(source).toContain('cache: "no-store"');
		expect(source).toContain('event.data?.type !== "rehydrate"');
	});

	it("ships an installable manifest with existing local icons", async () => {
		const manifest = await Bun.file("public/manifest.json").json();

		expect(manifest.name).toBe("ElysiaAI");
		expect(manifest.short_name).toBe("Elysia");
		expect(manifest.start_url).toBe("/");
		expect(manifest.display).toBe("standalone");
		expect(manifest.scope).toBe("/");

		for (const icon of manifest.icons) {
			expect(await Bun.file(`public${icon.src}`).exists()).toBe(true);
		}
	});

	it("keeps the Tauri shell ready for root-scoped service workers", async () => {
		const config = await Bun.file("src-tauri/tauri.conf.json").json();
		const security = config.app.security;

		expect(security.headers["Service-Worker-Allowed"]).toBe("/");
		expect(security.csp).toContain("worker-src 'self'");
		expect(security.csp).toContain("manifest-src 'self'");
	});
});
