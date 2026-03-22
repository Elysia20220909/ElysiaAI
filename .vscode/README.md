# VS Code デバッグガイド

## 🎯 デバッグ設定

### サーバーのデバッグ

1. **Elysiaサーバー (Bun)**
   - `F5` または `Debug: 🚀 Debug Elysia Server (Bun)` を選択
   - `src/index.ts` を実行
   - ブレークポイントを設定可能

2. **Python FastAPI**
   - `Debug: 🐍 Debug Python FastAPI` を選択
   - `python/fastapi_server.py` を実行
   - Python デバッガーでブレークポイント使用可能

3. **フルスタック**
   - `Debug: 🎯 Debug Full Stack` を選択
   - Elysia + FastAPI を同時起動

### テストのデバッグ

1. **現在のテストファイル**
   - テストファイルを開く
   - `F5` または `Debug: 🧪 Debug Tests` を選択
   - 開いているテストファイルのみ実行

2. **全テスト**
   - `Debug: 🧪 Debug All Tests` を選択
   - すべてのテストスイートを実行

3. **特定のテスト**
   - `tests/server.test.ts` - サーバーテスト
   - `tests/integration.test.ts` - 統合テスト
   - `tests/docker.test.ts` - Dockerテスト

### ビルドのデバッグ

- `Debug: 🔨 Debug Build` を選択
- Webpackビルドプロセスをデバッグ

### Dockerのデバッグ

- `Debug: 🐳 Debug Docker Container` を選択
- コンテナ内でアプリをデバッグ

## ⚙️ タスク

VS Codeコマンドパレット (`Ctrl+Shift+P`) から `Tasks: Run Task` を選択:

### 開発タスク

- `🚀 Dev Server` - 開発サーバー起動 (ホットリロード)
- `🔨 Build` - 本番ビルド
- `🧪 Run Tests` - テスト実行
- `🧪 Run Tests (Watch)` - テスト監視モード

### コード品質

- `🎨 Format Code` - コードフォーマット
- `🔍 Lint Code` - Lintチェック
- `🔧 Fix Issues` - 自動修正

### Docker

- `🐳 Docker Build` - イメージビルド
- `🐳 Docker Compose Up` - コンテナ起動
- `🐳 Docker Compose Down` - コンテナ停止
- `🐳 Docker Logs` - ログ表示

### その他

- `🐍 Python FastAPI Server` - FastAPI起動
- `📦 Install Dependencies` - 依存関係インストール
- `🧹 Clean Build` - クリーンビルド

## 🔥 ブレークポイント

### TypeScript/JavaScript

```typescript
// ブレークポイントを設定したい行をクリック
const response = await streamText({
  model: ollama(MODEL), // ← ここにブレークポイント
  messages: enhancedMessages,
});
```

### Python

```python
# ブレークポイントを設定
@app.post("/rag")
async def rag_endpoint(query: Query):  # ← ここにブレークポイント
    results = search_similar(query.text)
    return RAGResponse(context=context, quotes=quotes)
```

## 🎨 推奨設定

### 保存時の自動処理

- フォーマット自動適用
- Importの自動整理
- Biome Lintの実行

### エディタ

- タブサイズ: スペース (プロジェクト設定に従う)
- 末尾の空白削除
- 改行コード: LF

## 📦 推奨拡張機能

必須:

- **Biome** - Linter & Formatter
- **Bun for Visual Studio Code** - Bun サポート

開発体験向上:

- **Python** - Python 開発
- **Pylance** - Python 型チェック
- **Docker** - Docker サポート
- **GitLens** - Git 強化

## 🚀 クイックスタート

1. **初回セットアップ**

   ```bash
   bun install
   ```

2. **開発開始**
   - `F5` でサーバー起動
   - または `Ctrl+Shift+P` → `Tasks: Run Task` → `🚀 Dev Server`

3. **テスト実行**
   - `Ctrl+Shift+P` → `Tasks: Run Task` → `🧪 Run Tests`

4. **デバッグ**
   - ブレークポイントを設定
   - `F5` でデバッグ開始
   - `F10` でステップオーバー
   - `F11` でステップイン

## 🔧 トラブルシューティング

### デバッガーが起動しない

1. Bunがインストールされているか確認: `bun --version`

2. 依存関係をインストール: `bun install`

### テストが失敗する

1. サーバーを起動: `bun run dev`

2. テストを実行: `bun test`

### Pythonデバッガーが動かない

1. Python拡張機能がインストールされているか確認

2. Pythonパスを確認: `.vscode/settings.json`

### ホットリロードが効かない

1. `--watch` フラグが有効か確認

2. ファイルが保存されているか確認

## 📚 関連ドキュメント

- [Bun Debugging](https://bun.sh/docs/runtime/debugger)
- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Python Debugging](https://code.visualstudio.com/docs/python/debugging)
