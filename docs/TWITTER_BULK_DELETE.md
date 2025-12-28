# Twitter Archive Bulk Delete Tool

Twitterアーカイブからツイートを一括削除するツール

## 📋 前提条件

1. **Twitter APIアクセス権限**
   - Twitter Developer Portalでアプリを作成
   - Read and Write権限が必要

2. **Twitterアーカイブのダウンロード**
   - Twitter設定 → アカウント → データのアーカイブをダウンロード
   - `tweets.js`または`tweets-part0.js`ファイルを使用

3. **環境変数の設定**
   - `config/.env`に認証情報を設定

## 🚀 使用方法

### 0. クイックセットアップ（推奨）

自動セットアップスクリプトを使用：

#### Windows (PowerShell)

```powershell
.\scripts\setup_twitter_tool.ps1
```

#### Windows (コマンドプロンプト)

```cmd
scripts\setup_twitter_tool.bat
```

#### Linux / macOS

```bash
chmod +x scripts/setup_twitter_tool.sh
./scripts/setup_twitter_tool.sh
```

これらのスクリプトは以下を自動実行します：

- 仮想環境の作成
- 依存関係のインストール
- 設定ファイルの確認

### 0-1. 手動セットアップ（仮想環境）

#### Windows - PowerShell

```powershell
# 仮想環境を作成
python -m venv venv

# 仮想環境をアクティベート
.\venv\Scripts\Activate.ps1

# 依存関係をインストール
pip install -r python\requirements.txt
```

#### 手動セットアップ - コマンドプロンプト

```cmd
# 仮想環境を作成
python -m venv venv

# 仮想環境をアクティベート
venv\Scripts\activate.bat

# 依存関係をインストール
pip install -r python\requirements.txt
```

#### 手動セットアップ - Linux/macOS

```bash
# 仮想環境を作成
python -m venv venv

# 仮想環境をアクティベート
source venv/bin/activate

# 依存関係をインストール
pip install -r python/requirements.txt
```

### 1. 依存関係のインストール

仮想環境を使用しない場合：

```powershell
pip install requests requests-oauthlib python-dotenv
```

または

```powershell
pip install -r python/requirements.txt
```

### 2. 環境変数の設定

`config/.env`ファイルに以下を追加：

```dotenv
TWITTER_API_KEY=your-api-key-here
TWITTER_API_SECRET_KEY=your-api-secret-here
TWITTER_ACCESS_TOKEN=your-access-token-here
TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret-here
```

### 3. アーカイブファイルの準備

1. Twitterからアーカイブをダウンロード
2. `tweets.js`または`data/tweets-part0.js`をプロジェクトルートに配置

### 4. スクリプトの実行

#### 方法1: コマンドライン引数で指定（推奨）

```powershell
# アーカイブファイルを直接指定
python python/delete_tweets_from_archive.py tweets.js

# または別のファイル名
python python/delete_tweets_from_archive.py tweets-sample.js

# サブディレクトリ内のファイル
python python/delete_tweets_from_archive.py data/tweets-part0.js
```

#### 方法2: 対話的に入力

```powershell
# ファイル名なしで実行すると、対話的に入力を求められる
python python/delete_tweets_from_archive.py
```

実行後、プロンプトでファイル名を入力：

```text
Enter the path to your Twitter archive file
(e.g., 'tweets.js', 'tweets-sample.js' or 'data/tweets-part0.js')
Press Enter for default 'tweets.js': tweets-sample.js
```

#### オプション引数

```powershell
# 確認プロンプトをスキップ（注意！）
python python/delete_tweets_from_archive.py tweets.js --no-confirm

# リクエスト間隔を変更（デフォルト: 1.0秒）
python python/delete_tweets_from_archive.py tweets.js --delay 2.0

# ヘルプを表示
python python/delete_tweets_from_archive.py --help
```

### 5. 確認と実行

削除対象のツイート数が表示されます。続行するには`yes`と入力：

```text
⚠️  WARNING: This will permanently delete 1234 tweets.
Type 'yes' to continue, or anything else to cancel: yes
```

## ⚙️ 機能

### ✨ 主な機能

- ✅ **環境変数から認証情報を読み込み**
- ✅ **レート制限の自動処理**（429エラー時に15分待機）
- ✅ **エラーハンドリング**（タイムアウト、ネットワークエラー）
- ✅ **進捗表示**（削除状況をリアルタイム表示）
- ✅ **統計情報**（成功/失敗/スキップ数）
- ✅ **確認プロンプト**（誤削除を防止）

### 📊 出力例

