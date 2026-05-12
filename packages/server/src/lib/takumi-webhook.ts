import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "../../../../src/config.ts";
import { logger } from "./logger";

const STANDARD_WEBHOOK_VERSION = "v1";
const DEFAULT_REPLAY_WINDOW_SECONDS = 60 * 5;
const SEEN_WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000;

export type TakumiWebhookVerificationReason =
	| "missing_signing_secret"
	| "missing_headers"
	| "invalid_timestamp"
	| "stale_timestamp"
	| "invalid_signing_secret"
	| "signature_mismatch";

export interface TakumiWebhookVerificationInput {
	rawBody: string;
	webhookId: string | null;
	webhookTimestamp: string | null;
	webhookSignature: string | null;
	signingSecret?: string;
	now?: number;
	replayWindowSeconds?: number;
}

export interface TakumiWebhookVerificationResult {
	ok: boolean;
	reason?: TakumiWebhookVerificationReason;
}

export interface TakumiWebhookPayload {
	type: string;
	timestamp: string;
	data?: {
		workflow_id?: string;
		workflow_run_id?: string;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

export interface TakumiWebhookHandlingResult {
	ok: boolean;
	duplicate: boolean;
	type?: string;
	workflowId?: string;
	workflowRunId?: string;
	error?: string;
}

const seenWebhookIds = new Map<string, number>();

function getSigningSecret(inputSecret?: string) {
	return inputSecret ?? getEnv("TAKUMI_WEBHOOK_SIGNING_SECRET", "");
}

function decodeSigningSecret(signingSecret: string): Buffer | null {
	const encoded = signingSecret.startsWith("whsec_")
		? signingSecret.slice("whsec_".length)
		: signingSecret;

	try {
		const decoded = Buffer.from(encoded, "base64");
		if (
			decoded.length > 0 &&
			decoded.toString("base64").replace(/=+$/, "") ===
				encoded.replace(/=+$/, "")
		) {
			return decoded;
		}
	} catch {
		// Fall through to utf8 for local/dev secrets.
	}

	const utf8Secret = Buffer.from(signingSecret, "utf8");
	return utf8Secret.length > 0 ? utf8Secret : null;
}

function timingSafeBase64Equal(expected: string, received: string) {
	const expectedBuffer = Buffer.from(expected, "base64");
	const receivedBuffer = Buffer.from(received, "base64");
	if (
		expectedBuffer.length === 0 ||
		expectedBuffer.length !== receivedBuffer.length
	) {
		return false;
	}
	return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function cleanupSeenWebhookIds(now = Date.now()) {
	for (const [webhookId, expiresAt] of seenWebhookIds.entries()) {
		if (expiresAt <= now) {
			seenWebhookIds.delete(webhookId);
		}
	}
}

export function resetTakumiWebhookStateForTest() {
	seenWebhookIds.clear();
}

export function verifyTakumiWebhookRequest(
	input: TakumiWebhookVerificationInput,
): TakumiWebhookVerificationResult {
	const signingSecret = getSigningSecret(input.signingSecret);
	if (!signingSecret) return { ok: false, reason: "missing_signing_secret" };
	if (!input.webhookId || !input.webhookTimestamp || !input.webhookSignature) {
		return { ok: false, reason: "missing_headers" };
	}

	const timestamp = Number(input.webhookTimestamp);
	if (!Number.isFinite(timestamp)) {
		return { ok: false, reason: "invalid_timestamp" };
	}

	const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
	const replayWindowSeconds =
		input.replayWindowSeconds ?? DEFAULT_REPLAY_WINDOW_SECONDS;
	if (Math.abs(nowSeconds - timestamp) > replayWindowSeconds) {
		return { ok: false, reason: "stale_timestamp" };
	}

	const secret = decodeSigningSecret(signingSecret);
	if (!secret) return { ok: false, reason: "invalid_signing_secret" };

	const signedContent = `${input.webhookId}.${input.webhookTimestamp}.${input.rawBody}`;
	const expectedSignature = createHmac("sha256", secret)
		.update(signedContent, "utf8")
		.digest("base64");
	const signatures = input.webhookSignature
		.split(/\s+/)
		.map((signature) => signature.trim())
		.filter(Boolean);

	for (const signature of signatures) {
		const [version, value] = signature.split(",", 2);
		if (version !== STANDARD_WEBHOOK_VERSION || !value) continue;
		if (timingSafeBase64Equal(expectedSignature, value)) {
			return { ok: true };
		}
	}

	return { ok: false, reason: "signature_mismatch" };
}

export async function handleTakumiWebhookRequest(
	input: TakumiWebhookVerificationInput,
): Promise<TakumiWebhookHandlingResult> {
	const verification = verifyTakumiWebhookRequest(input);
	if (!verification.ok) {
		return {
			ok: false,
			duplicate: false,
			error: verification.reason,
		};
	}

	const webhookId = input.webhookId as string;
	cleanupSeenWebhookIds(input.now);
	if (seenWebhookIds.has(webhookId)) {
		return { ok: true, duplicate: true };
	}

	let payload: TakumiWebhookPayload;
	try {
		payload = JSON.parse(input.rawBody) as TakumiWebhookPayload;
	} catch {
		return {
			ok: false,
			duplicate: false,
			error: "invalid_json",
		};
	}

	seenWebhookIds.set(
		webhookId,
		(input.now ?? Date.now()) + SEEN_WEBHOOK_TTL_MS,
	);

	const workflowId = payload.data?.workflow_id;
	const workflowRunId = payload.data?.workflow_run_id;
	logger.info("Takumi webhook received", {
		webhookId,
		type: payload.type,
		workflowId,
		workflowRunId,
	});

	return {
		ok: true,
		duplicate: false,
		type: payload.type,
		workflowId,
		workflowRunId,
	};
}
