import { Elysia, t } from "elysia";
import { gpuInfer, gpuStatus } from "../lib/gpu-client";

type GPUStreamMessage = {
  type?: "infer" | "status" | "ping";
  text?: string;
};

function safeParseMessage(message: unknown): GPUStreamMessage {
  if (typeof message === "string") {
    try {
      return JSON.parse(message) as GPUStreamMessage;
    } catch {
      return { type: "infer", text: message };
    }
  }

  if (typeof message === "object" && message !== null) {
    return message as GPUStreamMessage;
  }

  return { type: "ping" };
}

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
  )
  .ws("/stream", {
    open(ws) {
      ws.send({
        type: "ready",
        route: "/gpu/stream",
        message: "ElysiaAI GPU realtime stream is online",
        timestamp: new Date().toISOString(),
      });
    },
    async message(ws, message) {
      const payload = safeParseMessage(message);

      if (payload.type === "ping") {
        ws.send({ type: "pong", timestamp: new Date().toISOString() });
        return;
      }

      if (payload.type === "status") {
        try {
          ws.send({ type: "status", data: await gpuStatus() });
        } catch (error) {
          ws.send({
            type: "error",
            error: error instanceof Error ? error.message : "GPU status unavailable",
          });
        }
        return;
      }

      const text = payload.text?.trim();

      if (!text) {
        ws.send({ type: "error", error: "Missing text" });
        return;
      }

      try {
        ws.send({ type: "started", input: text, timestamp: new Date().toISOString() });
        const result = await gpuInfer(text);
        ws.send({ type: "result", data: result, timestamp: new Date().toISOString() });
      } catch (error) {
        ws.send({
          type: "error",
          error: error instanceof Error ? error.message : "GPU inference unavailable",
        });
      }
    },
  });
