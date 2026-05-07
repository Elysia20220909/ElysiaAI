import { getEnv } from "../../../../src/config.ts";
import { logger } from "./logger";
import {
	handleGinrouSlashCommand,
	type SlackCommandResponse,
	type SlackSlashCommandPayload,
} from "./slack-bridge";

const SLACK_SOCKET_MODE_ENDPOINT =
	"https://slack.com/api/apps.connections.open";
const SOCKET_RECONNECT_DELAY_MS = 5000;

export interface SlackSocketEnvelope {
	type?: string;
	envelope_id?: string;
	accepts_response_payload?: boolean;
	payload?: SlackSlashCommandPayload;
	reason?: string;
}

interface SlackSocketOpenResponse {
	ok?: boolean;
	url?: string;
	error?: string;
}

export function isSlackSocketModeEnabled() {
	return getEnv("SLACK_SOCKET_MODE_ENABLED", "false") === "true";
}

export function buildSlackSocketAck(
	envelope: SlackSocketEnvelope,
	response?: SlackCommandResponse,
) {
	return {
		envelope_id: envelope.envelope_id,
		...(response && envelope.accepts_response_payload
			? { payload: response }
			: {}),
	};
}

export async function openSlackSocketModeUrl(
	appToken = getEnv("SLACK_APP_TOKEN", ""),
) {
	if (!appToken) throw new Error("SLACK_APP_TOKEN is not configured");

	const response = await fetch(SLACK_SOCKET_MODE_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${appToken}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
	});
	const payload = (await response.json()) as SlackSocketOpenResponse;
	if (!response.ok || !payload.ok || !payload.url) {
		throw new Error(payload.error || "apps.connections.open failed");
	}
	return payload.url;
}

export async function handleSlackSocketEnvelope(
	envelope: SlackSocketEnvelope,
	sendAck: (ack: ReturnType<typeof buildSlackSocketAck>) => void,
) {
	if (!envelope.envelope_id) return;

	if (envelope.type === "slash_commands" && envelope.payload) {
		const response = await handleGinrouSlashCommand(envelope.payload);
		sendAck(buildSlackSocketAck(envelope, response));
		return;
	}

	sendAck(buildSlackSocketAck(envelope));
}

async function socketDataToText(data: unknown) {
	if (typeof data === "string") return data;
	if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
	if (ArrayBuffer.isView(data)) {
		return new TextDecoder().decode(data.buffer);
	}
	if (data instanceof Blob) return await data.text();
	return String(data);
}

export class SlackSocketModeBridge {
	private socket?: WebSocket;
	private reconnectTimer?: ReturnType<typeof setTimeout>;
	private stopped = true;

	async start() {
		if (!isSlackSocketModeEnabled()) {
			logger.info("Slack Socket Mode disabled");
			return false;
		}

		this.stopped = false;
		await this.connect();
		return true;
	}

	stop() {
		this.stopped = true;
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.socket?.close();
		this.socket = undefined;
	}

	private async connect() {
		const url = await openSlackSocketModeUrl();
		const socket = new WebSocket(url);
		this.socket = socket;

		socket.addEventListener("open", () => {
			logger.info("Slack Socket Mode connected");
		});
		socket.addEventListener("message", (event) => {
			void this.handleMessage(event.data);
		});
		socket.addEventListener("close", () => {
			logger.warn("Slack Socket Mode disconnected");
			this.scheduleReconnect();
		});
		socket.addEventListener("error", () => {
			logger.warn("Slack Socket Mode socket error");
		});
	}

	private async handleMessage(data: unknown) {
		try {
			const text = await socketDataToText(data);
			const envelope = JSON.parse(text) as SlackSocketEnvelope;
			if (envelope.type === "hello") return;
			if (envelope.type === "disconnect") {
				logger.warn("Slack Socket Mode disconnect requested", {
					reason: envelope.reason,
				});
				this.scheduleReconnect();
				return;
			}
			await handleSlackSocketEnvelope(envelope, (ack) => this.sendAck(ack));
		} catch (error) {
			logger.warn("Slack Socket Mode message handling failed", {
				error: error instanceof Error ? error.message : "unknown",
			});
		}
	}

	private sendAck(ack: ReturnType<typeof buildSlackSocketAck>) {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
		this.socket.send(JSON.stringify(ack));
	}

	private scheduleReconnect() {
		if (this.stopped || this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined;
			void this.connect().catch((error) => {
				logger.warn("Slack Socket Mode reconnect failed", {
					error: error instanceof Error ? error.message : "unknown",
				});
				this.scheduleReconnect();
			});
		}, SOCKET_RECONNECT_DELAY_MS);
	}
}

export const slackSocketModeBridge = new SlackSocketModeBridge();
