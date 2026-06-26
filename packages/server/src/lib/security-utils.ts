import { config } from "../../../../src/config.ts";

export const applySecurityHeaders = (set: any, url: string) => {
	const csp = config.cspEnabled
		? "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; img-src 'self' data: https:; connect-src 'self' ws: wss: https:;"
		: "";

	const securityHeaders: Record<string, string> = {
		"X-Content-Type-Options": "nosniff",
		"X-Permitted-Cross-Domain-Policies": "none",
		"X-Frame-Options": "DENY",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"X-XSS-Protection": "1; mode=block",
	};

	const headers = set.headers as any;

	for (const [key, value] of Object.entries(securityHeaders)) {
		headers[key] = value;
	}

	const reqUrl = new URL(url);
	if (csp && !reqUrl.pathname.startsWith("/openapi")) {
		headers["Content-Security-Policy"] = csp;
	}

	if (config.forceHttps || url.startsWith("https://")) {
		headers["Strict-Transport-Security"] =
			"max-age=31536000; includeSubDomains";
	}
};
