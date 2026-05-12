import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jwt from "jsonwebtoken";
import { CONFIG } from "../lib/constants";
import { FileRuleStore } from "../lib/rule-store";
import { createRuleRoutes } from "./rule-routes";

const tempDirs: string[] = [];

async function createTestRoutes() {
	const dir = await mkdtemp(join(tmpdir(), "elysia-rule-routes-"));
	tempDirs.push(dir);
	return createRuleRoutes(new FileRuleStore(join(dir, "rules.json")));
}

function token(role = "admin"): string {
	return jwt.sign(
		{ userId: "rule-test-user", username: "rule-test", role },
		CONFIG.JWT_SECRET,
		{ expiresIn: "15m" },
	);
}

function jsonRequest(
	url: string,
	method: string,
	body: Record<string, unknown>,
	role = "admin",
): Request {
	return new Request(url, {
		method,
		headers: {
			authorization: `Bearer ${token(role)}`,
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});
}

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("rule routes", () => {
	test("rejects unauthenticated requests", async () => {
		const routes = await createTestRoutes();
		const response = await routes.handle(
			new Request("http://localhost/api/rules"),
		);

		expect(response.status).toBe(401);
	});

	test("supports authenticated rule CRUD", async () => {
		const routes = await createTestRoutes();
		const createResponse = await routes.handle(
			jsonRequest("http://localhost/api/rules", "POST", {
				title: "Encoding check",
				body: "Run UTF-8 checks after touching Japanese text.",
				scope: "engineering",
				severity: "warning",
			}),
		);
		const created = (await createResponse.json()) as { id: string };

		expect(createResponse.status).toBe(201);
		expect(created.id).toBeTruthy();

		const updateResponse = await routes.handle(
			jsonRequest(`http://localhost/api/rules/${created.id}`, "PUT", {
				status: "disabled",
			}),
		);
		const updated = (await updateResponse.json()) as { status: string };

		expect(updateResponse.status).toBe(200);
		expect(updated.status).toBe("disabled");

		const deleteResponse = await routes.handle(
			new Request(`http://localhost/api/rules/${created.id}`, {
				method: "DELETE",
				headers: { authorization: `Bearer ${token()}` },
			}),
		);
		const deleted = (await deleteResponse.json()) as { deleted: boolean };

		expect(deleteResponse.status).toBe(200);
		expect(deleted.deleted).toBe(true);
	});

	test("rejects mutation from non-admin roles", async () => {
		const routes = await createTestRoutes();
		const response = await routes.handle(
			jsonRequest(
				"http://localhost/api/rules",
				"POST",
				{
					title: "User rule",
					body: "This should not be accepted.",
					scope: "engineering",
					severity: "info",
				},
				"user",
			),
		);

		expect(response.status).toBe(403);
	});
});
