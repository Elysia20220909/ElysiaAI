import { Elysia, t } from "elysia";
import { blackwallRuntime } from "../lib/blackwall-runtime";
import {
	requireBlackwallOperator,
	requireLocalBlackwallRequest,
	sanitizeBlackwallInput,
} from "../lib/blackwall-guards";

export const blackwallRoutes = new Elysia({ prefix: "/api/blackwall" })
	.get("/status", ({ request }) => {
		const error = requireLocalBlackwallRequest(request);
		if (error) return error;
		return blackwallRuntime.getStatus();
	})
	.post(
		"/evaluate",
		({ body, request }) => {
			const error = requireLocalBlackwallRequest(request);
			if (error) return error;

			return blackwallRuntime.evaluate(sanitizeBlackwallInput(body));
		},
		{
			body: t.Object({
				process: t.Optional(t.String({ maxLength: 256 })),
				destination: t.Optional(t.String({ maxLength: 256 })),
				action: t.Optional(t.String({ maxLength: 256 })),
				reason: t.Optional(t.String({ maxLength: 256 })),
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
		({ body, request }) => {
			const error = requireBlackwallOperator(request);
			if (error) return error;

			const reason = body.reason || "Manual BLACKWALL Local Blackout request.";
			blackwallRuntime.activateLocalBlackout(reason);
			return blackwallRuntime.getStatus();
		},
		{
			body: t.Object({
				reason: t.Optional(t.String({ maxLength: 256 })),
			}),
		},
	)
	.post(
		"/blackout/release",
		({ body, request }) => {
			const error = requireBlackwallOperator(request);
			if (error) return error;

			const reason = body.reason || "Manual BLACKWALL Local Blackout release.";
			blackwallRuntime.releaseLocalBlackout(reason);
			return blackwallRuntime.getStatus();
		},
		{
			body: t.Object({
				reason: t.Optional(t.String({ maxLength: 256 })),
			}),
		},
	);
