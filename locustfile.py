"""
エリシアAI Locust 負荷テストスイート
実行: locust -f locustfile.py --host=http://localhost:5001
"""

from locust import HttpUser, task, between, events
import json
import time
from datetime import datetime

class ElysiaAIUser(HttpUser):
    """
    エリシアAI の典型的なユーザー行動をシミュレート
    """
    wait_time = between(1, 3)  # 1〜3秒の待機時間

    @task(weight=5)
    def ping(self):
        """ヘルスチェック (最頻)"""
        self.client.get("/ping")

    @task(weight=3)
    def health_check(self):
        """ヘルスチェック詳細"""
        self.client.get("/health")

    @task(weight=2)
    def api_docs(self):
        """API ドキュメント"""
        self.client.get("/swagger")

    @task(weight=1)
    def chat_api(self):
        """チャットAPI (模擬)"""
        payload = {
            "messages": [
                {"role": "user", "content": "こんにちは"}
            ],
            "mode": "normal"
        }
        self.client.post(
            "/chat",
            json=payload,
            name="/chat"
        )

    def on_start(self):
        """テスト開始時"""
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] ユーザー開始")

    def on_stop(self):
        """テスト終了時"""
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] ユーザー終了")


class StressTestUser(HttpUser):
    """
    ストレステスト: 集中的にリクエスト送信
    """
    wait_time = between(0.1, 0.5)  # 高速リクエスト

    @task
    def stress_ping(self):
        """ストレステスト用 Ping"""
        self.client.get("/ping", name="/ping-stress")


class APIEndpointUser(HttpUser):
    """
    個別API エンドポイント用テストユーザー
    """
    wait_time = between(2, 5)

    @task
    def test_endpoints(self):
        """様々なエンドポイントのテスト"""
        endpoints = [
            ("/ping", "GET", None),
            ("/health", "GET", None),
            ("/metrics", "GET", None),
        ]

        for endpoint, method, payload in endpoints:
            if method == "GET":
                self.client.get(endpoint, name=endpoint)
            elif method == "POST":
                self.client.post(endpoint, json=payload, name=endpoint)


# ============================================================================
# イベントハンドラ
# ============================================================================

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """テスト開始時"""
    print("\n" + "="*70)
    print("🚀 Locust 負荷テスト開始")
    print(f"   ターゲット: {environment.host}")
    print(f"   開始時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """テスト終了時"""
    print("\n" + "="*70)
    print("✅ Locust 負荷テスト終了")
    print(f"   終了時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)


@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    """終了時のレポート"""
    if environment.stats.total.num_failures == 0:
        print("\n✅ すべてのテスト成功")
    else:
        print(f"\n⚠️  失敗: {environment.stats.total.num_failures}件")

    print("\n📊 テスト統計:")
    print(f"   総リクエスト: {environment.stats.total.num_requests}")
    print(f"   成功: {environment.stats.total.num_requests - environment.stats.total.num_failures}")
    print(f"   失敗: {environment.stats.total.num_failures}")
    print(f"   平均レスポンス時間: {environment.stats.total.avg_response_time:.0f}ms")
    print(f"   最大レスポンス時間: {environment.stats.total.max_response_time:.0f}ms")
    print(f"   平均スループット: {environment.stats.total.total_rps:.2f} req/s")
