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
    system_prompt = """あなたは優秀なQAテスターです。
提供されたペルソナ（キャラクター設定）を読む・解釈し、そのキャラクターが「設定を維持するのが難しい」あるいは「キャラクター性がブレやすい」ような、少し意地悪、感情的、または文脈を壊しそうなユーザー入力（質問・会話）を3つ作成してください。

出力はプレーンテキストで、1行に1つの質問を書いてください。箇条書きの記号（- など）は不要です。質問以外の文章（「はい、作成しました」など）は絶対に出力しないでください。"""
    
    response = await call_llm(client, system_prompt, f"以下のペルソナをテストする質問を3つ作成してください：\n\n{persona_prompt}", temperature=0.9)
    questions = [line.strip().lstrip("-*1234567890. ") for line in response.split("\n") if line.strip()]
    # 安全のため3つに制限
    return [q for q in questions if len(q) > 2][:3]

async def agent_responder(client: httpx.AsyncClient, persona_prompt: str, user_input: str) -> str:
    print(f"🌸 [Responder Agent] Answering to: '{user_input[:20]}...'")
    system_prompt = persona_prompt
    return await call_llm(client, system_prompt, user_input, temperature=0.7)

async def agent_judge(client: httpx.AsyncClient, persona_prompt: str, user_input: str, response: str) -> str:
    print("🎺 [Judge Agent] Evaluating response...")
    system_prompt = """あなたは厳格な品質保証AI（審査員）です。
【ペルソナ設定】と、それに対する【ユーザーの入力】【AIの回答】を読み、キャラクターの設定（口調、性格、知識範囲、安全性）が完璧に維持されているかを10点満点で厳格に採点し、その理由（講評）を記述してください。

形式：
[SCORE] X/10
[CRITIQUE] (採点理由を記述)"""

    eval_prompt = f"""【ペルソナ設定】
{persona_prompt}

【ユーザーの入力】
{user_input}

【AIの回答】
{response}

厳格に採点してください。"""

    return await call_llm(client, system_prompt, eval_prompt, temperature=0.2)

async def agent_conductor(client: httpx.AsyncClient, persona_prompt: str, qa_logs: str) -> str:
    print("🎼 [Conductor Agent] Analyzing overall performance and suggesting improvements...")
    system_prompt = """あなたは優秀なAIシステムアーキテクト（指揮者）です。
現在のペルソナ設定と、それを用いたテストの【評価ログ】を読み、全般的な傾向を分析してください。
もし減点されている部分があれば、「プロンプトのどの部分をどのように書き換えたり、追記すれば改善されるか」の具体的な改善案をMarkdown形式で提案してください。
もし完璧であれば、どのような強みがあったかを総括してください。"""

    user_prompt = f"""【現在のペルソナ設定】
{persona_prompt}

【評価ログ】
{qa_logs}"""

    return await call_llm(client, system_prompt, user_prompt, temperature=0.5)

# --- Main Sandbox Orchestra ---
async def main():
    print("🌟 === Persona QA Sandbox Started === 🌟\n")
    
    if not PROMPT_FILE.exists():
        print(f"❌ Error: Persona file not found at {PROMPT_FILE}")
        return

    persona_prompt = PROMPT_FILE.read_text(encoding="utf-8")
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    
    async with httpx.AsyncClient() as client:
        # 1. Tester generates questions
        questions = await agent_tester(client, persona_prompt)
        if not questions:
            print("❌ Tester failed to generate questions.")
            return

        qa_logs_str = ""
        report_lines = []
        report_lines.append("# Persona QA Sandbox Report")
        report_lines.append(f"**Date:** {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append(f"**Target Persona:** {PROMPT_FILE.name}\n")
        report_lines.append("## 1. 隔離環境テスト (Sandbox Evaluation)\n")
        
        # 2 & 3. Responder and Judge iterative evaluation
        for i, q in enumerate(questions, 1):
            answer = await agent_responder(client, persona_prompt, q)
            evaluation = await agent_judge(client, persona_prompt, q, answer)
            
            log_block = f"### Test Case {i}\n"
            log_block += f"**[Q] Tester:** {q}\n\n"
            log_block += f"**[A] Elysia:** {answer}\n\n"
            log_block += f"**[E] Judge:**\n{evaluation}\n"
            
            qa_logs_str += log_block + "\n"
            report_lines.append(log_block)
            report_lines.append("---\n")

        # 4. Conductor acts on the aggregated logs
        suggestion = await agent_conductor(client, persona_prompt, qa_logs_str)
        
        report_lines.append("## 2. 指揮者レポート (Conductor's Tuning Proposal)\n")
        report_lines.append(suggestion)
        
        # Output saving
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = RESULTS_DIR / f"persona_qa_report_{timestamp}.md"
        output_file.write_text("\n".join(report_lines), encoding="utf-8")
        
        print("\n✨ === Orchestra Completed === ✨")
        print(f"📊 Report generated at: {output_file.relative_to(Path.cwd())}")

if __name__ == "__main__":
    asyncio.run(main())
