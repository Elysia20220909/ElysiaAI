const DEFAULT_ALLOWED_ORIGINS = [
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"http://localhost:5173",
	"http://127.0.0.1:5173",
];

export function getAllowedOrigins(
	value = process.env.ALLOWED_ORIGINS,
): string[] {
	const origins = (value || "")
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean)
		.filter((origin) => origin !== "*");

	return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}

export function buildCorsConfig() {
	return {
		origin: getAllowedOrigins(),
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Authorization",
			"Content-Type",
			"x-api-key",
			"x-csrf-token",
			"x-slack-request-timestamp",
			"x-slack-signature",
		],
		exposeHeaders: ["x-csrf-token"],
	};
}
