import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type CommitInfo = {
	sha: string;
	shortSha: string;
	branch: string;
	subject: string;
	author: string;
	repo: string;
	remoteUrl: string;
	commitUrl?: string;
};

type DiscordEmbed = Record<string, unknown>;

const SHADOW_RUNES = ["TRACE", "PATCH", "SYNC", "OVERWRITE", "LINK"];
const DISCORD_SILVER = 0x9ca3af;

function parseArgs(argv = process.argv.slice(2)) {
	return {
		hook: argv.includes("--hook"),
		dryRun: argv.includes("--dry-run"),
	};
}

function loadDotEnvFile(path: string) {
	if (!existsSync(path)) return;

	for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
		if (!match || process.env[match[1]] !== undefined) continue;

		let value = match[2].trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		process.env[match[1]] = value;
	}
}

function git(args: string[]) {
	const result = spawnSync("git", args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
	if (result.status !== 0) return "";
	return result.stdout.trim();
}

function repoFromRemote(remoteUrl: string) {
	const httpsMatch = /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(
		remoteUrl,
	);
	if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;

	const trimmed = remoteUrl.replace(/\.git$/, "");
	return basename(trimmed) || "local-repo";
}

export function collectCommitInfo(): CommitInfo {
	const sha = git(["rev-parse", "HEAD"]);
	const remoteUrl = git(["remote", "get-url", "origin"]);
	const repo = process.env.GINROU_DEFAULT_REPO || repoFromRemote(remoteUrl);

	return {
		sha,
		shortSha: git(["rev-parse", "--short", "HEAD"]),
		branch: git(["branch", "--show-current"]) || "detached",
		subject: git(["log", "-1", "--pretty=%s"]),
		author: git(["log", "-1", "--pretty=%an <%ae>"]),
		repo,
		remoteUrl,
		commitUrl:
			repo.includes("/") && sha
				? `https://github.com/${repo}/commit/${sha}`
				: undefined,
	};
}

function isEnabled() {
	return process.env.DISCORD_COMMIT_NOTIFY_ENABLED !== "false";
}

function webhookUrl() {
	return (
		process.env.DISCORD_COMMIT_NOTIFY_WEBHOOK_URL ||
		process.env.DISCORD_WEBHOOK_URL ||
		""
	);
}

function personaName() {
	return process.env.DISCORD_COMMIT_NOTIFY_USERNAME || "Silver Wolf | Lv.999";
}

function avatarUrl() {
	return process.env.DISCORD_COMMIT_NOTIFY_AVATAR_URL || undefined;
}

function traceRune(shortSha: string) {
	if (!shortSha) return SHADOW_RUNES[0];
	const total = [...shortSha].reduce(
		(sum, char) => sum + char.charCodeAt(0),
		0,
	);
	return SHADOW_RUNES[total % SHADOW_RUNES.length];
}

export function buildCommitDiscordPayload(info: CommitInfo) {
	const rune = traceRune(info.shortSha);
	const title = `銀狼Lv999 // ${rune} CAPTURED`;
	const description = [
		"**Commit signal intercepted.**",
		`> ${info.subject || "No commit subject"}`,
		"",
		"```text",
		"銀狼Lv999: Discord司令室へ同期。",
		"           ログは残す。秘密は出さない。正規ルートだけ通す。",
		"```",
	].join("\n");
	const embed: DiscordEmbed = {
		title,
		description,
		color: DISCORD_SILVER,
		url: info.commitUrl,
		fields: [
			{ name: "TARGET REPO", value: info.repo || "local-repo", inline: true },
			{ name: "ROUTE", value: info.branch || "detached", inline: true },
			{ name: "OPERATOR", value: info.author || "unknown", inline: false },
			{
				name: "TRACE ID",
				value: info.commitUrl
					? `[${info.shortSha}](${info.commitUrl})`
					: info.shortSha || "unknown",
				inline: true,
			},
		],
		footer: {
			text: "Shadow Gate audit: owner-managed Discord notify // no secrets // no auth bypass // no log deletion",
		},
		timestamp: new Date().toISOString(),
	};

	return {
		username: personaName(),
		avatar_url: avatarUrl(),
		content: `${title} :: ${info.subject || "No commit subject"}`,
		embeds: [embed],
		allowed_mentions: { parse: [] },
	};
}

async function sendDiscordWebhook(url: string, payload: unknown) {
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		throw new Error(`Discord webhook failed: ${response.status} ${detail}`);
	}
}

export async function main() {
	const scriptRoot = dirname(dirname(fileURLToPath(import.meta.url)));
	loadDotEnvFile(".env");
	loadDotEnvFile(".env.local");
	loadDotEnvFile(join(scriptRoot, ".env"));
	loadDotEnvFile(join(scriptRoot, ".env.local"));

	const args = parseArgs();
	if (!isEnabled()) {
		if (!args.hook) console.log("Discord commit notification disabled.");
		return;
	}

	const info = collectCommitInfo();
	const payload = buildCommitDiscordPayload(info);
	const url = webhookUrl();

	if (args.dryRun) {
		console.log(
			JSON.stringify(
				{
					ok: true,
					dryRun: true,
					transport: url ? "webhook" : "missing",
					payload,
				},
				null,
				2,
			),
		);
		return;
	}

	if (url) {
		await sendDiscordWebhook(url, payload);
		if (!args.hook) console.log("Discord commit notification sent.");
		return;
	}

	if (!args.hook) {
		console.log(
			"Discord notification not configured. Set DISCORD_COMMIT_NOTIFY_WEBHOOK_URL or DISCORD_WEBHOOK_URL.",
		);
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
