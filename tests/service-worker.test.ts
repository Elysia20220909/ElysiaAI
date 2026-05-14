import { describe, expect, it } from "bun:test";
import vm from "node:vm";

async function loadServiceWorker() {
	const listeners: Record<string, (event: any) => void> = {};
	const source = await Bun.file("public/sw.js").text();
	const sandbox = {
		self: {
			location: { origin: "https://elysia.example" },
			addEventListener(type: string, listener: (event: any) => void) {
				listeners[type] = listener;
			},
			skipWaiting: () => Promise.resolve(),
			clients: {
				claim: () => Promise.resolve(),
			},
		},
		caches: {
			open: () =>
				Promise.resolve({
					addAll: () => Promise.resolve(),
					put: () => Promise.resolve(),
				}),
			keys: () => Promise.resolve([]),
			delete: () => Promise.resolve(true),
			match: () => Promise.resolve(undefined),
		},
		fetch: () => Promise.resolve(new Response("asset")),
		URL,
		Response,
	};

	vm.runInNewContext(source, sandbox);
	return listeners;
}

describe("service worker routing", () => {
	it("does not intercept local core endpoints", async () => {
		const listeners = await loadServiceWorker();
		const dynamicPaths = [
			"/health",
			"/api/elysia-core/status",
			"/auth/session",
			"/elysia-love",
			"/feedback",
		];

		for (const path of dynamicPaths) {
			let intercepted = false;
			listeners.fetch({
				request: new Request(`https://elysia.example${path}`),
				respondWith: () => {
					intercepted = true;
				},
			});

			expect(intercepted).toBe(false);
		}
	});

	it("still intercepts static shell pages", async () => {
		const listeners = await loadServiceWorker();
		let intercepted = false;

		listeners.fetch({
			request: new Request("https://elysia.example/stark-ops.html"),
			respondWith: () => {
				intercepted = true;
			},
		});

		expect(intercepted).toBe(true);
	});
});
