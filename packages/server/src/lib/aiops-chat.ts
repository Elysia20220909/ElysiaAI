import { getInfraIssues, getLinstorStatus, getPowerStatus } from "./infra-ops";
import { logger } from "./logger";
import { getOpenAIClient, type OpenAIChatMessage } from "./openai-integration";

const AIOPS_TOOLS = [
	{
		type: "function" as const,
		function: {
			name: "check_server_status",
			description:
				"Check the power status (ON/OFF) of a specific infrastructure server (e.g. server4, server5, server6, server7).",
			parameters: {
				type: "object",
				properties: {
					nodeName: {
						type: "string",
						description:
							"The identifier of the server, must be 'server4', 'server5', 'server6', or 'server7'.",
					},
				},
				required: ["nodeName"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "list_infra_issues",
			description: "List all active bare-metal infrastructure issues or tasks.",
			parameters: {
				type: "object",
				properties: {},
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "check_linstor_status",
			description: "Check the LINSTOR storage benchmark and cluster status.",
			parameters: {
				type: "object",
				properties: {},
			},
		},
	},
];

// biome-ignore lint/suspicious/noExplicitAny: LLM passes unstructured arguments
async function executeToolCall(name: string, args: any): Promise<string> {
	try {
		logger.info(
			`[AIOps Tool] Executing ${name} with args: ${JSON.stringify(args)}`,
		);
		switch (name) {
			case "check_server_status": {
				const res = await getPowerStatus(`${args.nodeName}.yml`);
				return res.success ? res.stdout : `Failed: ${res.stderr}`;
			}
			case "list_infra_issues": {
				const res = await getInfraIssues();
				return res.success ? res.stdout : `Failed: ${res.stderr}`;
			}
			case "check_linstor_status": {
				const res = await getLinstorStatus();
				return res.success ? res.stdout : `Failed: ${res.stderr}`;
			}
			default:
				return "Unknown tool called.";
		}
	} catch (e: any) {
		logger.error(`[AIOps Tool Error] ${name}`, e);
		return `Error executing tool: ${e.message}`;
	}
}

/**
 * Handles chat requests and automatically executes AIOps tools before streaming the final response.
 */
export async function* streamChatWithAIOps(
	messages: OpenAIChatMessage[],
	options: { model: string; temperature: number },
): AsyncGenerator<string, void, unknown> {
	const client = getOpenAIClient();

	// Step 1: Send a non-streaming request to see if the LLM wants to call a tool
	const initialResponse = await client.chat.completions.create({
		model: options.model,
		// biome-ignore lint/suspicious/noExplicitAny: type union mismatch between Elysia interface and OpenAI framework
		messages: messages as any,
		temperature: options.temperature,
		tools: AIOPS_TOOLS,
		tool_choice: "auto",
	});

	const responseMessage = initialResponse.choices[0].message;

	// Step 2: Check if tool calls were requested
	if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
		// biome-ignore lint/suspicious/noExplicitAny: LLM interaction array generic extension
		const newMessages: any[] = [...messages, responseMessage];

		for (const toolCall of responseMessage.tool_calls) {
			// biome-ignore lint/suspicious/noExplicitAny: Tool call function inference workaround
			const functionName = (toolCall as any).function.name;
			// biome-ignore lint/suspicious/noExplicitAny: Tool call function inference workaround
			const functionArgs = JSON.parse(
				(toolCall as any).function.arguments || "{}",
			);

			const functionResult = await executeToolCall(functionName, functionArgs);

			newMessages.push({
				tool_call_id: toolCall.id,
				role: "tool",
				name: functionName,
				content: functionResult,
			});
		}

		// Step 3: Stream the final response with the tool results included
		const stream = await client.chat.completions.create({
			model: options.model,
			messages: newMessages,
			temperature: options.temperature,
			stream: true,
		});

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content;
			if (content) {
				yield content;
			}
		}
	} else {
		// If no tools were called, just yield the full content immediately
		// (To optimize latency, we could initially stream, but to support tools simply, we yield the complete text here)
		// Or we can just stream a new one if it didn't call tools, but returning the text chunk by chunk is easier:
		if (responseMessage.content) {
			const words = responseMessage.content.split(/(?=\S)/);
			for (const word of words) {
				yield word;
			}
		}
	}
}
