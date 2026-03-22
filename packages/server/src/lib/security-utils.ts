// biome-ignore lint/suspicious/noExplicitAny: Generic any for Elysia set object
export const applySecurityHeaders = (set: any, url: string) => {
	const csp =
		"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:;";

	const securityHeaders: Record<string, string> = {
		"X-Content-Type-Options": "nosniff",
		"X-Permitted-Cross-Domain-Policies": "none",
		"X-Frame-Options": "DENY",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"X-XSS-Protection": "1; mode=block",
		"Cross-Origin-Opener-Policy": "same-origin",
	};

	// biome-ignore lint/suspicious/noExplicitAny: Elysia set headers dynamic manipulation
	const headers = set.headers as any;

	for (const [key, value] of Object.entries(securityHeaders)) {
		headers[key] = value;
	}

	const reqUrl = new URL(url);
	if (!reqUrl.pathname.startsWith("/swagger")) {
		headers["Content-Security-Policy"] = csp;
	}

	if (url.startsWith("https://")) {
		headers["Strict-Transport-Security"] =
			"max-age=31536000; includeSubDomains";
	}
};
