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
	buildSuitDistributedOsSnapshot,
	planSuitDistributedOsRequest,
	SuitDistributedOsError,
} from "../lib/suit-distributed-os";
import {
	buildSuitEdgeRuntimeSnapshot,
	normalizeSuitEdgeHeartbeatBody,
	planSuitEdgeCommand,
	recordSuitEdgeHeartbeat,
	type SuitEdgeCommandKind,
	SuitEdgeRuntimeError,
} from "../lib/suit-edge-runtime";
import {
	buildSuitHardwareStatus,
	dispatchSuitHardwareOperation,
	normalizeSuitHardwareBody,
	planSuitHardwareOperation,
	SuitHardwareAdapterError,
} from "../lib/suit-hardware-adapter";
import {
	buildHoloLensReferenceProfile,
	planHoloLensVoiceCommand,
} from "../lib/suit-hololens-profile";
import {
	buildMark85ReferenceProfile,
	Mark85ProfileError,
	planMark85OperationalMode,
} from "../lib/suit-mark85-profile";
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

type SuitEdgePlanBody = {
	targetNodeId?: string;
	command?: SuitEdgeCommandKind;
	reason?: string;
	payload?: Record<string, unknown>;
};

type SuitOsPlanBody = {
	request?: string;
	relay?: SuitRelayKind;
};

