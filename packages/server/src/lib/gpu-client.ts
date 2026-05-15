export type GPUInferResponse = {
  input: string;
  device: string;
  gpu_ready: boolean;
  latency_ms: number;
  score: number;
};

const GPU_ENDPOINT = process.env.ELYSIA_GPU_ENDPOINT ?? "http://127.0.0.1:8787";

export async function gpuInfer(text: string): Promise<GPUInferResponse> {
  const response = await fetch(`${GPU_ENDPOINT}/gpu/infer`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`GPU inference failed (${response.status})`);
  }

  return (await response.json()) as GPUInferResponse;
}

export async function gpuStatus() {
  const response = await fetch(`${GPU_ENDPOINT}/gpu/status`);

  if (!response.ok) {
    throw new Error(`GPU status failed (${response.status})`);
  }

  return await response.json();
}
