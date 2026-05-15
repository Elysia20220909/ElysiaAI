import { Elysia, t } from "elysia";
import { blackwallRuntime } from "../lib/blackwall-runtime";

export const blackwallRoutes = new Elysia({ prefix: "/api/blackwall" })
	.get("/status", () => blackwallRuntime.getStatus())
	.post(
		"/evaluate",
		({ body }) => {
			return blackwallRuntime.evaluate(body);
		},
		{
			body: t.Object({
				process: t.Optional(t.String()),
				destination: t.Optional(t.String()),
				action: t.Optional(t.String()),
				reason: t.Optional(t.String()),
				labContext: t.Optional(t.Boolean()),
				localOnly: t.Optional(t.Boolean()),
				externalRequest: t.Optional(t.Boolean()),
				credentialAccess: t.Optional(t.Boolean()),
				selfModification: t.Optional(t.Boolean()),
				networkScanBehavior: t.Optional(t.Boolean()),
				reverseShellBehavior: t.Optional(t.Boolean()),
				promptInjectionSignal: t.Optional(t.Boolean()),
				fileReadSpike: t.Optional(t.Boolean()),
			}),
		},
	)
	.post(
		"/blackout",
		({ body }) => {
			const reason = body.reason || "Manual BLACKWALL Local Blackout request.";
			blackwallRuntime.activateLocalBlackout(reason);
			return blackwallRuntime.getStatus();
		},
		{
			body: t.Object({
				reason: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/blackout/release",
		({ body }) => {
			const reason = body.reason || "Manual BLACKWALL Local Blackout release.";
			blackwallRuntime.releaseLocalBlackout(reason);
			return blackwallRuntime.getStatus();
		},
		{
			body: t.Object({
				reason: t.Optional(t.String()),
			}),
		},
	);
