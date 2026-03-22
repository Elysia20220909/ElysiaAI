export declare const MessageSchema: {
	readonly type: "object";
	readonly properties: {
		readonly role: {
			readonly type: "string";
			readonly enum: readonly ["user", "assistant", "system"];
			readonly description: "The role of the message sender";
		};
		readonly content: {
			readonly type: "string";
			readonly minLength: 1;
			readonly maxLength: 400;
			readonly description: "The content of the message";
			readonly example: "こんにちは、Elysia！";
		};
	};
	readonly required: readonly ["role", "content"];
};
export declare const ChatRequestSchema: {
	readonly type: "object";
	readonly properties: {
		readonly messages: {
			readonly type: "array";
			readonly items: {
				readonly type: "object";
				readonly properties: {
					readonly role: {
						readonly type: "string";
						readonly enum: readonly ["user", "assistant", "system"];
						readonly description: "The role of the message sender";
					};
					readonly content: {
						readonly type: "string";
						readonly minLength: 1;
						readonly maxLength: 400;
						readonly description: "The content of the message";
						readonly example: "こんにちは、Elysia！";
					};
				};
				readonly required: readonly ["role", "content"];
			};
			readonly minItems: 1;
			readonly maxItems: 8;
			readonly description: "Array of conversation messages";
			readonly example: readonly [
				{
					readonly role: "user";
					readonly content: "What is AI?";
				},
			];
		};
		readonly mode: {
			readonly type: "string";
			readonly enum: readonly ["sweet", "normal", "professional"];
			readonly description: "Conversation mode that affects Elysia's personality";
			readonly default: "normal";
		};
	};
	readonly required: readonly ["messages"];
};
export declare const FeedbackRequestSchema: {
	readonly type: "object";
	readonly properties: {
		readonly query: {
			readonly type: "string";
			readonly minLength: 1;
			readonly maxLength: 400;
			readonly description: "The original user query";
			readonly example: "What is machine learning?";
		};
		readonly answer: {
			readonly type: "string";
			readonly minLength: 1;
			readonly maxLength: 4000;
			readonly description: "The AI-generated answer";
		};
		readonly rating: {
			readonly type: "string";
			readonly enum: readonly ["up", "down"];
			readonly description: "Thumbs up or down rating";
		};
		readonly reason: {
			readonly type: "string";
			readonly maxLength: 256;
			readonly description: "Optional reason for the rating";
			readonly example: "The answer was very helpful and accurate";
		};
	};
	readonly required: readonly ["query", "answer", "rating"];
};
export declare const KnowledgeUpsertSchema: {
	readonly type: "object";
	readonly properties: {
		readonly summary: {
			readonly type: "string";
			readonly minLength: 10;
			readonly maxLength: 2000;
			readonly description: "Summary of the knowledge entry";
			readonly example: "Machine learning is a subset of AI that enables systems to learn from data";
		};
		readonly sourceUrl: {
			readonly type: "string";
			readonly format: "uri";
			readonly description: "URL source of the knowledge";
			readonly example: "https://example.com/ml-guide";
		};
		readonly tags: {
			readonly type: "array";
			readonly items: {
				readonly type: "string";
				readonly maxLength: 32;
			};
			readonly maxItems: 8;
			readonly description: "Tags for categorizing knowledge";
			readonly example: readonly ["AI", "machine-learning", "data-science"];
		};
		readonly confidence: {
			readonly type: "number";
			readonly minimum: 0;
			readonly maximum: 1;
			readonly description: "Confidence score (0-1)";
			readonly example: 0.95;
		};
	};
	readonly required: readonly ["summary", "confidence"];
};
export declare const AuthTokenRequestSchema: {
	readonly type: "object";
	readonly properties: {
		readonly username: {
			readonly type: "string";
			readonly minLength: 1;
			readonly maxLength: 128;
			readonly description: "Username for authentication";
			readonly example: "elysia";
		};
		readonly password: {
			readonly type: "string";
			readonly minLength: 1;
			readonly maxLength: 128;
			readonly description: "Password for authentication";
			readonly format: "password";
		};
	};
	readonly required: readonly ["username", "password"];
};
export declare const AuthTokenResponseSchema: {
	readonly type: "object";
	readonly properties: {
		readonly accessToken: {
			readonly type: "string";
			readonly description: "JWT access token (15 minutes validity)";
			readonly example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
		};
		readonly refreshToken: {
			readonly type: "string";
			readonly description: "JWT refresh token (7 days validity)";
		};
		readonly expiresIn: {
			readonly type: "number";
			readonly description: "Token expiration time in seconds";
			readonly example: 900;
		};
	};
};
export declare const RefreshTokenRequestSchema: {
	readonly type: "object";
	readonly properties: {
		readonly refreshToken: {
			readonly type: "string";
			readonly minLength: 20;
			readonly description: "Valid refresh token";
		};
	};
	readonly required: readonly ["refreshToken"];
};
export declare const HealthResponseSchema: {
	readonly type: "object";
	readonly properties: {
		readonly status: {
			readonly type: "string";
			readonly enum: readonly ["healthy", "degraded", "unhealthy"];
			readonly description: "Overall system health status";
		};
		readonly timestamp: {
			readonly type: "string";
			readonly format: "date-time";
			readonly description: "ISO timestamp of health check";
		};
		readonly uptime: {
			readonly type: "number";
			readonly description: "Server uptime in seconds";
		};
		readonly services: {
			readonly type: "object";
			readonly properties: {
				readonly redis: {
					readonly $ref: "#/components/schemas/ServiceHealth";
				};
				readonly fastapi: {
					readonly $ref: "#/components/schemas/ServiceHealth";
				};
				readonly ollama: {
					readonly $ref: "#/components/schemas/ServiceHealth";
				};
			};
		};
		readonly system: {
			readonly type: "object";
			readonly properties: {
				readonly memory: {
					readonly type: "object";
					readonly properties: {
						readonly used: {
							readonly type: "number";
							readonly description: "Used memory in MB";
						};
						readonly total: {
							readonly type: "number";
							readonly description: "Total memory in MB";
						};
						readonly percentage: {
							readonly type: "number";
							readonly description: "Memory usage percentage";
						};
					};
				};
				readonly cpu: {
					readonly type: "object";
					readonly properties: {
						readonly usage: {
							readonly type: "number";
							readonly description: "CPU usage in seconds";
						};
					};
				};
			};
		};
	};
};
export declare const ServiceHealthSchema: {
	readonly type: "object";
	readonly properties: {
		readonly status: {
			readonly type: "string";
			readonly enum: readonly ["up", "down", "degraded"];
			readonly description: "Service status";
		};
		readonly responseTime: {
			readonly type: "number";
			readonly description: "Response time in milliseconds";
		};
		readonly error: {
			readonly type: "string";
			readonly description: "Error message if service is down";
		};
		readonly lastCheck: {
			readonly type: "string";
			readonly format: "date-time";
			readonly description: "Timestamp of last health check";
		};
	};
};
export declare const ErrorResponseSchema: {
	readonly type: "object";
	readonly properties: {
		readonly error: {
			readonly type: "string";
			readonly description: "Error message";
			readonly example: "Invalid credentials";
		};
		readonly code: {
			readonly type: "string";
			readonly description: "Error code";
			readonly example: "AUTH_FAILED";
		};
		readonly details: {
			readonly type: "object";
			readonly description: "Additional error details";
		};
	};
	readonly required: readonly ["error"];
};
export declare const ApiTags: {
	readonly HEALTH: {
		readonly name: "health";
		readonly description: "Health check and system status endpoints";
	};
	readonly AUTH: {
		readonly name: "auth";
		readonly description: "Authentication and authorization endpoints";
	};
	readonly CHAT: {
		readonly name: "chat";
		readonly description: "AI chat conversation endpoints";
	};
	readonly FEEDBACK: {
		readonly name: "feedback";
		readonly description: "User feedback collection endpoints";
	};
	readonly KNOWLEDGE: {
		readonly name: "knowledge";
		readonly description: "Knowledge base management endpoints";
	};
	readonly METRICS: {
		readonly name: "metrics";
		readonly description: "Prometheus metrics endpoints";
	};
	readonly UI: {
		readonly name: "ui";
		readonly description: "User interface endpoints";
	};
};
export declare const SecuritySchemes: {
	readonly bearerAuth: {
		readonly type: "http";
		readonly scheme: "bearer";
		readonly bearerFormat: "JWT";
		readonly description: "JWT authentication token obtained from /auth/token endpoint";
	};
};
export declare const ResponseExamples: {
	readonly successResponse: {
		readonly ok: true;
	};
	readonly errorResponse: {
		readonly error: "An error occurred";
	};
	readonly validationError: {
		readonly error: "Validation failed";
		readonly details: {
			readonly field: "username";
			readonly message: "Username is required";
		};
	};
	readonly unauthorizedError: {
		readonly error: "Unauthorized";
		readonly code: "AUTH_REQUIRED";
	};
	readonly rateLimitError: {
		readonly error: "Rate limit exceeded";
		readonly code: "RATE_LIMIT_EXCEEDED";
	};
};
//# sourceMappingURL=openapi.d.ts.map