type Mark85PlanBody = {
	modeId?: string;
	request?: string;
	relay?: SuitRelayKind;
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

function handleSuitEdgeError(error: unknown) {
	if (error instanceof SuitEdgeRuntimeError) {
		return jsonError(
			error.code === "SUIT_EDGE_NOT_FOUND" ? 404 : 400,
			error.message,
			error.code,
		);
	}
	return jsonError(
		500,
		error instanceof Error ? error.message : "Suit edge request failed",
		"SUIT_EDGE_FAILED",
	);
}

function handleSuitHardwareError(error: unknown) {
	if (error instanceof SuitHardwareAdapterError) {
		return jsonError(400, error.message, error.code);
	}
	return jsonError(
		500,
		error instanceof Error ? error.message : "Suit hardware request failed",
		"SUIT_HARDWARE_FAILED",
	);
}

function handleSuitDistributedOsError(error: unknown) {
	if (error instanceof SuitDistributedOsError) {
		return jsonError(400, error.message, error.code);
	}
	if (error instanceof SuitCommsError) return handleSuitCommsError(error);
	if (error instanceof SuitEdgeRuntimeError) return handleSuitEdgeError(error);
	return jsonError(
		500,
		error instanceof Error ? error.message : "Suit OS request failed",
		"SUIT_OS_FAILED",
	);
}

function handleMark85ProfileError(error: unknown) {
	if (error instanceof Mark85ProfileError) {
		return jsonError(
			error.code === "MARK85_MODE_NOT_FOUND" ? 404 : 400,
			error.message,
			error.code,
		);
	}
	if (error instanceof SuitCommsError) return handleSuitCommsError(error);
	return jsonError(
		500,
		error instanceof Error ? error.message : "Mark85 profile request failed",
		"MARK85_PROFILE_FAILED",
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
	.get("/api/suit/os/status", ({ request }) => {
		const session = requireNeuralSession(request);
		if (session instanceof Response) return session;
		return {
			session,
			os: buildSuitDistributedOsSnapshot(),
		};
	})
	.post(
		"/api/suit/os/plan",
		({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			try {
				const input = body as SuitOsPlanBody;
				return {
					session,
					plan: planSuitDistributedOsRequest({
						request: input.request ?? "",
						relay: input.relay,
						requestedBy: session.username,
					}),
					os: buildSuitDistributedOsSnapshot(),
				};
			} catch (error) {
				return handleSuitDistributedOsError(error);
			}
		},
		{
			body: t.Object({
				request: t.String(),
				relay: t.Optional(t.String()),
			}),
		},
	)
	.get("/api/suit/edge/status", ({ request }) => {
		const session = requireNeuralSession(request);
		if (session instanceof Response) return session;
		return {
			session,
			edge: buildSuitEdgeRuntimeSnapshot(),
		};
	})
	.get("/api/suit/hardware/status", ({ request }) => {
		const session = requireNeuralSession(request);
		if (session instanceof Response) return session;
		return {
			session,
			hardware: buildSuitHardwareStatus(),
		};
	})
	.get("/api/suit/hololens/profile", ({ request }) => {
		const session = requireNeuralSession(request);
		if (session instanceof Response) return session;
		return {
			session,
			profile: buildHoloLensReferenceProfile(),
		};
	})
	.get("/api/suit/mark85/profile", ({ request }) => {
		const session = requireNeuralSession(request);
		if (session instanceof Response) return session;
		return {
			session,
			profile: buildMark85ReferenceProfile(),
		};
	})
	.post(
		"/api/suit/mark85/plan",
		({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			try {
				const input = body as Mark85PlanBody;
				const modeIdOrRequest = input.modeId ?? input.request ?? "";
				if (!modeIdOrRequest.trim()) {
					return jsonError(
						400,
						"modeId or request is required",
						"MARK85_MODE_REQUIRED",
					);
				}
				return {
					session,
					plan: planMark85OperationalMode(
						modeIdOrRequest,
						session.username,
						input.relay,
					),
				};
			} catch (error) {
				return handleMark85ProfileError(error);
			}
		},
		{
			body: t.Object({
				modeId: t.Optional(t.String()),
				request: t.Optional(t.String()),
				relay: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/api/suit/hololens/command",
		({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			const phrase =
				body && typeof (body as { phrase?: unknown }).phrase === "string"
					? (body as { phrase: string }).phrase
					: "";
			if (!phrase.trim()) {
				return jsonError(
					400,
					"phrase is required",
					"SUIT_HOLOLENS_PHRASE_REQUIRED",
				);
			}

			return {
				session,
				plan: planHoloLensVoiceCommand(phrase, session.username),
			};
		},
		{
			body: t.Object({
				phrase: t.String(),
			}),
		},
	)
	.post(
		"/api/suit/hardware/plan",
		({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			try {
				return {
					session,
					plan: planSuitHardwareOperation(
						normalizeSuitHardwareBody(body, session.username),
					),
					hardware: buildSuitHardwareStatus(),
				};
			} catch (error) {
				return handleSuitHardwareError(error);
			}
		},
		{
			body: t.Any(),
		},
	)
	.post(
		"/api/suit/hardware/dispatch",
		async ({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			try {
				return {
					session,
					...(await dispatchSuitHardwareOperation(
						normalizeSuitHardwareBody(body, session.username),
					)),
					hardware: buildSuitHardwareStatus(),
				};
			} catch (error) {
				return handleSuitHardwareError(error);
			}
		},
		{
			body: t.Any(),
		},
	)
	.post(
		"/api/suit/edge/heartbeat",
		({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			try {
				return {
					session,
					node: recordSuitEdgeHeartbeat(normalizeSuitEdgeHeartbeatBody(body)),
					edge: buildSuitEdgeRuntimeSnapshot(),
				};
			} catch (error) {
				return handleSuitEdgeError(error);
			}
		},
		{
			body: t.Object({
				nodeId: t.String(),
				status: t.Optional(t.String()),
				cpuLoad: t.Optional(t.Number()),
				cpuTempC: t.Optional(t.Number()),
				voltage: t.Optional(t.Number()),
				signalQuality: t.Optional(t.Number()),
			}),
		},
	)
	.post(
		"/api/suit/edge/plan",
		({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			try {
				const input = body as SuitEdgePlanBody;
				if (!input.targetNodeId || !input.command) {
					return jsonError(
						400,
						"targetNodeId and command are required",
						"SUIT_EDGE_PLAN_REQUIRED",
					);
				}
				return {
					session,
					plan: planSuitEdgeCommand({
						targetNodeId: input.targetNodeId,
						command: input.command,
						reason: input.reason,
						payload: input.payload,
						requestedBy: session.username,
					}),
					edge: buildSuitEdgeRuntimeSnapshot(),
				};
			} catch (error) {
				return handleSuitEdgeError(error);
			}
		},
		{
			body: t.Object({
				targetNodeId: t.String(),
				command: t.String(),
				reason: t.Optional(t.String()),
				payload: t.Optional(t.Any()),
			}),
		},
	)
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
