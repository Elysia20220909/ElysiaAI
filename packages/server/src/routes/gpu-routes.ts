import { Elysia, t } from "elysia";
import { gpuInfer, gpuStatus } from "../lib/gpu-client";

export const gpuRoutes = new Elysia({ prefix: "/gpu" })
  .get("/status", async ({ set }) => {
    try {
      return await gpuStatus();
    } catch (error) {
      set.status = 503;
      return {
        gpu_ready: false,
        status: "unavailable",
        error: error instanceof Error ? error.message : "GPU service unavailable",
      };
    }
  })
  .post(
    "/infer",
    async ({ body, set }) => {
      const text = body.text.trim();

      if (!text) {
        set.status = 400;
        return {
          error: "Missing text",
        };
      }

      try {
        return await gpuInfer(text);
      } catch (error) {
        set.status = 503;
        return {
          gpu_ready: false,
          status: "unavailable",
          error: error instanceof Error ? error.message : "GPU inference unavailable",
        };
      }
    },
    {
      body: t.Object({
        text: t.String({ minLength: 1 }),
      }),
    },
  );
