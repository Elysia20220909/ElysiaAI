// Integration Guide for i18n, Telemetry, and OpenAPI

/**
 * ===================================
 * 1. i18n Integration
 * ===================================
 */

// Import i18n
import { i18n, getLocaleFromRequest } from "./lib/i18n";

// Use in Elysia endpoints
app.get("/api/greeting", ({ request }) => {
	const locale = getLocaleFromRequest(request);
	return {
		message: i18n.t("common.welcome", locale),
		hello: i18n.t("common.hello", locale),
	};
});

// Error messages with i18n
app.onError(({ error, request }) => {
	const locale = getLocaleFromRequest(request);
	return {
		error: i18n.t("errors.serverError", locale),
		details: error.message,
	};
});

// Pluralization example
app.get("/api/messages/count/:count", ({ params, request }) => {
	const locale = getLocaleFromRequest(request);
	const count = Number.parseInt(params.count);
	return {
		text: i18n.plural("messages", count, locale),
	};
});

/**
 * ===================================
 * 2. OpenTelemetry Integration
 * ===================================
 */

// Import telemetry
import {
	telemetry,
	getTraceContextFromRequest,
	type Span,
} from "./lib/telemetry";

// Trace HTTP requests
app.use(async ({ request, path, set }) => {
	const traceContext = getTraceContextFromRequest(request);
	const span = telemetry.startSpan(`HTTP ${request.method} ${path}`, {
		parentContext: traceContext || undefined,
		attributes: {
			"http.method": request.method,
			"http.url": request.url,
			"http.route": path,
		},
	});

	// Set trace context in response headers
	set.headers["traceparent"] = telemetry.createTraceContext(
		span.traceId,
		span.spanId,
	);

	try {
		// Continue with request
		return;
	} finally {
		telemetry.endSpan(span.spanId);
	}
});

// Trace specific operations
app.post("/elysia-love", async ({ body, request }) => {
	const traceContext = getTraceContextFromRequest(request);

	return await telemetry.trace(
		"chat.process",
		async (span) => {
			// Add attributes
			span.attributes["chat.mode"] = body.mode || "normal";
			span.attributes["chat.messageCount"] = body.messages.length;

			// Add events
			telemetry.addEvent(span.spanId, "rag.query.start");

			// Process chat
			const response = await processChat(body, span);

			telemetry.addEvent(span.spanId, "rag.query.complete", {
				"response.length": response.length,
			});

			return response;
		},
		{ parentContext: traceContext || undefined },
	);
});

// Export spans periodically (for sending to collector)
setInterval(() => {
	const spans = telemetry.exportSpans();
	if (spans.length > 0) {
		// Send to OpenTelemetry collector
		console.log(`Exporting ${spans.length} spans`);
		// await sendToCollector(spans);
	}
}, 10000); // Every 10 seconds

/**
 * ===================================
 * 3. Enhanced OpenAPI Documentation
 * ===================================
 */

// Import schemas
import {
	ChatRequestSchema,
	FeedbackRequestSchema,
	AuthTokenRequestSchema,
	HealthResponseSchema,
	ApiTags,
	SecuritySchemes,
} from "./types/openapi";

// Configure Swagger with enhanced schemas
app.use(
	swagger({
		path: "/swagger",
		documentation: {
			info: {
				title: "Elysia AI API",
				version: "1.0.0",
				description: "Enterprise-grade RAG chat system with multi-LLM support",
				contact: {
					name: "API Support",
					email: "support@elysia-ai.com",
					url: "https://github.com/chloeamethyst/ElysiaJS",
				},
				license: {
					name: "MIT",
					url: "https://opensource.org/licenses/MIT",
				},
			},
			servers: [
				{
					url: "http://localhost:3000",
					description: "Development server",
				},
				{
					url: "https://api.elysia-ai.com",
					description: "Production server",
				},
			],
			tags: Object.values(ApiTags),
			components: {
				securitySchemes: SecuritySchemes,
			},
		},
	}),
);

