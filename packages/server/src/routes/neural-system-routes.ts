import { Elysia, t } from "elysia";
import { jsonError } from "../lib/constants";
import {
	buildNeuralAuthStatusFromRequest,
	getNeuralAuthEvents,
	verifyNeuralAccessRequest,
} from "../lib/neural-auth-system";
import {
	buildSuitCommsStatus,
	buildSuitIntent,
	evaluateSuitLocalAI,
	evaluateSuitPolicy,
	receiveSuitEnvelope,
	SuitCommsError,
	type SuitIntentKind,
	type SuitRelayKind,
	sealSuitEnvelope,
} from "../lib/suit-comms";
import {
	buildSuitStatus,
	executeSuitCommand,
	getCinematicPresets,
	getSuitTelemetry,
	type SuitCommand,
} from "../lib/suit-system";

const suitCommands: SuitCommand[] = [
	"status",
	"scan",
	"repair",
	"shield",
	"cloak",
	"standby",
	"calibrate",
];

type SuitIntentBody = {
	kind: SuitIntentKind;
	relay?: SuitRelayKind;
	reason?: string;
	command?: SuitCommand;
	payload?: Record<string, unknown>;
};

function requireNeuralSession(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return jsonError(
			error instanceof Error && error.message === "CSRF token mismatch"
				? 403
				: 401,
			error instanceof Error ? error.message : "Neural auth failed",
		);
	}
}

function handleSuitCommsError(error: unknown) {
	if (error instanceof SuitCommsError) {
		return jsonError(
			error.code === "SUIT_REPLAY_DETECTED" ? 409 : 400,
			error.message,
			error.code,
		);
	}
	return jsonError(
		500,
		error instanceof Error ? error.message : "Suit comms request failed",
		"SUIT_COMMS_FAILED",
	);
}

export const neuralSystemRoutes = new Elysia()
	.get("/api/neural-auth/status", ({ request }) => {
		try {
			return buildNeuralAuthStatusFromRequest(request);
		} catch (error) {
			return jsonError(
				error instanceof Error && error.message === "CSRF token mismatch"
					? 403
					: 401,
				error instanceof Error ? error.message : "Neural auth failed",
			);
		}
	})
	.get("/api/neural-auth/events", ({ request }) => {
		const session = requireNeuralSession(request);
		if (session instanceof Response) return session;
		return {
			session,
			events: getNeuralAuthEvents(),
		};
	})
	.get("/api/suit/status", ({ request }) => {
		const session = requireNeuralSession(request);
		if (session instanceof Response) return session;
		return {
			session,
			status: buildSuitStatus(),
			presets: getCinematicPresets(),
		};
	})
	.get("/api/suit/telemetry", ({ request }) => {
		const session = requireNeuralSession(request);
		if (session instanceof Response) return session;
		return {
			session,
			telemetry: getSuitTelemetry(),
		};
	})
	.get("/api/suit/comms/status", ({ request }) => {
		const session = requireNeuralSession(request);
		if (session instanceof Response) return session;
		return {
			session,
			...buildSuitCommsStatus(),
		};
	})
	.post(
		"/api/suit/comms/seal",
		({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			try {
				const input = body as SuitIntentBody;
				const intent = buildSuitIntent({
					kind: input.kind,
					relay: input.relay,
					reason: input.reason,
					command: input.command,
					payload: input.payload,
					requestedBy: session.username,
				});
				return {
					session,
					intent,
					envelope: sealSuitEnvelope(intent),
				};
			} catch (error) {
				return handleSuitCommsError(error);
			}
		},
		{
			body: t.Object({
				kind: t.String(),
				relay: t.Optional(t.String()),
				reason: t.Optional(t.String()),
				command: t.Optional(t.String()),
				payload: t.Optional(t.Any()),
			}),
		},
	)
	.post(
		"/api/suit/comms/receive",
		({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			try {
				const payload = body as { envelope?: unknown };
				return {
					session,
					...receiveSuitEnvelope(payload.envelope ?? body),
				};
			} catch (error) {
				return handleSuitCommsError(error);
			}
		},
		{
			body: t.Any(),
		},
	)
	.post(
		"/api/suit/command",
		({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			const command = (body as { command: SuitCommand }).command;
			if (!suitCommands.includes(command)) {
				return jsonError(400, "Unsupported suit command");
			}

			try {
				const localAI = evaluateSuitLocalAI();
				const intent = buildSuitIntent({
					kind: "command",
					relay: "wifi_lan",
					command,
					requestedBy: session.username,
					reason: "authenticated manual HUD command",
				});
				const policy = evaluateSuitPolicy(intent, localAI);
				if (policy.decision === "deny") {
					return jsonError(
						403,
						"Suit command denied by policy gate",
						"SUIT_POLICY_DENIED",
						{
							policy,
						},
					);
				}

				return {
					session,
					intent,
					policy: {
						...policy,
						manualConfirmationAccepted: policy.decision === "confirm",
					},
					localAI,
					...executeSuitCommand(command),
				};
			} catch (error) {
				return handleSuitCommsError(error);
			}
		},
		{
			body: t.Object({
				command: t.String(),
			}),
		},
	);
