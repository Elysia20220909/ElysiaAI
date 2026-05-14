import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "../../../../src/config.ts";
import {
	buildGitHubRepoStatusText,
	buildGitHubSlackSubscribeCommand,
	fetchGitHubRepoSnapshot,
	getDefaultGitHubRepo,
	parseGitHubRepoFullName,
} from "./github-bridge";
import { performHealthCheck } from "./health";
import { collectLocalOpsOverview } from "./local-ops";

const SLACK_SIGNATURE_VERSION = "v0";
const SLACK_REPLAY_WINDOW_SECONDS = 60 * 5;
const SLACK_COMMAND_DEADLINE_MS = 2500;
const SLACK_AUDIT_DEADLINE_MS = 1000;

export type SlackResponseType = "ephemeral" | "in_channel";
export type SlackBlock = Record<string, unknown>;

export interface SlackSlashCommandPayload {
	token?: string;
	team_id?: string;
	team_domain?: string;
	channel_id?: string;
	channel_name?: string;
	user_id?: string;
	user_name?: string;
	command?: string;
	text: string;
	response_url?: string;
	trigger_id?: string;
	api_app_id?: string;
}

export interface SlackCommandResponse {
	response_type: SlackResponseType;
	text: string;
	blocks?: SlackBlock[];
}

export interface SlackRequestVerificationInput {
	rawBody: string;
	timestamp: string | null;
	signature: string | null;
	signingSecret?: string;
	now?: number;
}

export interface SlackRequestVerificationResult {
	ok: boolean;
	reason?:
		| "missing_signing_secret"
		| "missing_headers"
		| "invalid_timestamp"
		| "stale_timestamp"
		| "signature_mismatch";
}

export interface SlackWebhookMessage {
	text: string;
	blocks?: SlackBlock[];
	username?: string;
	icon_emoji?: string;
}

export interface SlackSendResult {
	ok: boolean;
	status: number;
	error?: string;
}

let shadowGateLocked = false;
let shadowGateInitialized = false;

function commandName() {
	return getEnv("SLACK_COMMAND_NAME", "/ginrou");
}

function ownerUserId() {
	return getEnv("GINROU_OWNER_USER_ID", "");
}

function auditChannelId() {
	return getEnv("GINROU_AUDIT_CHANNEL_ID", "");
}

function allowedChannelIds() {
	return getEnv("GINROU_ALLOWED_CHANNEL_IDS", "")
		.split(",")
		.map((channel) => channel.trim())
		.filter(Boolean);
}

function ephemeral(text: string, blocks?: SlackBlock[]): SlackCommandResponse {
	return {
		response_type: "ephemeral",
		text,
		...(blocks ? { blocks } : {}),
	};
}

function inChannel(text: string, blocks?: SlackBlock[]): SlackCommandResponse {
	return {
		response_type: "in_channel",
		text,
		...(blocks ? { blocks } : {}),
	};
}

function commandHelpText() {
	const command = commandName();
	return [
		"GINROU-Lv999 Shadow Gate",
		"",
		"Commands:",
		`- \`${command} setup\` - bootstrap Slack/GitHub env values`,
		`- \`${command} open\` - open owner console`,
		`- \`${command} persona\` - show GINROU-Lv999 profile`,
		`- \`${command} deploy check\` - local ops readiness`,
		`- \`${command} status\` - service health`,
		`- \`${command} logs\` - latest local log summaries`,
		`- \`${command} repo status [owner/repo]\` - GitHub repo metadata`,
		`- \`${command} repo connect [owner/repo]\` - GitHub repo handshake`,
		`- \`${command} repo slack [owner/repo]\` - official GitHub Slack command`,
		`- \`${command} audit\` - show audit channel`,
		`- \`${command} lock\` / \`${command} unlock\` - gate state`,
		`- \`${command} slack style silverwolf\` - preview Slack style`,
		`- \`${command} style backdoor\` - show safe Shadow Gate profile`,
		`- \`${command} notify test\` - send an Incoming Webhook test`,
	].join("\n");
}