// Use schemas in endpoints
app.post(
	"/elysia-love",
	async ({ body }) => {
		// Handler logic
		return { ok: true };
	},
	{
		body: t.Object({
			messages: t.Array(
				t.Object({
					role: t.Union([
						t.Literal("user"),
						t.Literal("assistant"),
						t.Literal("system"),
					]),
					content: t.String({ maxLength: 400, minLength: 1 }),
				}),
				{ maxItems: 8 },
			),
			mode: t.Optional(
				t.Union([
					t.Literal("sweet"),
					t.Literal("normal"),
					t.Literal("professional"),
				]),
			),
		}),
		detail: {
			tags: [ApiTags.CHAT.name],
			summary: "Chat with Elysia AI (Multi-LLM)",
			description:
				"Send chat messages to Elysia AI with selectable personality modes. Supports streaming SSE responses with RAG-enhanced answers.",
			security: [{ bearerAuth: [] }],
			responses: {
				200: {
					description: "Streaming SSE response",
					content: {
						"text/event-stream": {
							schema: {
								type: "string",
								description: "Server-Sent Events stream",
							},
						},
					},
				},
				400: {
					description: "Invalid request",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									error: { type: "string" },
								},
							},
							example: { error: "Invalid message format" },
						},
					},
				},
				401: {
					description: "Unauthorized",
					content: {
						"application/json": {
							example: { error: "Missing or invalid JWT token" },
						},
					},
				},
				429: {
					description: "Rate limit exceeded",
					content: {
						"application/json": {
							example: { error: "Too many requests" },
						},
					},
				},
			},
		},
	},
);

/**
 * ===================================
 * 4. Complete Integration Example
 * ===================================
 */

app.post(
	"/api/translate",
	async ({ body, request }) => {
		// 1. Get locale from request
		const locale = getLocaleFromRequest(request);

		// 2. Start tracing
		const traceContext = getTraceContextFromRequest(request);
		return await telemetry.trace(
			"translate",
			async (span) => {
				span.attributes["locale"] = locale;
				span.attributes["text.length"] = body.text.length;

				// 3. Use i18n for response
				const result = {
					translated: body.text, // Your translation logic
					locale,
					message: i18n.t("common.success", locale),
				};

				return result;
			},
			{ parentContext: traceContext || undefined },
		);
	},
	{
		body: t.Object({
			text: t.String({ minLength: 1, maxLength: 1000 }),
		}),
		detail: {
			tags: ["translation"],
			summary: "Translate text",
			description: "Translate text with automatic locale detection",
			parameters: [
				{
					name: "locale",
					in: "query",
					schema: { type: "string", enum: ["en", "ja", "zh", "ko"] },
					description: "Target locale (auto-detected if not provided)",
				},
			],
			responses: {
				200: {
					description: "Translation result",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									translated: { type: "string" },
									locale: { type: "string" },
									message: { type: "string" },
								},
							},
						},
					},
				},
			},
		},
	},
);

/**
 * ===================================
 * 5. Monitoring & Telemetry Dashboard
 * ===================================
 */

// Telemetry stats endpoint
app.get("/admin/telemetry/stats", () => {
	return telemetry.getStats();
});

// Export traces for debugging
app.get("/admin/telemetry/traces/:traceId", ({ params }) => {
	const spans = telemetry.getTrace(params.traceId);
	return { traceId: params.traceId, spans };
});

// Available locales
app.get("/api/locales", () => {
	return {
		default: i18n.getLocales()[0],
		supported: i18n.getLocales(),
	};
});

/**
 * ===================================
 * 6. Environment Configuration
 * ===================================
 */

// Add to .env
/*
# i18n
DEFAULT_LOCALE=en
SUPPORTED_LOCALES=en,ja,zh,ko

# Telemetry
TELEMETRY_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# OpenAPI
SWAGGER_ENABLED=true
API_VERSION=1.0.0
*/

/**
 * ===================================
 * 7. Testing Examples
 * ===================================
 */

// Test i18n
describe("i18n", () => {
	it("should translate to Japanese", () => {
		const text = i18n.t("common.hello", "ja");
		expect(text).toBe("こんにちは");
	});

	it("should detect locale from header", () => {
		const request = new Request("http://localhost", {
			headers: { "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8" },
		});
		const locale = getLocaleFromRequest(request);
		expect(locale).toBe("ja");
	});
});

// Test telemetry
describe("telemetry", () => {
	it("should create and end span", async () => {
		const span = telemetry.startSpan("test");
		expect(span.spanId).toBeDefined();

		telemetry.endSpan(span.spanId);
		const retrieved = telemetry.getSpan(span.spanId);
		expect(retrieved?.endTime).toBeDefined();
	});

	it("should trace function execution", async () => {
		const result = await telemetry.trace("test", async (span) => {
			span.attributes["test"] = true;
			return "success";
		});

		expect(result).toBe("success");
	});
});

export {};
