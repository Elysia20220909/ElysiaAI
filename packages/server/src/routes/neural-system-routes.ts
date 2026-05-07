import { Elysia, t } from "elysia";
import { jsonError } from "../lib/constants";
import {
	buildNeuralAuthStatus,
	getNeuralAuthEvents,
	verifyNeuralAccessToken,
} from "../lib/neural-auth-system";
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

function requireNeuralSession(request: Request) {
	try {
		return verifyNeuralAccessToken(request.headers.get("authorization"));
	} catch (error) {
		return jsonError(
			401,
			error instanceof Error ? error.message : "Neural auth failed",
		);
	}
}

export const neuralSystemRoutes = new Elysia()
	.get("/api/neural-auth/status", ({ request }) => {
		try {
			return buildNeuralAuthStatus(request.headers.get("authorization"));
		} catch (error) {
			return jsonError(
				401,
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
	.post(
		"/api/suit/command",
		({ request, body }) => {
			const session = requireNeuralSession(request);
			if (session instanceof Response) return session;

			const command = (body as { command: SuitCommand }).command;
			if (!suitCommands.includes(command)) {
				return jsonError(400, "Unsupported suit command");
			}

			return {
				session,
				...executeSuitCommand(command),
			};
		},
		{
			body: t.Object({
				command: t.String(),
			}),
		},
	);
