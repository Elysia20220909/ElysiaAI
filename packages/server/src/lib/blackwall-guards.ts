import { authErrorResponse, requireAccessToken } from "./auth-cookies";
import { jsonError } from "./constants";

const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const MAX_TEXT_LENGTH = 256;

export function getClientIp(request: Request): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		new URL(request.url).hostname ||
		"127.0.0.1"
	).replace(/^::ffff:/, "");
}

export function isLocalRequest(request: Request): boolean {
	const url = new URL(request.url);
	const ip = getClientIp(request);
	return LOCAL_HOSTS.has(url.hostname) && LOCAL_HOSTS.has(ip);
}

export function requireLocalBlackwallRequest(request: Request): Response | null {
	if (isLocalRequest(request)) {
		return null;
	}

	return jsonError(403, "BLACKWALL local runtime routes require localhost access", "BLACKWALL_LOCAL_ONLY");
}

export function requireBlackwallOperator(request: Request): Response | null {
	const localError = requireLocalBlackwallRequest(request);
	if (localError) return localError;

	try {
		requireAccessToken(request);
		return null;
	} catch (error) {
		return authErrorResponse(error);
	}
}

export function clampBlackwallText(value?: string): string | undefined {
	if (value === undefined) return undefined;
	return value.slice(0, MAX_TEXT_LENGTH);
}

export function sanitizeBlackwallInput<T extends Record<string, unknown>>(input: T): T {
	return {
		...input,
		process: clampBlackwallText(input.process as string | undefined),
		destination: clampBlackwallText(input.destination as string | undefined),
		action: clampBlackwallText(input.action as string | undefined),
		reason: clampBlackwallText(input.reason as string | undefined),
	} as T;
}
