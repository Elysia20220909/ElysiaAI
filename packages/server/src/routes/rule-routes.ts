import { Elysia, t } from "elysia";
import {
	type AccessTokenPayload,
	authErrorResponse,
	requireAccessToken,
} from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import { logger } from "../lib/logger";
import {
	defaultRuleStore,
	type RuleCreateInput,
	type RuleStore,
	RuleStoreError,
	type RuleUpdateInput,
} from "../lib/rule-store";

const ruleCreateBody = t.Object({
	title: t.String({ minLength: 1, maxLength: 120 }),
	body: t.String({ minLength: 1, maxLength: 4000 }),
	scope: t.Union([
		t.Literal("engineering"),
		t.Literal("legal"),
		t.Literal("security"),
		t.Literal("operations"),
	]),
	severity: t.Union([
		t.Literal("info"),
		t.Literal("warning"),
		t.Literal("critical"),
	]),
	status: t.Optional(t.Union([t.Literal("active"), t.Literal("disabled")])),
});

const ruleUpdateBody = t.Object({
	title: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
	body: t.Optional(t.String({ minLength: 1, maxLength: 4000 })),
	scope: t.Optional(
		t.Union([
			t.Literal("engineering"),
			t.Literal("legal"),
			t.Literal("security"),
			t.Literal("operations"),
		]),
	),
	severity: t.Optional(
		t.Union([t.Literal("info"), t.Literal("warning"), t.Literal("critical")]),
	),
	status: t.Optional(t.Union([t.Literal("active"), t.Literal("disabled")])),
});

function requireRuleOperator(request: Request): AccessTokenPayload | Response {
	try {
		return requireAccessToken(request);
	} catch (error) {
		return authErrorResponse(error, "Rule management auth failed");
	}
}

function requireRuleAdmin(payload: AccessTokenPayload): Response | null {
	const role = String(payload.role || "user");
	if (role === "admin" || role === "owner") return null;
	return jsonError(403, "Admin role required", "RULE_ADMIN_REQUIRED");
}

function handleRuleError(error: unknown): Response {
	if (error instanceof RuleStoreError) {
		return jsonError(error.status, error.message, error.code);
	}

	logger.error(
		"Rule management request failed",
		error instanceof Error ? error : new Error(String(error)),
	);
	return jsonError(
		500,
		"Rule management request failed",
		"RULE_REQUEST_FAILED",
	);
}

export function createRuleRoutes(store: RuleStore = defaultRuleStore) {
	return new Elysia({ prefix: "/api/rules" }).guard(
		{
			beforeHandle: ({ request }) => {
				const operator = requireRuleOperator(request);
				if (operator instanceof Response) return operator;
			},
		},
		(app) =>
			app
				.get("/", async () => {
					try {
						return await store.list();
					} catch (error) {
						return handleRuleError(error);
					}
				})
				.get("/summary", async () => {
					try {
						return await store.summary();
					} catch (error) {
						return handleRuleError(error);
					}
				})
				.get("/:id", async ({ params }) => {
					try {
						return await store.get(params.id);
					} catch (error) {
						return handleRuleError(error);
					}
				})
				.post(
					"/",
					async ({ body, request, set }) => {
						const operator = requireRuleOperator(request);
						if (operator instanceof Response) return operator;
						const adminError = requireRuleAdmin(operator);
						if (adminError) return adminError;

						try {
							const rule = await store.create(body as RuleCreateInput);
							set.status = 201;
							return rule;
						} catch (error) {
							return handleRuleError(error);
						}
					},
					{ body: ruleCreateBody },
				)
				.put(
					"/:id",
					async ({ params, body, request }) => {
						const operator = requireRuleOperator(request);
						if (operator instanceof Response) return operator;
						const adminError = requireRuleAdmin(operator);
						if (adminError) return adminError;

						try {
							return await store.update(params.id, body as RuleUpdateInput);
						} catch (error) {
							return handleRuleError(error);
						}
					},
					{ body: ruleUpdateBody },
				)
				.delete("/:id", async ({ params, request }) => {
					const operator = requireRuleOperator(request);
					if (operator instanceof Response) return operator;
					const adminError = requireRuleAdmin(operator);
					if (adminError) return adminError;

					try {
						await store.delete(params.id);
						return { deleted: true };
					} catch (error) {
						return handleRuleError(error);
					}
				}),
	);
}

export const ruleRoutes = createRuleRoutes();
