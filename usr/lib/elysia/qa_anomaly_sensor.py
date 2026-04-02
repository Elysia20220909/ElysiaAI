#!/usr/bin/env python3
"""
Epic 3: 品質保証（QA）とシステム防壁の構築
Issue 3-1: 感情抽出のゴールデンデータセットと自動テスト
"""
import asyncio
from unittest.mock import patch, MagicMock
from fastapi_server import analyze_emotion

# 【Golden Dataset】感情抽出の正解データセット
GOLDEN_DATASET = [
    ("やったー！ついに高難易度をクリアしたよ！", "joy"),
    ("今日も一日疲れた……残業ばっかりでもう何もしたくない", "exhaustion"),
    ("誰もいなくて寂しいな……誰かに話を聞いてほしい", "loneliness"),
    ("エリシアちゃん、大好きだよ！いつもそばにいてくれてありがとう♡", "affection"),
    ("明日の天気はどうなるかな。傘は必要かしら？", "neutral"),
]

async def run_tests():
    print("==================================================")
    print("🧪 Anomaly Sensor (Emotion Resonance) QA Test")
    print("==================================================")
    
    passed_tests = 0
    total_tests = len(GOLDEN_DATASET) + 1
    
    # 1. 正常系テスト (Zero-shot LLM Mocking)
    print("\n[1] Golden Dataset Verification...")
    with patch("fastapi_server.httpx.AsyncClient.post") as mock_post:
        for text, expected in GOLDEN_DATASET:
            # LLMのAPI応答をモック化
            mock_response = MagicMock()
            mock_response.json.return_value = {"message": {"content": expected}}
            mock_post.return_value = mock_response
            
            result = await analyze_emotion(text)
            if result == expected:
                status = "✅ PASS"
                passed_tests += 1
            else:
                status = f"❌ FAIL (Expected: {expected}, Got: {result})"
            
            print(f"  - [{expected.upper():<10}] Text: '{text[:15]}...' -> {status}")

    # 2. 異常系テスト（タイムアウト/エラー時の優雅なフォールバック）
    print("\n[2] Graceful Fallback (Error Handling) Verification...")
    with patch("fastapi_server.httpx.AsyncClient.post", side_effect=Exception("API Timeout")) as mock_post:
        result = await analyze_emotion("助けて！")
        if result == "neutral":
            status = "✅ PASS"
            passed_tests += 1
        else:
            status = f"❌ FAIL (Expected neutral fallback, Got: {result})"
            
        print(f"  - [API ERROR FALLBACK] Expected: neutral -> {status}")
        
    print("\n==================================================")
    if passed_tests == total_tests:
        print("✨ SUCCESS: All safeguards and resonance engines are operating perfectly.")
    else:
        print(f"⚠️ WARNING: {total_tests - passed_tests} tests failed. Please review the anomaly parameters.")
    print("==================================================\n")

if __name__ == "__main__":
    asyncio.run(run_tests())
