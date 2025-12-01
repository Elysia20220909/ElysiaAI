# Visual Studio デバッグガイド

## 🎯 Visual Studio 2022 デバッグ設定

### セットアップ

1. **Visual Studioで開く**
   - `File` → `Open` → `Folder...`
   - `elysia-ai` フォルダを選択

2. **必要なワークロード**
   - Node.js development
   - Python development
   - Docker support (オプション)

### デバッグ設定

`.vs/launch.vs.json` に以下の設定が含まれています:

#### 🚀 Launch Elysia Server
- Bunでメインサーバーを起動
- ホットリロード有効
- ブレークポイント対応

#### 🧪 Debug Current Test File
- 現在開いているテストファイルを実行
- 個別テストのデバッグに最適

#### 🧪 Debug All Tests
- すべてのテストスイートを実行
- 統合テストに最適

#### 🔨 Debug Build Process
- Webpackビルドプロセスをデバッグ
- ビルドエラーの特定に便利

#### 🐍 Launch FastAPI Server
- Python RAGサーバーを起動
- Pythonデバッガーでブレークポイント使用可能

#### 🔌 Attach to Running Server
- 実行中のプロセスにアタッチ
- ポート9229でデバッグ接続

#### 🎯 Full Stack Debug (Compound)
- Elysia + FastAPI を同時起動
- フルスタックデバッグ

## 🚀 使い方

### デバッグの開始

1. **メニューから**:
   - `Debug` → `Start Debugging` (F5)
   - 設定を選択

2. **ツールバーから**:
   - デバッグターゲットドロップダウンから選択
   - 緑の再生ボタンをクリック

### ブレークポイント

1. **設定**:
   - コード行の左端をクリック
   - または `F9` キーで切り替え

2. **条件付きブレークポイント**:
   - 右クリック → `Conditions...`
   - 式や実行回数を設定

3. **ログポイント**:
   - 右クリック → `Actions...`
   - コンソールに出力するメッセージを設定

### デバッグコントロール

- `F5` - 続行
- `F10` - ステップオーバー
- `F11` - ステップイン
- `Shift+F11` - ステップアウト
- `Ctrl+Shift+F5` - 再起動
- `Shift+F5` - 停止

## 📋 タスク

`.vs/tasks.vs.json` で定義されたタスク:

### 実行方法

1. **Solution Explorer**:
   - プロジェクトを右クリック
   - タスク名を選択

2. **Task Runner Explorer**:
   - `View` → `Other Windows` → `Task Runner Explorer`

### 利用可能なタスク

**開発:**
- 🚀 Start Dev Server - 開発サーバー起動
- 🔨 Build Project - 本番ビルド

**テスト:**
- 🧪 Run Tests - テスト実行

**コード品質:**
- 🎨 Format Code - コードフォーマット
- 🔍 Lint Code - Lint実行
- 🔧 Fix Issues - 自動修正

**Docker:**
- 🐳 Docker Build - イメージビルド
- 🐳 Docker Compose Up - コンテナ起動
- 🐳 Docker Compose Down - コンテナ停止

**Python:**
- 🐍 Start FastAPI - FastAPIサーバー起動

**メンテナンス:**
- 📦 Install Dependencies - 依存関係インストール
- 🧹 Clean Build - クリーンビルド

## 🔧 デバッグのヒント

### TypeScript/JavaScript

```typescript
// src/index.ts
app.post("/elysia-love", async ({ body }) => {
    debugger; // ← ブレークポイント代わり
    const { messages } = body as ChatRequest;
    // ...
});
```

### Python

```python
# python/fastapi_server.py
@app.post("/rag")
async def rag_endpoint(query: Query):
    import pdb; pdb.set_trace()  # ← Pythonデバッガー
    results = search_similar(query.text)
    return RAGResponse(context=context, quotes=quotes)
```

## 🎨 設定のカスタマイズ

### launch.vs.json の編集

```json
{
  "type": "node",
  "request": "launch",
  "name": "Custom Debug Config",
  "program": "${workspaceFolder}/your-script.ts",
  "runtimeExecutable": "bun",
  "env": {
    "CUSTOM_VAR": "value"
  }
}
```

### tasks.vs.json の編集

```json
{
  "taskLabel": "Custom Task",
  "type": "launch",
  "command": "your-command",
  "args": ["arg1", "arg2"],
  "workingDirectory": "${workspaceRoot}"
}
```

## 🐛 トラブルシューティング

### デバッガーが接続できない

1. Bunがインストールされているか確認:
   ```powershell
   bun --version
   ```

2. ポート競合を確認:
   ```powershell
   netstat -ano | findstr :3000
   ```

### ブレークポイントが無視される

1. ソースマップが有効か確認:
   - `tsconfig.json` の `sourceMap: true`

2. コンパイル後のコードを確認:
   - `dist/` フォルダをチェック

### Pythonデバッガーが動かない

1. Python拡張機能がインストールされているか確認
2. Pythonパスを確認:
   ```powershell
   python --version
   ```

## 📚 参考リンク

- [Visual Studio Node.js Debugging](https://docs.microsoft.com/visualstudio/javascript/debug-nodejs)
- [Visual Studio Python Debugging](https://docs.microsoft.com/visualstudio/python/debugging-python-in-visual-studio)
- [Bun Debugging Guide](https://bun.sh/docs/runtime/debugger)

## 🎯 クイックスタート

1. **プロジェクトを開く**
   ```
   File → Open → Folder → elysia-ai
   ```

2. **デバッグ設定を選択**
   ```
   Debug Target: 🚀 Launch Elysia Server
   ```

3. **デバッグ開始**
   ```
   F5 または Debug → Start Debugging
   ```

4. **ブレークポイント設定**
   ```
   コード行の左端をクリック
   ```

5. **デバッグ実行**
   ```
   F10 (Step Over) / F11 (Step Into)
   ```

Visual Studioでの快適な開発をお楽しみください！🎉
