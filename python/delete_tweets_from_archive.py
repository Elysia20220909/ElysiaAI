"""
Twitter Archive Bulk Delete Tool
Twitterアーカイブからツイートを一括削除するツール
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import List, Optional

import requests
from dotenv import load_dotenv
from requests_oauthlib import OAuth1

# .envファイルから環境変数を読み込み
load_dotenv("config/.env")


class TwitterArchiveDeleter:
    """Twitterアーカイブからツイートを削除するクラス"""

    def __init__(self):
        """環境変数から認証情報を読み込んで初期化"""
        self.api_key = os.getenv("TWITTER_API_KEY")
        self.api_secret = os.getenv("TWITTER_API_SECRET_KEY")
        self.access_token = os.getenv("TWITTER_ACCESS_TOKEN")
        self.access_token_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")

        self._validate_credentials()
        self._initialize_auth()

        # API制限設定
        self.delete_url = "https://api.twitter.com/1.1/statuses/destroy/"
        self.request_delay = 1.0  # リクエスト間隔（秒）

        # 統計情報
        self.deleted_count = 0
        self.failed_count = 0
        self.skipped_count = 0

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
                "❌ Twitter API credentials are missing.\n"
                "Please check your config/.env file and ensure all required fields are set:\n"
                "- TWITTER_API_KEY\n"
                "- TWITTER_API_SECRET_KEY\n"
                "- TWITTER_ACCESS_TOKEN\n"
                "- TWITTER_ACCESS_TOKEN_SECRET"
            )

    def _initialize_auth(self):
        """OAuth1認証の初期化"""
        self.auth = OAuth1(
            self.api_key,
            self.api_secret,
            self.access_token,
            self.access_token_secret,
        )

    def extract_tweet_ids_from_archive(self, archive_file_path: str) -> List[str]:
        """
        アーカイブファイルからツイートIDを抽出

        Args:
            archive_file_path: アーカイブファイルのパス (tweets.js または tweets-part0.js)

        Returns:
            ツイートIDのリスト

        Raises:
            FileNotFoundError: ファイルが見つからない場合
            json.JSONDecodeError: JSON解析エラー
        """
        archive_path = Path(archive_file_path)

        if not archive_path.exists():
            raise FileNotFoundError(f"❌ Archive file not found: {archive_file_path}")

        print(f"📂 Reading archive file: {archive_path.name}")

        try:
            with open(archive_path, "r", encoding="utf-8") as file:
                data = file.read()

                # JavaScriptの変数宣言を削除
                # 'window.YTD.tweets.part0 = ' または 'window.YTD.tweet.part0 = '
                data = data.replace("window.YTD.tweets.part0 = ", "")
                data = data.replace("window.YTD.tweet.part0 = ", "")

                tweets_data = json.loads(data)

                tweet_ids = []
                for item in tweets_data:
                    # アーカイブの構造によって異なる可能性があるため両方チェック
                    if "tweet" in item:
                        tweet_id = item["tweet"]["id_str"]
                    elif "id_str" in item:
                        tweet_id = item["id_str"]
                    else:
                        continue

                    tweet_ids.append(tweet_id)

                print(f"✅ Extracted {len(tweet_ids)} tweet IDs from archive")
                return tweet_ids

        except json.JSONDecodeError as e:
            raise json.JSONDecodeError(
                f"❌ Failed to parse JSON from archive file: {e.msg}",
                e.doc,
                e.pos,
            )

    def delete_tweet(self, tweet_id: str) -> bool:
        """
        単一のツイートを削除

        Args:
            tweet_id: 削除するツイートID

        Returns:
            削除成功時True、失敗時False
        """
        try:
            response = requests.post(
                f"{self.delete_url}{tweet_id}.json",
                auth=self.auth,
                timeout=10,
            )

            if response.status_code == 200:
                self.deleted_count += 1
                return True
            elif response.status_code == 404:
                print(f"⚠️  Tweet ID {tweet_id}: Already deleted or not found")
                self.skipped_count += 1
                return False
            elif response.status_code == 429:
                print(f"⏸️  Rate limit reached. Waiting 15 minutes...")
                time.sleep(900)  # 15分待機
                return self.delete_tweet(tweet_id)  # リトライ
            else:
                print(
                    f"❌ Failed to delete tweet ID {tweet_id}: "
                    f"Status {response.status_code} - {response.text}"
                )
                self.failed_count += 1
                return False

        except requests.exceptions.Timeout:
            print(f"⏱️  Timeout deleting tweet ID {tweet_id}. Retrying...")
            time.sleep(5)
            return self.delete_tweet(tweet_id)
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error deleting tweet ID {tweet_id}: {e}")
            self.failed_count += 1
            return False

    def delete_tweets_batch(
        self, tweet_ids: List[str], confirm: bool = True
    ) -> dict:
        """
        ツイートを一括削除

        Args:
            tweet_ids: 削除するツイートIDのリスト
            confirm: 実行前に確認を求めるかどうか

        Returns:
            削除結果の統計情報
        """
        total = len(tweet_ids)
        print(f"\n🗑️  Ready to delete {total} tweets")

        if confirm:
            response = input(
                f"\n⚠️  WARNING: This will permanently delete {total} tweets.\n"
                "Type 'yes' to continue, or anything else to cancel: "
            )
            if response.lower() != "yes":
                print("❌ Deletion cancelled by user")
                return {
                    "total": total,
                    "deleted": 0,
                    "failed": 0,
                    "skipped": 0,
                    "cancelled": True,
                }

        print("\n🚀 Starting deletion process...\n")

        for idx, tweet_id in enumerate(tweet_ids, 1):
            print(f"[{idx}/{total}] Deleting tweet ID: {tweet_id}...", end=" ")

            success = self.delete_tweet(tweet_id)

            if success:
                print("✅ Deleted")

            # レート制限を避けるため待機
            if idx < total:
                time.sleep(self.request_delay)

        print("\n" + "=" * 60)
        print("📊 Deletion Summary:")
        print(f"   Total tweets: {total}")
        print(f"   ✅ Successfully deleted: {self.deleted_count}")
        print(f"   ⚠️  Skipped (not found): {self.skipped_count}")
        print(f"   ❌ Failed: {self.failed_count}")
        print("=" * 60)

        return {
            "total": total,
            "deleted": self.deleted_count,
            "failed": self.failed_count,
            "skipped": self.skipped_count,
            "cancelled": False,
        }


def main():
    """メイン実行関数"""
    # コマンドライン引数のパース
    parser = argparse.ArgumentParser(
        description="Twitter Archive Bulk Delete Tool - Twitterアーカイブからツイートを一括削除"
    )
    parser.add_argument(
        "archive_file",
        nargs="?",
        default=None,
        help="Twitter archive file path (e.g., 'tweets.js' or 'tweets-sample.js')",
    )
    parser.add_argument(
        "--no-confirm",
        action="store_true",
        help="Skip confirmation prompt (use with caution)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Delay between requests in seconds (default: 1.0)",
    )

    args = parser.parse_args()

    print("=" * 60)
    print("Twitter Archive Bulk Delete Tool")
    print("=" * 60)
    print()

    # アーカイブファイルのパスを取得
    if args.archive_file:
        archive_file_path = args.archive_file
        print(f"📂 Using archive file: {archive_file_path}")
    else:
        # 対話的にパスを入力
        archive_file_path = input(
            "Enter the path to your Twitter archive file\n"
            "(e.g., 'tweets.js', 'tweets-sample.js' or 'data/tweets-part0.js')\n"
            "Press Enter for default 'tweets.js': "
        ).strip()

        if not archive_file_path:
            archive_file_path = "tweets.js"  # デフォルト
            print(f"Using default: {archive_file_path}")

    try:
        # Deleterインスタンス作成
        deleter = TwitterArchiveDeleter()

        # リクエスト間隔をカスタマイズ
        if args.delay != 1.0:
            deleter.request_delay = args.delay
            print(f"⏱️  Request delay set to {args.delay} seconds")

        # ツイートID抽出
        tweet_ids = deleter.extract_tweet_ids_from_archive(archive_file_path)

        if not tweet_ids:
            print("⚠️  No tweets found in the archive file")
            return

        # 一括削除実行
        confirm = not args.no_confirm
        result = deleter.delete_tweets_batch(tweet_ids, confirm=confirm)

        # 完了メッセージ
        if not result["cancelled"]:
            print("\n✅ Deletion process completed!")

    except FileNotFoundError as e:
        print(f"\n{e}")
        print("\nPlease ensure the archive file exists and the path is correct.")
    except ValueError as e:
        print(f"\n{e}")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        raise


if __name__ == "__main__":
    main()
