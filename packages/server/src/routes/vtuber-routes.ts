import { Elysia } from "elysia";
import {
	buildOpenLlmVtuberManifest,
	checkOpenLlmVtuberStatus,
} from "../lib/open-llm-vtuber";

export const vtuberRoutes = new Elysia({ prefix: "/api/vtuber" })
	.get("/manifest", () => buildOpenLlmVtuberManifest())
	.get("/status", () => checkOpenLlmVtuberStatus());
