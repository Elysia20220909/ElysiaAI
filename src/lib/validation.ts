/**
 * Result type for functional error handling.
 * Avoids throwing exceptions and makes error cases explicit.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string; status?: number };

/** Create a successful result */
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

/** Create an error result */
export const err = <T = never>(error: string, status = 400): Result<T> => ({ ok: false, error, status });

/** Options for string validation */
type RequireStringOptions = {
	maxLength?: number;
	minLength?: number;
	allowEmpty?: boolean;
	trim?: boolean;
};

/**
 * Validate that input is a non-empty string within optional length constraints.
 * Returns success with trimmed value, or error with status code.
 */
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

/**
 * Validate that input is one of the allowed enum values.
 */
export function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): Result<T> {
	if (typeof value !== "string") {
		return err(`${field} must be one of ${allowed.join(", ")}`);
	}
	if (!allowed.includes(value as T)) {
		return err(`${field} must be one of ${allowed.join(", ")}`);
	}
	return ok(value as T);
}

/** Options for message array validation */
type MessageValidationOptions = {
	maxMessages?: number;
	maxLength?: number;
};

/**
 * Validate that input is an array of message objects with string content.
 * Extracts content from each message and validates length.
 */
export function validateMessages(input: unknown, opts: MessageValidationOptions = {}): Result<string[]> {
	const maxMessages = opts.maxMessages ?? 8;
	const maxLength = opts.maxLength ?? 400;

	if (!Array.isArray(input) || input.length === 0) {
		return err("messages array is required");
	}
	if (input.length > maxMessages) {
		return err(`received ${input.length} messages but max is ${maxMessages}`);
	}

	const contents: string[] = [];
	for (let i = 0; i < input.length; i++) {
		const item = input[i];
		const contentResult = requireString((item as { content?: unknown })?.content, `message[${i}].content`, { maxLength });
		if (!contentResult.ok) return contentResult;
		contents.push(contentResult.value);
	}

	return ok(contents);
}

/** User feedback submission payload */
type FeedbackPayload = {
	query: string;
	answer: string;
	rating: "up" | "down";
};

/**
 * Validate feedback submission.
 * Ensures query and answer are non-empty, and rating is one of the allowed values.
 */
export function validateFeedbackPayload(body: unknown): Result<FeedbackPayload> {
	const bodyData = body as Record<string, unknown> | undefined;

	const queryResult = requireString(bodyData?.query, "query", { maxLength: 400 });
	if (!queryResult.ok) return queryResult;

	const answerResult = requireString(bodyData?.answer, "answer", { allowEmpty: false });
	if (!answerResult.ok) return answerResult;

	const ratingResult = requireEnum(bodyData?.rating, "rating", ["up", "down"]);
	if (!ratingResult.ok) return ratingResult;

	return ok({
		query: queryResult.value,
		answer: answerResult.value,
		rating: ratingResult.value
	});
}

/** Chat request payload */
type ChatPayload = {
	messages: string[];
	mode?: string;
	useEnsemble: boolean;
	ensembleStrategy: "quality" | "speed" | "consensus";
	ragContext?: string;
};

/**
 * Validate chat request.
 * Checks message array, validates ensemble strategy if provided,
 * and extracts optional configuration parameters.
 */
export function validateChatPayload(body: unknown): Result<ChatPayload> {
	const parsed = body as Record<string, unknown> || {};

	// Validate message array
	const messagesResult = validateMessages(parsed.messages);
	if (!messagesResult.ok) return messagesResult;

	// Validate ensemble strategy if provided
	const strategyRaw = parsed.ensembleStrategy;
	const validStrategies = ["quality", "speed", "consensus"] as const;
	if (
		strategyRaw !== undefined &&
		!validStrategies.includes(strategyRaw as typeof validStrategies[number])
	) {
		return err(`ensembleStrategy must be one of: ${validStrategies.join(", ")}`);
	}

	// Extract optional parameters
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
