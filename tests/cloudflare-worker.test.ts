import { describe, expect, it } from "bun:test";
import worker from "../cloudflare/worker";

const env = {
	ASSETS: {
		fetch: async () => new Response("asset"),
	},
};

function fetchWorker(path: string, init?: RequestInit): Promise<Response> {
	return worker.fetch(new Request(`https://elysia.example${path}`, init), env);
}

describe("Cloudflare edge worker", () => {
	it("serves edge health without exposing the local core", async () => {
		const response = await fetchWorker("/health");
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.status).toBe("edge");
		expect(data.localFirstCore).toBe("not_exposed");
	});

	it("rejects private API routes as expected client errors", async () => {
		const response = await fetchWorker("/auth/dev-login", { method: "POST" });
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.status).toBe("local-core-not-exposed");
		expect(data.path).toBe("/auth/dev-login");
	});

	it("falls through to the static asset binding for public pages", async () => {
		const response = await fetchWorker("/");

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("asset");
	});
});