function tokenize(text: string) {
	return text.trim().split(/\s+/).filter(Boolean);
}

function compactLines(lines: string[], max = 2800) {
	const output: string[] = [];
	let total = 0;
	for (const line of lines) {
		const next = total + line.length + 1;
		if (next > max) break;
		output.push(line);
		total = next;
	}
	return output.join("\n");
}

function isShadowGateLocked() {
	if (!shadowGateInitialized) {
		shadowGateLocked = getEnv("GINROU_GATE_DEFAULT_LOCKED", "false") === "true";
		shadowGateInitialized = true;
	}
	return shadowGateLocked;
}

function setShadowGateLocked(locked: boolean) {
	shadowGateInitialized = true;
	shadowGateLocked = locked;
}

export function resetShadowGateStateForTest() {
	shadowGateLocked = false;
	shadowGateInitialized = false;
}

async function withDeadline<T>(
	promise: Promise<T>,
	ms = SLACK_COMMAND_DEADLINE_MS,
) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<null>((resolve) => {
		timer = setTimeout(() => resolve(null), ms);
	});
	const guarded = promise.catch(() => null);

	try {
		return await Promise.race([guarded, timeout]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

function timingSafeStringEqual(left: string, right: string) {
	const leftBuffer = Buffer.from(left, "utf8");
	const rightBuffer = Buffer.from(right, "utf8");
	if (leftBuffer.length !== rightBuffer.length) return false;
	return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isOwnerSlackUser(userId?: string) {
	const owner = ownerUserId();
	return owner.length > 0 && userId === owner;
}

export function isAllowedSlackChannel(channelId?: string) {
	const allowed = allowedChannelIds();
	if (allowed.length === 0) return true;
	return channelId !== undefined && allowed.includes(channelId);
}

export function verifySlackRequest(
	input: SlackRequestVerificationInput,
): SlackRequestVerificationResult {
	const signingSecret =
		input.signingSecret ?? getEnv("SLACK_SIGNING_SECRET", "");
	if (!signingSecret) return { ok: false, reason: "missing_signing_secret" };
	if (!input.timestamp || !input.signature) {
		return { ok: false, reason: "missing_headers" };
	}

	const timestamp = Number(input.timestamp);
	if (!Number.isFinite(timestamp)) {
		return { ok: false, reason: "invalid_timestamp" };
	}

	const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
	if (Math.abs(nowSeconds - timestamp) > SLACK_REPLAY_WINDOW_SECONDS) {
		return { ok: false, reason: "stale_timestamp" };
	}

	const baseString = `${SLACK_SIGNATURE_VERSION}:${input.timestamp}:${input.rawBody}`;
	const digest = createHmac("sha256", signingSecret)
		.update(baseString, "utf8")
		.digest("hex");
	const expected = `${SLACK_SIGNATURE_VERSION}=${digest}`;

	if (!timingSafeStringEqual(expected, input.signature)) {
		return { ok: false, reason: "signature_mismatch" };
	}

	return { ok: true };
}

export function parseSlackSlashCommand(
	rawBody: string,
): SlackSlashCommandPayload {
	const params = new URLSearchParams(rawBody);
	return {
		token: params.get("token") ?? undefined,
		team_id: params.get("team_id") ?? undefined,
		team_domain: params.get("team_domain") ?? undefined,
		channel_id: params.get("channel_id") ?? undefined,
		channel_name: params.get("channel_name") ?? undefined,
		user_id: params.get("user_id") ?? undefined,
		user_name: params.get("user_name") ?? undefined,
		command: params.get("command") ?? undefined,
		text: params.get("text") ?? "",
		response_url: params.get("response_url") ?? undefined,
		trigger_id: params.get("trigger_id") ?? undefined,
		api_app_id: params.get("api_app_id") ?? undefined,
	};
}

export function isAllowedSlackCommand(payload: SlackSlashCommandPayload) {
	return !payload.command || payload.command === commandName();
}

async function auditGinrouCommand(
	payload: SlackSlashCommandPayload,
	outcome: string,
	detail: string,
) {
	const channel = auditChannelId();
	if (!channel) return;

	const safeCommand =
		`${payload.command || commandName()} ${payload.text || ""}`
			.trim()
			.slice(0, 300);
	await postSlackBotMessage(channel, {
		text: compactLines([
			`Shadow Gate audit: ${outcome}`,
			`user=${payload.user_id || "unknown"}`,
			`channel=${payload.channel_id || "unknown"}`,
			`command=${safeCommand || "(empty)"}`,
			`detail=${detail}`,
		]),
	});
}

async function recordAudit(
	payload: SlackSlashCommandPayload,
	outcome: string,
	detail: string,
) {
	await withDeadline(
		auditGinrouCommand(payload, outcome, detail),
		SLACK_AUDIT_DEADLINE_MS,
	);
}

export async function sendSlackWebhookNotification(
	message: SlackWebhookMessage,
	webhookUrl = getEnv("SLACK_WEBHOOK_URL", ""),
): Promise<SlackSendResult> {
	if (!webhookUrl) {
		return {
			ok: false,
			status: 0,
			error: "SLACK_WEBHOOK_URL is not configured",
		};
	}

	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(message),
		});
		const error = response.ok
			? undefined
			: await response.text().catch(() => "");
		return { ok: response.ok, status: response.status, error };
	} catch (error) {
		return {
			ok: false,
			status: 0,
			error: error instanceof Error ? error.message : "Slack webhook failed",
		};
	}
}

