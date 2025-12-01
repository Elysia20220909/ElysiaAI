// English-only test for POST /ai
// Sends a JSON body with `messages` (simple chat-style array)
// and prints the response body and status.

// URL can be set via command-line argument, environment variable, or defaults to localhost
const url = process.argv[2] || process.env.AI_URL || "http://localhost:3000/ai";

const body = {
	messages: [
		{
			role: "user",
			content:
				"Hello, please respond in English. Tell me a short friendly greeting.",
		},
	],
};

async function run() {
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		console.log("Status:", res.status);

		// Try to read as text (AI endpoint returns plain/text in this app)
		const text = await res.text();
		console.log("--- Response body ---");
		console.log(text);
		console.log("--- End response ---");
	} catch (err) {
		console.error("Request failed:", err);
	}
}

run();
