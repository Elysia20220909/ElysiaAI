import time
from dataclasses import dataclass

import torch


@dataclass
class InferResult:
    input_text: str
    device: str
    gpu_ready: bool
    latency_ms: float
    score: float


class GPUInferEngine:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.ready = torch.cuda.is_available()

    def warmup(self):
        if not self.ready:
            return

        x = torch.randn((1, 1024), device=self.device, dtype=torch.float16)

        for _ in range(8):
            _ = x @ x.T

        torch.cuda.synchronize()

    def infer(self, text: str):
        started = time.perf_counter()

        if self.ready:
            x = torch.randn(
                (1, 2048),
                device=self.device,
                dtype=torch.float16,
            )
            y = x * 1.618
            torch.cuda.synchronize()
            score = float(y.mean().cpu())
        else:
            score = 0.0

        latency_ms = round((time.perf_counter() - started) * 1000, 3)

        result = InferResult(
            input_text=text,
            device=self.device,
            gpu_ready=self.ready,
            latency_ms=latency_ms,
            score=score,
        )

        return {
            "input": result.input_text,
            "device": result.device,
            "gpu_ready": result.gpu_ready,
            "latency_ms": result.latency_ms,
            "score": result.score,
        }


engine = GPUInferEngine()
engine.warmup()
