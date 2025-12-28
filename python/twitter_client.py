"""
Twitter/X API Client
Twitter APIとの連携を行うクライアント
"""

import os
from typing import Optional
import tweepy
from dotenv import load_dotenv

# .envファイルから環境変数を読み込み
load_dotenv("config/.env")


class TwitterClient:
    """Twitter API v2クライアント"""

    def __init__(self):
        """環境変数から認証情報を読み込んで初期化"""
        self.api_key = os.getenv("TWITTER_API_KEY")
        self.api_secret = os.getenv("TWITTER_API_SECRET_KEY")
        self.access_token = os.getenv("TWITTER_ACCESS_TOKEN")
        self.access_token_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
        self.bearer_token = os.getenv("TWITTER_BEARER_TOKEN")

        self._validate_credentials()
        self._initialize_clients()

    def _validate_credentials(self):
        """認証情報の検証"""
        if not all(
            [
                self.api_key,
                self.api_secret,
                self.access_token,
                self.access_token_secret,
            ]
        ):
            raise ValueError(
                "Twitter API credentials are missing. "
                "Please check your config/.env file."
            )

    def _initialize_clients(self):
        """Tweepy clientsの初期化"""
        # OAuth 1.0a認証（読み書き可能）
        auth = tweepy.OAuth1UserHandler(
            self.api_key,
            self.api_secret,
            self.access_token,
            self.access_token_secret,
        )
        self.api_v1 = tweepy.API(auth)

        # API v2 client（推奨）
        self.client = tweepy.Client(
            bearer_token=self.bearer_token,
            consumer_key=self.api_key,
            consumer_secret=self.api_secret,
            access_token=self.access_token,
            access_token_secret=self.access_token_secret,
        )

    def post_tweet(self, text: str) -> Optional[dict]:
        """
        ツイートを投稿

        Args:
            text: ツイート本文（最大280文字）

        Returns:
            投稿されたツイートの情報
        """
        try:
            response = self.client.create_tweet(text=text)
            print(f"✅ Tweet posted successfully: {response.data}")
            return response.data
        except Exception as e:
            print(f"❌ Error posting tweet: {e}")
            return None

    def get_my_timeline(self, max_results: int = 10) -> list:
        """
        自分のタイムラインを取得

        Args:
            max_results: 取得するツイート数（最大100）

        Returns:
            ツイートのリスト
        """
        try:
            # 自分のユーザーIDを取得
            me = self.client.get_me()
            user_id = me.data.id

            # タイムラインを取得
            tweets = self.client.get_users_tweets(
                id=user_id, max_results=max_results, tweet_fields=["created_at", "text"]
            )

            if tweets.data:
                return tweets.data
            return []
        except Exception as e:
            print(f"❌ Error fetching timeline: {e}")
            return []

    def search_tweets(self, query: str, max_results: int = 10) -> list:
        """
        ツイートを検索

        Args:
            query: 検索クエリ
            max_results: 取得するツイート数（最大100）

        Returns:
            検索結果のツイートリスト
        """
        try:
            tweets = self.client.search_recent_tweets(
                query=query, max_results=max_results, tweet_fields=["created_at", "author_id"]
            )

            if tweets.data:
                return tweets.data
            return []
        except Exception as e:
            print(f"❌ Error searching tweets: {e}")
            return []

    def get_user_info(self, username: str) -> Optional[dict]:
        """
        ユーザー情報を取得

        Args:
            username: Twitterユーザー名（@なし）

        Returns:
            ユーザー情報
        """
        try:
            user = self.client.get_user(
                username=username, user_fields=["created_at", "description", "public_metrics"]
            )
            return user.data
        except Exception as e:
            print(f"❌ Error fetching user info: {e}")
            return None


# 使用例
if __name__ == "__main__":
    # クライアント初期化
    twitter = TwitterClient()

    # ツイート投稿のテスト
    # twitter.post_tweet("Hello from ElysiaAI! 🤖")

    # タイムライン取得のテスト
    print("\n📱 Fetching timeline...")
    timeline = twitter.get_my_timeline(max_results=5)
    for tweet in timeline:
        print(f"- {tweet.text[:50]}...")

    # ツイート検索のテスト
    print("\n🔍 Searching tweets...")
    results = twitter.search_tweets("Python", max_results=5)
    for tweet in results:
        print(f"- {tweet.text[:50]}...")