```text
[1/100] Deleting tweet ID: 1234567890123456789... ✅ Deleted
[2/100] Deleting tweet ID: 9876543210987654321... ⚠️  Already deleted or not found
[3/100] Deleting tweet ID: 1111111111111111111... ✅ Deleted
...

============================================================
📊 Deletion Summary:
   Total tweets: 100
   ✅ Successfully deleted: 95
   ⚠️  Skipped (not found): 3
   ❌ Failed: 2
============================================================
```

## ⚠️ 注意事項

### セキュリティ

- ❗ **削除は取り消せません** - 必ずアーカイブのバックアップを保持
- 🔒 **認証情報を安全に管理** - `.env`ファイルはGit管理外
- 🚫 **認証情報を共有しない** - チャットやメールで送信しない

### レート制限

- Twitter APIは**15分間に50リクエスト**まで
- スクリプトは自動的にレート制限を処理します
- 大量のツイートを削除する場合は時間がかかります

### エラー処理

| エラーコード | 意味 | 対処 |
| ---------- | ---- | ---- |
| 200 | 成功 | - |
| 404 | ツイートが見つからない | 既に削除済み（スキップ） |
| 429 | レート制限 | 15分待機後リトライ |
| その他 | ネットワークエラー等 | 再実行を推奨 |

## 🛠️ カスタマイズ

### コマンドライン引数の活用

```powershell
# 基本的な使い方
python python/delete_tweets_from_archive.py tweets-sample.js

# 確認なしで実行（自動化用）
python python/delete_tweets_from_archive.py tweets.js --no-confirm

# レート制限を考慮してリクエスト間隔を2秒に
python python/delete_tweets_from_archive.py tweets.js --delay 2.0

# 組み合わせ
python python/delete_tweets_from_archive.py data/tweets-part0.js --delay 1.5 --no-confirm
```

### リクエスト間隔の調整

デフォルトは1秒ですが、より安全にしたい場合：

```powershell
# 2秒間隔（推奨：大量削除時）
python python/delete_tweets_from_archive.py tweets.js --delay 2.0

# 0.5秒間隔（注意：レート制限に注意）
python python/delete_tweets_from_archive.py tweets.js --delay 0.5
```

### 確認プロンプトのスキップ

プログラム的に使用する場合：

#### 方法1: コマンドライン引数（推奨）

```powershell
python python/delete_tweets_from_archive.py tweets.js --no-confirm
```

#### 方法2: Pythonコードから直接呼び出し

```python
from python.delete_tweets_from_archive import TwitterArchiveDeleter

deleter = TwitterArchiveDeleter()
deleter.request_delay = 2.0  # オプション：間隔を調整
tweet_ids = deleter.extract_tweet_ids_from_archive("tweets.js")
result = deleter.delete_tweets_batch(tweet_ids, confirm=False)
```

## 📖 使用例

### 例1: 標準的な使用

```powershell
python python/delete_tweets_from_archive.py tweets-sample.js
```

### 例2: 自動化スクリプト

```powershell
# バッチファイルやスクリプトで使用
python python/delete_tweets_from_archive.py data/old-tweets.js --no-confirm --delay 2.0
```

### 例3: 複数のアーカイブを処理

```powershell
# PowerShellスクリプト例
$archives = @("tweets-2020.js", "tweets-2021.js", "tweets-2022.js")
foreach ($archive in $archives) {
    Write-Host "Processing $archive..."
    python python/delete_tweets_from_archive.py $archive --delay 2.0
}
```

## 📚 関連ドキュメント・リソース

### 公式ドキュメント

- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [Rate Limits](https://developer.twitter.com/en/docs/twitter-api/rate-limits)
- [OAuth 1.0a Authentication](https://developer.twitter.com/en/docs/authentication/oauth-1-0a)

### 類似ツール・参考実装

- [shomtsm/twitter-delete-all-my-tweet](https://github.com/shomtsm/twitter-delete-all-my-tweet) - Pythonベースのツイート一括削除ツール
- このツールはそちらの実装を参考に、環境変数対応やエラーハンドリングを強化したものです

## 🐛 トラブルシューティング

### 認証エラー

```text
❌ Twitter API credentials are missing.
```

**解決方法**: `config/.env`ファイルに全ての認証情報が設定されているか確認

### ファイルが見つからない

```text
❌ Archive file not found: tweets.js
```

**解決方法**: アーカイブファイルのパスを正しく指定、またはファイルをプロジェクトルートに配置

### レート制限エラーが頻発

**解決方法**: `request_delay`の値を増やして間隔を広げる

## ⚖️ 免責事項

このツールは教育およびアーカイブ管理目的で提供されています。使用は自己責任で行ってください。ツイートの削除は取り消せません。