export async function postSlackResponseUrl(
	responseUrl: string | undefined,
	response: SlackCommandResponse,
): Promise<SlackSendResult> {
	if (!responseUrl) {
		return { ok: false, status: 0, error: "response_url is not available" };
	}

	try {
		const httpResponse = await fetch(responseUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(response),
		});
		const error = httpResponse.ok
			? undefined
			: await httpResponse.text().catch(() => "");
		return {
			ok: httpResponse.ok,
			status: httpResponse.status,
			error,
		};
	} catch (error) {
		return {
			ok: false,
			status: 0,
			error: error instanceof Error ? error.message : "Slack response failed",
		};
	}
}

export async function postSlackBotMessage(
	channel: string,
	message: SlackWebhookMessage,
	botToken = getEnv("SLACK_BOT_TOKEN", ""),
): Promise<SlackSendResult> {
	if (!botToken) {
		return { ok: false, status: 0, error: "SLACK_BOT_TOKEN is not configured" };
	}

	try {
		const response = await fetch("https://slack.com/api/chat.postMessage", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${botToken}`,
				"Content-Type": "application/json; charset=utf-8",
			},
			body: JSON.stringify({ channel, ...message }),
		});
		const payload = (await response.json().catch(() => undefined)) as
			| { ok?: boolean; error?: string }
			| undefined;
		const ok = response.ok && payload?.ok !== false;
		return {
			ok,
			status: response.status,
			error: ok ? undefined : payload?.error || "Slack API request failed",
		};
	} catch (error) {
		return {
			ok: false,
			status: 0,
			error:
				error instanceof Error ? error.message : "Slack API request failed",
		};
	}
}

function buildAccessDeniedResponse(reason: string) {
	return ephemeral(
		[
			"Access Denied",
			"",
			`Reason: ${reason}`,
			"Gate: Closed",
			"",
			"GINROU-Lv999: 鍵が違う。この扉は管理人専用。",
			"Real security: owner allowlist + audit log.",
		].join("\n"),
	);
}

function buildOpenResponse(payload: SlackSlashCommandPayload) {
	return inChannel(
		[
			"GINROU-Lv999 / Owner Console",
			"",
			"Owner: エリシア",
			`Operator: ${payload.user_name || payload.user_id || "Owner"}`,
			"Privilege: Owner",
			"Mode: Administrator",
			"Node: 自鯖",
			`Gate: ${isShadowGateLocked() ? "Locked" : "Open"}`,
			`Audit: ${auditChannelId() ? "Enabled" : "Not configured"}`,
			"",
			"管理人権限、確認。",
			"ここはエリシアの鯖。",
			"私はGINROU-Lv999、盤面制御を開始する。",
		].join("\n"),
	);
}

function buildAuditResponse() {
	const channel = auditChannelId();
	return ephemeral(
		channel
			? `Audit channel: <#${channel}>\nAudit: Enabled`
			: "Audit channel is not configured. Set GINROU_AUDIT_CHANNEL_ID.",
	);
}

function buildStyleResponse() {
	return ephemeral(
		[
			"GINROU-Lv999 Shadow Gate",
			"",
			"Concept: 裏口っぽい正門",
			"Style: 銀狼Lv999風 Owner Admin Console",
			"Real security: owner-only",
			"Socket Mode: preferred",
			"Auth bypass: false",
			"Hidden persistence: false",
			"Log deletion: false",
			"Audit log: true",
			"Owner allowlist: true",
			"Rollback: required for important changes",
			"",
			"Shadow Gate、起動。",
			"これは侵入口じゃない。",
			"この鯖の主だけが開けられる、月下の管理扉。",
		].join("\n"),
	);
}

function buildPersonaResponse() {
	return ephemeral(
		[
			"GINROU-Lv999 Persona",
			"",
			"Owner: エリシア",
			"Role: 自鯖管理Bot / Owner直属オペレーター",
			"Priority: 999",
			"Control: 自鯖 / Slack / GitHub",
			"Safety: audit + backup + rollback + confirm",
			"Tone: 銀狼Lv999風、でも実務は正確",
			"",
			"自由にいじれる、は無秩序に壊せるって意味じゃない。",
			"いつでも戻せる状態で支配できる。それがLv999。",
		].join("\n"),
	);
}

function buildSlackStyleSilverWolfResponse() {
	return inChannel(
		[
			"Slack Style Updated: SilverWolf-Lv999",
			"",
			"Operator: エリシア",
			"Target: Slack Bridge",
			"Mode: cyber / owner console / audit-safe",
			"",
			"設定変更、反映。",
			"このノードは今から新しいルールで動く。",
			"古い設定は退避済み。戻したくなったら一手で戻せる。",
		].join("\n"),
	);
}

function buildSetupResponse(payload: SlackSlashCommandPayload) {
	const repo = getDefaultGitHubRepo();
	const owner = payload.user_id || "Uxxxxxxxx";
	const channel = payload.channel_id || "Cxxxxxxxx";
	const command = payload.command || commandName();

	return ephemeral(
		[
			"GINROU-Lv999 Shadow Gate setup",
			"",
			"Put this in your self-host env. Keep real tokens out of Slack.",
			"",
			"```bash",
			`SLACK_COMMAND_NAME=${command}`,
			"SLACK_SOCKET_MODE_ENABLED=true",
			"SLACK_BOT_TOKEN=xoxb-...",
			"SLACK_APP_TOKEN=xapp-...",
			"SLACK_SIGNING_SECRET=only-needed-for-http-request-url-mode",
			`GINROU_OWNER_USER_ID=${owner}`,
			`GINROU_AUDIT_CHANNEL_ID=${channel}`,
			`GINROU_ALLOWED_CHANNEL_IDS=${channel}`,
			"GINROU_GATE_DEFAULT_LOCKED=false",
			`GINROU_DEFAULT_REPO=${repo}`,
			"GITHUB_TOKEN=<github-token>",
			"```",
			"",
			"Slack official GitHub feed:",
			`\`${buildGitHubSlackSubscribeCommand(repo) || "/github subscribe owner/repo"}\``,
			"",
			"Security: owner-only, audited, no auth bypass, no log deletion.",
		].join("\n"),
	);
}

async function buildStatusResponse() {
	const health = await withDeadline(performHealthCheck());
	if (!health) {
		return ephemeral("Status check timed out before Slack's response window.");
	}

	const services = Object.entries(health.services).map(
		([name, service]) => `${name}: ${service.status}`,
	);
	const lines = [
		`GINROU-Lv999 status: ${health.status}`,
		`Uptime: ${Math.floor(health.uptime)}s`,
		`Services: ${services.join(", ")}`,
		`Memory: ${health.system.memory.used}/${health.system.memory.total} MB (${health.system.memory.percentage}%)`,
	];

	return ephemeral(lines.join("\n"));
}

async function buildDeployCheckResponse() {
	const overview = await withDeadline(
		collectLocalOpsOverview({ assumeCoreUp: true }),
	);
	if (!overview) {
		return ephemeral("Deploy check timed out before Slack's response window.");
	}

	const attention = overview.services
		.filter(
			(service) =>
				service.enabled &&
				!["up", "ready", "degraded", "disabled"].includes(service.status),
		)
		.slice(0, 5)
		.map((service) => `- ${service.name}: ${service.status}`);

	const lines = [
		`Deploy check: ${overview.readiness.status} (${overview.readiness.score}/100)`,
		overview.readiness.summary,
		"",
		attention.length > 0 ? "Attention:" : "Attention: none",
		...attention,
	];

	return ephemeral(compactLines(lines));
}

async function buildLogsResponse() {
	const overview = await withDeadline(
		collectLocalOpsOverview({ assumeCoreUp: true }),
	);
	if (!overview) {
		return ephemeral("Log check timed out before Slack's response window.");
	}

	const lines = overview.logs.flatMap((log) => [
		`- ${log.label}: ${log.status}${log.updatedAt ? ` (${log.updatedAt})` : ""}`,
		...log.lines.slice(-2).map((line) => `  ${line}`),
	]);

	return ephemeral(
		compactLines([
			"Latest local logs:",
			...(lines.length ? lines : ["- none"]),
		]),
	);
}

function repoArg(args: string[]) {
	return args[2] || getDefaultGitHubRepo();
}

async function buildRepoStatusResponse(args: string[]) {
	const repo = repoArg(args);
	if (!parseGitHubRepoFullName(repo)) {
		return ephemeral(`Usage: \`${commandName()} repo status owner/repo\``);
	}

	const result = await withDeadline(fetchGitHubRepoSnapshot(repo));
	if (!result) {
		return ephemeral("GitHub repo lookup timed out.");
	}
	return ephemeral(buildGitHubRepoStatusText(result));
}

async function buildRepoConnectResponse(args: string[]) {
	const repo = repoArg(args);
	if (!parseGitHubRepoFullName(repo)) {
		return ephemeral(`Usage: \`${commandName()} repo connect owner/repo\``);
	}

	const result = await withDeadline(fetchGitHubRepoSnapshot(repo));
	const status = result
		? buildGitHubRepoStatusText(result)
		: "GitHub repo lookup timed out.";
	const subscribe = buildGitHubSlackSubscribeCommand(repo);

	return inChannel(
		[
			`Repo target: ${repo}`,
			"",
			status,
			"",
			subscribe ? `Slack official feed: \`${subscribe}\`` : "",
			"Server side: read-only bridge active. Write actions stay disabled.",
		]
			.filter(Boolean)
			.join("\n"),
	);
}

function buildRepoSlackResponse(args: string[]) {
	const repo = repoArg(args);
	const subscribe = buildGitHubSlackSubscribeCommand(repo);
	if (!subscribe) {
		return ephemeral(`Usage: \`${commandName()} repo slack owner/repo\``);
	}

	return ephemeral(
		[
			"Run this in the target Slack channel:",
			"",
			`\`${subscribe}\``,
			"",
			"Requires GitHub app for Slack installed in the workspace.",
		].join("\n"),
	);
}

async function buildNotifyTestResponse() {
	const result = await sendSlackWebhookNotification({
		text: "GINROU-Lv999 webhook test: Slack Bridge Active",
	});

	if (!result.ok) {
		return ephemeral(`Webhook test failed: ${result.error || result.status}`);
	}

	return ephemeral("Webhook test sent.");
}

export async function handleGinrouSlashCommand(
	payload: SlackSlashCommandPayload,
): Promise<SlackCommandResponse> {
	const args = tokenize(payload.text);
	const [command, subcommand] = args;

	if ((command === "setup" || command === "bootstrap") && !ownerUserId()) {
		await recordAudit(payload, "bootstrap", "owner_not_configured");
		return buildSetupResponse(payload);
	}

	if (!ownerUserId()) {
		await recordAudit(payload, "denied", "owner_not_configured");
		return buildAccessDeniedResponse("GINROU_OWNER_USER_ID is not configured");
	}

	if (!isOwnerSlackUser(payload.user_id)) {
		await recordAudit(payload, "denied", "not_owner");
		return buildAccessDeniedResponse("operator is not owner");
	}

	if (!isAllowedSlackChannel(payload.channel_id)) {
		await recordAudit(payload, "denied", "channel_not_allowed");
		return buildAccessDeniedResponse("channel is not allowlisted");
	}

	let response: SlackCommandResponse;
	let detail = command || "open";

	if (!command || command === "open") {
		response = buildOpenResponse(payload);
	} else if (command === "setup" || command === "bootstrap") {
		response = buildSetupResponse(payload);
	} else if (command === "persona") {
		response = buildPersonaResponse();
	} else if (command === "help") {
		response = ephemeral(commandHelpText());
	} else if (command === "ping") {
		response = ephemeral("GINROU-Lv999 Online");
	} else if (command === "audit") {
		response = buildAuditResponse();
	} else if (command === "lock") {
		setShadowGateLocked(true);
		response = ephemeral("Shadow Gate Locked");
	} else if (command === "unlock") {
		setShadowGateLocked(false);
		response = ephemeral("Shadow Gate Unlocked");
	} else if (
		isShadowGateLocked() &&
		!["open", "unlock", "audit", "help"].includes(command)
	) {
		detail = `${command}:locked`;
		response = ephemeral("Shadow Gate Locked. Use `unlock` before operations.");
	} else if (command === "status") {
		response = await buildStatusResponse();
	} else if (command === "deploy" && subcommand === "check") {
		response = await buildDeployCheckResponse();
	} else if (
		command === "logs" &&
		(subcommand === undefined || subcommand === "latest")
	) {
		response = await buildLogsResponse();
	} else if (command === "repo" && subcommand === "connect") {
		response = await buildRepoConnectResponse(args);
	} else if (
		command === "repo" &&
		(subcommand === undefined || subcommand === "status")
	) {
		response = await buildRepoStatusResponse(args);
	} else if (command === "repo" && subcommand === "slack") {
		response = buildRepoSlackResponse(args);
	} else if (
		command === "slack" &&
		subcommand === "style" &&
		["silverwolf", "silver-wolf", "ginrou"].includes(args[2] || "")
	) {
		response = buildSlackStyleSilverWolfResponse();
	} else if (command === "style" && subcommand === "backdoor") {
		response = buildStyleResponse();
	} else if (command === "notify" && subcommand === "test") {
		response = await buildNotifyTestResponse();
	} else {
		detail = `${command}:unknown`;
		response = ephemeral(`Unknown command.\n\n${commandHelpText()}`);
	}

	await recordAudit(payload, "owner_command", detail);
	return response;
}
