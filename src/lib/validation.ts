export type Result<T> = { ok: true; value: T } | { ok: false; error: string; status?: number };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = <T = never>(error: string, status = 400): Result<T> => ({ ok: false, error, status });

type RequireStringOptions = {
	maxLength?: number;
	minLength?: number;
	allowEmpty?: boolean;
	trim?: boolean;
};

export function requireString(value: unknown, field: string, opts: RequireStringOptions = {}): Result<string> {
	if (typeof value !== "string") {
		return err(`${field} must be a string`);
	}
	const trimmed = opts.trim === false ? value : value.trim();
	if (!opts.allowEmpty && trimmed.length === 0) {
		return err(`${field} is required`);
	}
	if (typeof opts.minLength === "number" && trimmed.length < opts.minLength) {
		return err(`${field} must be at least ${opts.minLength} characters`);
	}
	if (typeof opts.maxLength === "number" && trimmed.length > opts.maxLength) {
		return err(`${field} must be at most ${opts.maxLength} characters`);
	}
	return ok(trimmed);
}

export function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): Result<T> {
	if (typeof value !== "string") {
		return err(`${field} must be one of ${allowed.join(", ")}`);
	}
	if (!allowed.includes(value as T)) {
		return err(`${field} must be one of ${allowed.join(", ")}`);
	}
	return ok(value as T);
}

type MessageValidationOptions = {
	maxMessages?: number;
	maxLength?: number;
};

export function validateMessages(input: unknown, opts: MessageValidationOptions = {}): Result<string[]> {
	const maxMessages = opts.maxMessages ?? 8;
	const maxLength = opts.maxLength ?? 400;

	if (!Array.isArray(input) || input.length === 0) {
		return err("messages required");
	}
	if (input.length > maxMessages) {
		return err("too many messages");
	}

	const contents: string[] = [];
	for (const item of input) {
		const result = requireString((item as { content?: unknown })?.content, "message content", { maxLength });
		if (!result.ok) return result;
		contents.push(result.value);
	}

	return ok(contents);
}

type FeedbackPayload = {
	query: string;
	answer: string;
	rating: "up" | "down";
};

export function validateFeedbackPayload(body: unknown): Result<FeedbackPayload> {
	const queryResult = requireString((body as Record<string, unknown> | undefined)?.query, "query", { maxLength: 400 });
	if (!queryResult.ok) return queryResult;

	const answerResult = requireString((body as Record<string, unknown> | undefined)?.answer, "answer", { allowEmpty: false });
	if (!answerResult.ok) return answerResult;

	const ratingResult = requireEnum((body as Record<string, unknown> | undefined)?.rating, "rating", ["up", "down"]);
	if (!ratingResult.ok) return ratingResult;

	return ok({ query: queryResult.value, answer: answerResult.value, rating: ratingResult.value });
}

type ChatPayload = {
	messages: string[];
	mode?: string;
	useEnsemble: boolean;
	ensembleStrategy: "quality" | "speed" | "consensus";
	ragContext?: string;
};

export function validateChatPayload(body: unknown): Result<ChatPayload> {
	const parsed = (body as Record<string, unknown>) || {};
	const messagesResult = validateMessages(parsed.messages);
	if (!messagesResult.ok) return messagesResult;

	const strategyRaw = parsed.ensembleStrategy;
	if (
		strategyRaw !== undefined &&
		strategyRaw !== "quality" &&
		strategyRaw !== "speed" &&
		strategyRaw !== "consensus"
	) {
		return err("Invalid ensembleStrategy");
	}

	const ragContext = typeof parsed.ragContext === "string" ? parsed.ragContext : undefined;
	const mode = typeof parsed.mode === "string" ? parsed.mode : undefined;
	const ensembleStrategy = (strategyRaw as ChatPayload["ensembleStrategy"]) || "quality";
	const useEnsemble = Boolean(parsed.useEnsemble);

	return ok({
		messages: messagesResult.value,
		mode,
		useEnsemble,
		ensembleStrategy,
		ragContext,
	});
}
