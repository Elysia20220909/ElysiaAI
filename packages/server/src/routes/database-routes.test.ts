import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jwt from "jsonwebtoken";

const testDir = mkdtempSync(join(tmpdir(), "elysia-database-routes-"));
process.env.ELYSIA_SQLITE_PATH = join(testDir, "routes.db");

const { CONFIG } = await import("../lib/constants");
const { clearTestData, disconnect } = await import("../lib/database-utils");
const { databaseRoutes } = await import("./database-routes");

function authHeaders(userId: string, role = "user") {
	const token = jwt.sign(
		{ userId, username: `legacy-${userId}`, role },
		CONFIG.JWT_SECRET,
		{ expiresIn: "15m" },
	);

	return { authorization: `Bearer ${token}` };
}

function jsonRequest(
	url: string,
	method: string,
	body: Record<string, unknown>,
	headers: Record<string, string> = {},
) {
	return new Request(url, {
		method,
		headers: {
			"content-type": "application/json",
			...headers,
		},
		body: JSON.stringify(body),
	});
}

async function registerUser(username = "legacy-user") {
	const response = await databaseRoutes.handle(
		jsonRequest("http://localhost/db/api/auth/register", "POST", {
			username,
			password: "correct-password",
		}),
	);
	return (await response.json()) as {
		success: boolean;
		user: { id: string; username: string; passwordHash?: string };
	};
}

beforeEach(async () => {
	await clearTestData();
});

afterAll(async () => {
	disconnect();
	await Bun.sleep(50);
	try {
		rmSync(testDir, { recursive: true, force: true });
	} catch {
		// Windows can release SQLite handles just after the test process exits.
	}
});

describe("legacy database routes", () => {
	test("does not expose password hashes from legacy auth responses", async () => {
		const registered = await registerUser("legacy-login-user");

		expect(registered.success).toBe(true);
		expect(registered.user.passwordHash).toBeUndefined();

		const loginResponse = await databaseRoutes.handle(
			jsonRequest("http://localhost/db/api/auth/login", "POST", {
				username: "legacy-login-user",
				password: "correct-password",
			}),
		);
		const loggedIn = (await loginResponse.json()) as {
			user: { passwordHash?: string };
		};

		expect(loginResponse.status).toBe(200);
		expect(loggedIn.user.passwordHash).toBeUndefined();
	});

	test("requires auth for legacy chat writes", async () => {
		const response = await databaseRoutes.handle(
			jsonRequest("http://localhost/db/api/chat/session", "POST", {
				mode: "normal",
			}),
		);

		expect(response.status).toBe(401);
	});

	test("keeps legacy chat sessions scoped to the owning user", async () => {
		const registered = await registerUser("legacy-session-owner");
		const ownerHeaders = authHeaders(registered.user.id);

		const createResponse = await databaseRoutes.handle(
			jsonRequest(
				"http://localhost/db/api/chat/session",
				"POST",
				{ mode: "normal" },
				ownerHeaders,
			),
		);
		const created = (await createResponse.json()) as {
			session: { id: string; userId: string };
		};

		expect(createResponse.status).toBe(200);
		expect(created.session.userId).toBe(registered.user.id);

		const otherUserResponse = await databaseRoutes.handle(
			new Request(
				`http://localhost/db/api/chat/session/${created.session.id}`,
				{ headers: authHeaders("other-user") },
			),
		);
		expect(otherUserResponse.status).toBe(403);

		const ownerResponse = await databaseRoutes.handle(
			new Request(
				`http://localhost/db/api/chat/session/${created.session.id}`,
				{ headers: ownerHeaders },
			),
		);
		expect(ownerResponse.status).toBe(200);
	});

	test("requires admin access for verified knowledge reads", async () => {
		const registered = await registerUser("legacy-knowledge-user");

		const userResponse = await databaseRoutes.handle(
			new Request("http://localhost/db/api/knowledge/verified", {
				headers: authHeaders(registered.user.id),
			}),
		);
		expect(userResponse.status).toBe(403);

		const adminResponse = await databaseRoutes.handle(
			new Request("http://localhost/db/api/knowledge/verified", {
				headers: authHeaders(registered.user.id, "admin"),
			}),
		);
		expect(adminResponse.status).toBe(200);
	});
});
