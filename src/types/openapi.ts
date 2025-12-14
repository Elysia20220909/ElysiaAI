// Enhanced OpenAPI Schema Definitions
import type { TSchema } from "elysia";

export const MessageSchema = {
	type: "object",
	properties: {
		role: {
			type: "string",
			enum: ["user", "assistant", "system"],
			description: "The role of the message sender",
		},
		content: {
			type: "string",
			minLength: 1,
			maxLength: 400,
			description: "The content of the message",
			example: "こんにちは、Elysia！",
		},
	},
	required: ["role", "content"],
} as const;

export const ChatRequestSchema = {
	type: "object",
	properties: {
		messages: {
			type: "array",
			items: MessageSchema,
			minItems: 1,
			maxItems: 8,
			description: "Array of conversation messages",
			example: [{ role: "user", content: "What is AI?" }],
		},
		mode: {
			type: "string",
			enum: ["sweet", "normal", "professional"],
			description: "Conversation mode that affects Elysia's personality",
			default: "normal",
		},
	},
	required: ["messages"],
} as const;

export const FeedbackRequestSchema = {
	type: "object",
	properties: {
		query: {
			type: "string",
			minLength: 1,
			maxLength: 400,
			description: "The original user query",
			example: "What is machine learning?",
		},
		answer: {
			type: "string",
			minLength: 1,
			maxLength: 4000,
			description: "The AI-generated answer",
		},
		rating: {
			type: "string",
			enum: ["up", "down"],
			description: "Thumbs up or down rating",
		},
		reason: {
			type: "string",
			maxLength: 256,
			description: "Optional reason for the rating",
			example: "The answer was very helpful and accurate",
		},
	},
	required: ["query", "answer", "rating"],
} as const;

export const KnowledgeUpsertSchema = {
	type: "object",
	properties: {
		summary: {
			type: "string",
			minLength: 10,
			maxLength: 2000,
			description: "Summary of the knowledge entry",
			example: "Machine learning is a subset of AI that enables systems to learn from data",
		},
		sourceUrl: {
			type: "string",
			format: "uri",
			description: "URL source of the knowledge",
			example: "https://example.com/ml-guide",
		},
		tags: {
			type: "array",
			items: {
				type: "string",
				maxLength: 32,
			},
			maxItems: 8,
			description: "Tags for categorizing knowledge",
			example: ["AI", "machine-learning", "data-science"],
		},
		confidence: {
			type: "number",
			minimum: 0,
			maximum: 1,
			description: "Confidence score (0-1)",
			example: 0.95,
		},
	},
	required: ["summary", "confidence"],
} as const;

export const AuthTokenRequestSchema = {
	type: "object",
	properties: {
		username: {
			type: "string",
			minLength: 1,
			maxLength: 128,
			description: "Username for authentication",
			example: "elysia",
		},
		password: {
			type: "string",
			minLength: 1,
			maxLength: 128,
			description: "Password for authentication",
			format: "password",
		},
	},
	required: ["username", "password"],
} as const;

export const AuthTokenResponseSchema = {
	type: "object",
	properties: {
		accessToken: {
			type: "string",
			description: "JWT access token (15 minutes validity)",
			example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		},
		refreshToken: {
			type: "string",
			description: "JWT refresh token (7 days validity)",
		},
		expiresIn: {
			type: "number",
			description: "Token expiration time in seconds",
			example: 900,
		},
	},
} as const;

export const RefreshTokenRequestSchema = {
	type: "object",
	properties: {
		refreshToken: {
			type: "string",
			minLength: 20,
			description: "Valid refresh token",
		},
	},
	required: ["refreshToken"],
} as const;

export const HealthResponseSchema = {
	type: "object",
	properties: {
		status: {
			type: "string",
			enum: ["healthy", "degraded", "unhealthy"],
			description: "Overall system health status",
		},
		timestamp: {
			type: "string",
			format: "date-time",
			description: "ISO timestamp of health check",
		},
		uptime: {
			type: "number",
			description: "Server uptime in seconds",
		},
		services: {
			type: "object",
			properties: {
				redis: {
					$ref: "#/components/schemas/ServiceHealth",
				},
				fastapi: {
					$ref: "#/components/schemas/ServiceHealth",
				},
				ollama: {
					$ref: "#/components/schemas/ServiceHealth",
				},
			},
		},
		system: {
			type: "object",
			properties: {
				memory: {
					type: "object",
					properties: {
						used: { type: "number", description: "Used memory in MB" },
						total: { type: "number", description: "Total memory in MB" },
						percentage: {
							type: "number",
							description: "Memory usage percentage",
						},
					},
				},
				cpu: {
					type: "object",
					properties: {
						usage: { type: "number", description: "CPU usage in seconds" },
					},
				},
			},
		},
	},
} as const;

export const ServiceHealthSchema = {
	type: "object",
	properties: {
		status: {
			type: "string",
			enum: ["up", "down", "degraded"],
			description: "Service status",
		},
		responseTime: {
			type: "number",
			description: "Response time in milliseconds",
		},
		error: {
			type: "string",
			description: "Error message if service is down",
		},
		lastCheck: {
			type: "string",
			format: "date-time",
			description: "Timestamp of last health check",
		},
	},
} as const;

export const ErrorResponseSchema = {
	type: "object",
	properties: {
		error: {
			type: "string",
			description: "Error message",
			example: "Invalid credentials",
		},
		code: {
			type: "string",
			description: "Error code",
			example: "AUTH_FAILED",
		},
		details: {
			type: "object",
			description: "Additional error details",
		},
	},
	required: ["error"],
} as const;

// OpenAPI documentation tags
export const ApiTags = {
	HEALTH: {
		name: "health",
		description: "Health check and system status endpoints",
	},
	AUTH: {
		name: "auth",
		description: "Authentication and authorization endpoints",
	},
	CHAT: {
		name: "chat",
		description: "AI chat conversation endpoints",
	},
	FEEDBACK: {
		name: "feedback",
		description: "User feedback collection endpoints",
	},
	KNOWLEDGE: {
		name: "knowledge",
		description: "Knowledge base management endpoints",
	},
	METRICS: {
		name: "metrics",
		description: "Prometheus metrics endpoints",
	},
	UI: {
		name: "ui",
		description: "User interface endpoints",
	},
} as const;

// Security schemes
export const SecuritySchemes = {
	bearerAuth: {
		type: "http",
		scheme: "bearer",
		bearerFormat: "JWT",
		description: "JWT authentication token obtained from /auth/token endpoint",
	},
} as const;

// Common response examples
export const ResponseExamples = {
	successResponse: {
		ok: true,
	},
	errorResponse: {
		error: "An error occurred",
	},
	validationError: {
		error: "Validation failed",
		details: {
			field: "username",
			message: "Username is required",
		},
	},
	unauthorizedError: {
		error: "Unauthorized",
		code: "AUTH_REQUIRED",
	},
	rateLimitError: {
		error: "Rate limit exceeded",
		code: "RATE_LIMIT_EXCEEDED",
	},
} as const;
