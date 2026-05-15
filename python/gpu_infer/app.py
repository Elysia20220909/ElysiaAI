from fastapi import FastAPI
from pydantic import BaseModel

from infer import engine


app = FastAPI(title="ElysiaAI GPU Inference Core")


class InferRequest(BaseModel):
    text: str


@app.get("/gpu/status")
def gpu_status():
    return {
        "device": engine.device,
        "gpu_ready": engine.ready,
    }


@app.post("/gpu/infer")
def gpu_infer(req: InferRequest):
    return engine.infer(req.text)
