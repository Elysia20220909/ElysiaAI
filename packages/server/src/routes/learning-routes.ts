import { Elysia } from "elysia";
import { introLearningTask } from "../lib/learning-task";

export const learningRoutes = new Elysia({ prefix: "/api/learning" }).get(
	"/intro",
	() => introLearningTask,
);
