import { describe, expect, test } from "bun:test";
import { introLearningTask } from "./learning-task";

describe("intro learning task", () => {
	test("describes a small route-focused exercise", () => {
		expect(introLearningTask.id).toBe("server-route-basics");
		expect(introLearningTask.title).toBe("Trace a small Elysia route");
		expect(introLearningTask.steps.map((step) => step.order)).toEqual([
			1, 2, 3, 4,
		]);
		expect(introLearningTask.steps[0]?.action).toContain("learning-routes.ts");
		expect(introLearningTask.checks).toContain(
			"bun test packages/server/src/lib/learning-task.test.ts",
		);
		expect(introLearningTask.next).toContain("update the test expectation");
	});
});
