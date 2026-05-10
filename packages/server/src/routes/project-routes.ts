import { Elysia } from "elysia";
import { authErrorResponse } from "../lib/auth-cookies";
import { verifyNeuralAccessRequest } from "../lib/neural-auth-system";
import { buildProjectMissionControl } from "../lib/project-orchestrator";

function requireProjectOperator(request: Request) {
	try {
		return verifyNeuralAccessRequest(request);
	} catch (error) {
		return authErrorResponse(error, "Project auth failed");
	}
}

export const projectRoutes = new Elysia({ prefix: "/api/project" })
	.get("/status", async ({ request }) => {
		const operator = requireProjectOperator(request);
		if (operator instanceof Response) return operator;

		return await buildProjectMissionControl({
			username: operator.username,
			role: operator.role,
			neuralSignature: operator.neuralSignature,
		});
	})
	.get("/manifest", ({ request }) => {
		const operator = requireProjectOperator(request);
		if (operator instanceof Response) return operator;

		return {
			name: "ElysiaAI",
			codename: "ElysiaProjectControl",
			mode: "local-first",
			operator: {
				username: operator.username,
				role: operator.role,
				neuralSignature: operator.neuralSignature,
			},
			contracts: [
				"Neural Auth protects operator surfaces",
				"ECP/1.0 signs Core protocol frames",
				"FastAPI kernel remains local",
				"Nanotech Suit commands are fictional and manual-only",
				"Project status aggregates readiness without exposing secrets",
			],
			entrypoints: [
				"/api/project/status",
				"/api/elysia-core/protocol",
				"/api/elysia-core/chat",
				"/api/neural-auth/status",
				"/api/suit/status",
			],
			generatedAt: new Date().toISOString(),
		};
	});
