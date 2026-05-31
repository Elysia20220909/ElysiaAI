#!/usr/bin/env node
import { createSign } from "node:crypto";

const apiVersion = "2022-11-28";

function required(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function base64Url(input) {
	return Buffer.from(input)
		.toString("base64")
		.replaceAll("=", "")
		.replaceAll("+", "-")
		.replaceAll("/", "_");
}

function signJwt(appId, privateKey) {
	const now = Math.floor(Date.now() / 1000);
	const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const payload = base64Url(
		JSON.stringify({
			iat: now - 60,
			exp: now + 540,
			iss: appId,
		}),
	);
	const unsigned = `${header}.${payload}`;
	const signer = createSign("RSA-SHA256");
	signer.update(unsigned);
	signer.end();
	return `${unsigned}.${signer
		.sign(privateKey)
		.toString("base64")
		.replaceAll("=", "")
		.replaceAll("+", "-")
		.replaceAll("/", "_")}`;
}

async function githubJson(path, options = {}) {
	const response = await fetch(`https://api.github.com${path}`, {
		...options,
		headers: {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": apiVersion,
			...options.headers,
		},
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${body}`);
	}

	return response.json();
}

const appId = required("SNAPSHOT_APP_ID");
const privateKey = required("SNAPSHOT_APP_PRIVATE_KEY").replaceAll("\\n", "\n");
const targetRepository = required("SNAPSHOT_TARGET_REPOSITORY");
const [, repoName] = targetRepository.split("/");

if (!repoName) {
	throw new Error("SNAPSHOT_TARGET_REPOSITORY must be owner/repo");
}

const jwt = signJwt(appId, privateKey);
const installation = await githubJson(`/repos/${targetRepository}/installation`, {
	headers: { Authorization: `Bearer ${jwt}` },
});
const token = await githubJson(
	`/app/installations/${installation.id}/access_tokens`,
	{
		method: "POST",
		headers: { Authorization: `Bearer ${jwt}` },
		body: JSON.stringify({
			repositories: [repoName],
			permissions: { contents: "write" },
		}),
	},
);

process.stdout.write(`${token.token}\n`);
