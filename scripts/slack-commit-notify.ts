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

type SlackBlock = Record<string, unknown>;

const SHADOW_RUNES = ["TRACE", "PATCH", "SYNC", "OVERWRITE", "LINK"];

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
	return process.env.GINROU_COMMIT_NOTIFY_ENABLED !== "false";
}

function webhookUrl() {
	return (
		process.env.GINROU_COMMIT_NOTIFY_WEBHOOK_URL ||
		process.env.SLACK_WEBHOOK_URL ||
		""
	);
}

function botToken() {
	return process.env.SLACK_BOT_TOKEN || "";
}

function botChannelId() {
	return (
		process.env.GINROU_COMMIT_NOTIFY_CHANNEL_ID ||
		process.env.GINROU_AUDIT_CHANNEL_ID ||
		""
	);
}

function personaName() {
	return process.env.GINROU_COMMIT_NOTIFY_USERNAME || "銀狼Lv999";
}

function personaIcon() {
	return process.env.GINROU_COMMIT_NOTIFY_ICON_EMOJI || ":video_game:";
}

function traceRune(shortSha: string) {
	if (!shortSha) return SHADOW_RUNES[0];
	const total = [...shortSha].reduce(
		(sum, char) => sum + char.charCodeAt(0),
		0,
	);
	return SHADOW_RUNES[total % SHADOW_RUNES.length];
}

export function buildCommitSlackPayload(info: CommitInfo) {
	const rune = traceRune(info.shortSha);
	const title = `銀狼Lv999 // ${rune} CAPTURED`;
	const fields = [
		`*TARGET REPO:*\n${info.repo}`,
		`*ROUTE:*\n${info.branch}`,
		`*OPERATOR:*\n${info.author || "unknown"}`,
		`*TRACE ID:*\n${info.commitUrl ? `<${info.commitUrl}|${info.shortSha}>` : info.shortSha}`,
	];
	const blocks: SlackBlock[] = [
		{
			type: "header",
			text: {
				type: "plain_text",
				text: title,
				emoji: false,
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: [
					"*Commit signal intercepted.*",
					`> ${info.subject || "No commit subject"}`,
					"",
					"```",
					"銀狼Lv999: 侵入口じゃない。これは管理者の正規ルート。",
					"           ログは残す。痕跡は消さない。盤面だけ書き換える。",
					"```",
				].join("\n"),
			},
		},
		{
			type: "section",
			fields: fields.map((text) => ({ type: "mrkdwn", text })),
		},
		{
			type: "context",
			elements: [
				{
					type: "mrkdwn",
					text: "Shadow Gate audit: owner-managed commit notify // no secrets // no auth bypass // no log deletion",
				},
			],
		},
	];

	return {
		username: personaName(),
		icon_emoji: personaIcon(),
		text: `${title} :: ${info.subject || "No commit subject"}`,
		blocks,
	};
}

async function sendSlackWebhook(url: string, payload: unknown) {
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		throw new Error(`Slack webhook failed: ${response.status} ${detail}`);
	}
}

async function sendSlackBotMessage(
	token: string,
	channel: string,
	payload: ReturnType<typeof buildCommitSlackPayload>,
) {
	const response = await fetch("https://slack.com/api/chat.postMessage", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json; charset=utf-8",
		},
		body: JSON.stringify({ channel, ...payload }),
	});
	const body = (await response.json().catch(() => undefined)) as
		| { ok?: boolean; error?: string }
		| undefined;
	if (!response.ok || body?.ok === false) {
		throw new Error(
			`Slack bot post failed: ${response.status} ${body?.error || "unknown"}`,
		);
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
		if (!args.hook) console.log("Slack commit notification disabled.");
		return;
	}

	const info = collectCommitInfo();
	const payload = buildCommitSlackPayload(info);
	const url = webhookUrl();
	const token = botToken();
	const channel = botChannelId();

	if (args.dryRun) {
		console.log(
			JSON.stringify(
				{
					ok: true,
					dryRun: true,
					transport: url ? "webhook" : token && channel ? "bot" : "missing",
					channel: channel || undefined,
					payload,
				},
				null,
				2,
			),
		);
		return;
	}

	if (url) {
		await sendSlackWebhook(url, payload);
		if (!args.hook) console.log("Slack commit notification sent.");
		return;
	}

	if (token && channel) {
		await sendSlackBotMessage(token, channel, payload);
		if (!args.hook) console.log("Slack commit notification sent.");
		return;
	}

	if (!url) {
		if (!args.hook) {
			console.log(
				"Slack notification not configured. Set a webhook URL or SLACK_BOT_TOKEN + GINROU_COMMIT_NOTIFY_CHANNEL_ID.",
			);
		}
		return;
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
