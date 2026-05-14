interface AssetBinding {
	fetch(input: Request | URL | string): Promise<Response>;
}

interface Env {
	ASSETS: AssetBinding;
}

const jsonHeaders = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(body, null, 2), {
		...init,
		headers: {
			...jsonHeaders,
			...(init?.headers || {}),
		},
	});
}

function localCoreResponse(pathname: string) {
	return jsonResponse(
		{
			ok: false,
			status: "local-core-not-exposed",
			path: pathname,
			message:
				"This Cloudflare edge surface serves public assets only. Run the local Bun/FastAPI stack for private AI, database, and automation APIs.",
		},
		{ status: 403 },
	);
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			const origin = request.headers.get("origin");
			const corsHeaders: Record<string, string> = {
				"access-control-allow-methods": "GET, POST, OPTIONS",
				"access-control-allow-headers": "content-type, authorization",
			};
			if (origin === url.origin) {
				corsHeaders["access-control-allow-origin"] = origin;
			}
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		if (url.pathname === "/health" || url.pathname === "/api/health") {
			return jsonResponse({
				ok: true,
				status: "edge",
				service: "elysia-ai-cloudflare-edge",
				localFirstCore: "not_exposed",
				timestamp: new Date().toISOString(),
			});
		}

		if (
			url.pathname.startsWith("/api/") ||
			url.pathname.startsWith("/auth/") ||
			url.pathname === "/elysia-love" ||
			url.pathname === "/feedback"
		) {
			return localCoreResponse(url.pathname);
		}

		return env.ASSETS.fetch(request);
	},
};
