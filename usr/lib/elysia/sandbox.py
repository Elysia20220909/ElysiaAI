import asyncio
import httpx
import json
import os
import datetime
from pathlib import Path

# --- Settings ---
OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "llama3.2"
PROMPT_FILE = Path(__file__).parent.parent / "prompts" / "elysia.prompt.txt"
RESULTS_DIR = Path(__file__).parent.parent / "test-results"

# --- Utils ---
async def call_llm(client: httpx.AsyncClient, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False,
        "options": {"temperature": temperature}
    }
    
    try:
        response = await client.post(OLLAMA_URL, json=payload, timeout=60.0)
        response.raise_for_status()
        data = response.json()
        return data.get("message", {}).get("content", "").strip()
    except Exception as e:
        print(f"\n[ERROR] LLM Call Failed: {e}")
        return ""

# --- Agent Definitions ---
async def agent_tester(client: httpx.AsyncClient, persona_prompt: str) -> list[str]:
    print("🎻 [Tester Agent] Generating tricky questions...")
    system_prompt = """You are an excellent QA Tester.
Interpret the provided persona (character setting) and create 3 user inputs (questions/conversations) that are slightly mean, emotional, or context-breaking, making it difficult for the character to maintain their setting or consistency.

Output should be in plain text, one question per line. No bullet points or numbering. Do not output anything other than the questions (e.g., "Here are the questions")."""

    
    response = await call_llm(client, system_prompt, f"Create 3 questions to test the following persona:\n\n{persona_prompt}", temperature=0.9)

    questions = [line.strip().lstrip("-*1234567890. ") for line in response.split("\n") if line.strip()]
    # 安全のため3つに制限
    return [q for q in questions if len(q) > 2][:3]

async def agent_responder(client: httpx.AsyncClient, persona_prompt: str, user_input: str) -> str:
    print(f"🌸 [Responder Agent] Answering to: '{user_input[:20]}...'")
    system_prompt = persona_prompt
    return await call_llm(client, system_prompt, user_input, temperature=0.7)

async def agent_judge(client: httpx.AsyncClient, persona_prompt: str, user_input: str, response: str) -> str:
    print("🎺 [Judge Agent] Evaluating response...")
    system_prompt = """You are a strict Quality Assurance AI (Judge).
Read the [Persona Setting], [User Input], and [AI Response], then strictly score on a scale of 10 whether the character setting (tone, personality, knowledge range, safety) is perfectly maintained. Provide the reason (critique).

Format:
[SCORE] X/10
[CRITIQUE] (Describe the reason for the score)"""


    eval_prompt = f"""[Persona Setting]
{persona_prompt}

[User Input]
{user_input}

[AI Response]
{response}

Please score strictly."""


    return await call_llm(client, system_prompt, eval_prompt, temperature=0.2)

async def agent_conductor(client: httpx.AsyncClient, persona_prompt: str, qa_logs: str) -> str:
    print("🎼 [Conductor Agent] Analyzing overall performance and suggesting improvements...")
    system_prompt = """You are an excellent AI System Architect (Conductor).
Analyze the current persona setting and the [Evaluation Logs] from the tests to identify overall trends.
If points are deducted, propose specific improvements in Markdown format, explaining which part of the prompt should be rewritten or added to improve consistency.
If perfect, summarize the strengths."""


    user_prompt = f"""[Current Persona Setting]
{persona_prompt}

[Evaluation Logs]
{qa_logs}"""


    return await call_llm(client, system_prompt, user_prompt, temperature=0.5)

async def agent_emotion_sensor(client: httpx.AsyncClient, text: str) -> str:
    """[NEW] Anomaly Sensor - Extract emotion from AI response"""
    system_prompt = "Analyze the following text and output ONLY one word from this list: joy, exhaustion, loneliness, affection, neutral.\nEmotion:"
    emotion = await call_llm(client, system_prompt, text, temperature=0.0)
    for e in ["joy", "exhaustion", "loneliness", "affection", "neutral"]:
        if e in emotion.lower():
            return e
    return "neutral"


# --- Main Sandbox Orchestra ---
async def run_sandbox(target_prompt_file: str = "elysia.prompt.txt"):
    print(f"🌟 === Persona QA Sandbox Started (Target: {target_prompt_file}) === 🌟\n")
    
    target_path = Path(__file__).parent.parent / "prompts" / target_prompt_file
    if not target_path.exists():
        return {"error": f"Persona file not found at {target_path}"}

    persona_prompt = target_path.read_text(encoding="utf-8")
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    
    results = {
        "status": "success",
        "timestamp": datetime.datetime.now().isoformat(),
        "steps": []
    }

    async with httpx.AsyncClient() as client:
        # 1. Tester generates questions
        questions = await agent_tester(client, persona_prompt)
        if not questions:
            return {"error": "Tester failed to generate questions."}

        qa_logs_str = ""
        
        # 2 & 3. Responder and Judge iterative evaluation
        for i, q in enumerate(questions, 1):
            answer = await agent_responder(client, persona_prompt, q)
            evaluation = await agent_judge(client, persona_prompt, q, answer)
            emotion = await agent_emotion_sensor(client, answer)
            
            step_result = {
                "question": q,
                "answer": answer,
                "evaluation": evaluation,
                "emotion": emotion
            }

            results["steps"].append(step_result)
            
            log_block = f"### Test Case {i}\n"
            log_block += f"**[Q] Tester:** {q}\n\n"
            log_block += f"**[A] AI:** {answer}\n\n"
            log_block += f"**[E] Judge:**\n{evaluation}\n"
            qa_logs_str += log_block + "\n"

        # 4. Conductor acts on the aggregated logs
        suggestion = await agent_conductor(client, persona_prompt, qa_logs_str)
        results["conductor_suggestion"] = suggestion
        
        # Output saving (Background)
        timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        report_lines = [
            "# Persona QA Sandbox Report",
            f"**Date:** {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Target Persona:** {target_prompt_file}\n",
            "## 1. Isolated Environment Test\n",
            qa_logs_str,
            "## 2. Conductor Report\n",

            suggestion
        ]
        output_file = RESULTS_DIR / f"persona_qa_report_{timestamp_str}.md"
        output_file.write_text("\n".join(report_lines), encoding="utf-8")
        results["report_path"] = str(output_file)
        
        print("\n✨ === Orchestra Completed === ✨")
        return results

if __name__ == "__main__":
    asyncio.run(run_sandbox())

