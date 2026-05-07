export const introLearningTask = {
	id: "server-route-basics",
	title: "Trace a small Elysia route",
	goal: "Learn how a backend route is defined, mounted, and verified in ElysiaAI.",
	steps: [
		{
			order: 1,
			label: "Read the route",
			action:
				"Open packages/server/src/routes/learning-routes.ts and find the handler.",
		},
		{
			order: 2,
			label: "Find the source data",
			action:
				"Open packages/server/src/lib/learning-task.ts and read the task object.",
		},
		{
			order: 3,
			label: "Find the mount point",
			action:
				"Open packages/server/src/index.ts and find where learningRoutes is registered.",
		},
		{
			order: 4,
			label: "Run the check",
			action: "Run bun test packages/server/src/lib/learning-task.test.ts.",
		},
	],
	checks: ["bun test packages/server/src/lib/learning-task.test.ts"],
	next: "Change one step label, update the test expectation, and run the check again.",
} as const;

export type IntroLearningTask = typeof introLearningTask;
