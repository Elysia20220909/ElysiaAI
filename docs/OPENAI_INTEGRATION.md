# OpenAI統合ガイド

## 概要

Elysia AIにOpenAI GPTモデルを統合しました。既存のOllamaベースのシステムに加えて、OpenAI APIを使用した高品質な応答が可能になります。

## 実装内容

### 1. OpenAI統合ライブラリ (`src/lib/openai-integration.ts`)

**主な機能:**

- **クライアント管理**: OpenAIクライアントの初期化と管理
- **チャット機能**: 非ストリーミング/ストリーミング両対応
- **簡易API**: シンプルなチャット関数
- **会話履歴管理**: 会話コンテキストの保持
- **ユーティリティ**: モデル一覧、トークン推定

**エクスポート関数:**

```typescript
// 初期化
initializeOpenAI(apiKey?: string): OpenAI
getOpenAIClient(): OpenAI

// チャット
chatWithOpenAI(messages, options): Promise<string>
streamChatWithOpenAI(messages, options): AsyncGenerator<string>

// 簡易関数
simpleChat(userMessage, systemPrompt?, options): Promise<string>
conversationChat(history, newUserMessage, options): Promise<{response, updatedHistory}>

// ユーティリティ
isOpenAIAvailable(): boolean
listAvailableModels(): Promise<string[]>
estimateTokens(text: string): number
```

### 2. 新しいモード: `openai`

**LLM設定** (`.internal/app/llm/llm-config.ts`):

```typescript
openai: {
  model: "gpt-4o-mini",
  temperature: 0.7,
  provider: "openai",
  systemPrompt: `You are "Elysia", a friendly AI assistant powered by OpenAI...`
}
```

**切り替えコマンド:**

- `/openai`
- `/gpt`

### 3. API統合 (`src/index.ts`)

**処理フロー:**

1. モードが `openai` の場合、OpenAI APIを使用
2. ストリーミングレスポンスを生成
3. SSE形式でクライアントに送信
4. 他のモードは従来通りOllamaを使用

**レスポンスヘッダー:**

```
X-Elysia-Mode: openai
X-Elysia-Provider: openai
```

## 環境設定

### 必須環境変数

`.env` ファイルに追加:

```env
OPENAI_API_KEY=sk-proj-your-api-key-here
OPENAI_MODEL=gpt-5.1-codex-max  # 既定モデル（GPT-5.1-Codex-Max Preview）
```

> **注意**: GPT-5.1-Codex-Max は Preview モデルです。OpenAI アカウントでアクセス権限を確認してください。

### 利用可能なモデル

- `gpt-5.1-codex-max`: **最新プレビューモデル** - コード生成・補完に最適化（推奨）
- `gpt-4o-mini`: 高速・コスト効率的
- `gpt-4o`: 最高品質
- `gpt-4-turbo`: バランス型
- `gpt-3.5-turbo`: 低コスト

## 使用方法

### 1. テスト実行

```bash
# 環境変数を設定
export OPENAI_API_KEY=sk-proj-...

# テスト実行
bun run test-openai.ts
```

**テスト内容:**

- APIキー確認
- クライアント初期化
- 簡単なチャット
- システムプロンプト付きチャット
- 会話履歴付きチャット
- トークン推定
- モデル一覧取得

### 2. API経由で使用

```bash
# OpenAIモードでチャット
curl -X POST http://localhost:3000/elysia-love \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "こんにちは"}
    ],
    "mode": "openai"
  }'
```

### 3. プログラムから直接使用

```typescript
import { simpleChat, conversationChat } from "./src/lib/openai-integration";

// シンプルなチャット
const response = await simpleChat("今日の天気は?", "あなたは親切なAIアシスタントです。", { model: "gpt-4o-mini", temperature: 0.7 });

// 会話履歴付き
let history = [{ role: "system", content: "あなたは日本語で話すAIです。" }];

const turn1 = await conversationChat(history, "私の名前はタロウです。");
console.log(turn1.response);
history = turn1.updatedHistory;

const turn2 = await conversationChat(history, "私の名前は何でしたか?");
console.log(turn2.response); // "タロウ"と覚えている
```

## モード比較

| モード       | プロバイダー | モデル          | 特徴                   |
| ------------ | ------------ | --------------- | ---------------------- |
| sweet        | Ollama       | llama3.2        | 公式Elysiaキャラクター |
| normal       | Ollama       | llama3.2        | フレンドリー           |
| professional | Ollama       | llama3.2        | フォーマル             |
| casual       | Ollama       | llama3.2        | タメ口、Web検索対応    |
| creative     | Ollama       | llama3.2        | 創造的                 |
| technical    | Ollama       | llama3.2        | 技術的                 |
| **openai**   | **OpenAI**   | **gpt-4o-mini** | **高品質、広範な知識** |

## コスト管理

### トークン推定

```typescript
import { estimateTokens } from "./src/lib/openai-integration";

const text = "こんにちは、今日はいい天気ですね。";
const tokens = estimateTokens(text); // 約30トークン
```

### 料金目安

**gpt-4o-mini:**
- 入力: $0.15 / 1M トークン
- 出力: $0.60 / 1M トークン

**gpt-5.1-codex-max (Preview):**
- 料金は OpenAI の最新ドキュメントを確認してください
- コード生成・補完で高いコストパフォーマンスを発揮

**例 (gpt-4o-mini):**
- 100文字の質問 → 約150トークン → $0.0000225
- 300文字の応答 → 約450トークン → $0.000270
- **合計:** $0.0002925 (約0.03円)

## エラーハンドリング

### APIキー未設定

```typescript
if (!isOpenAIAvailable()) {
  console.log("OPENAI_API_KEY が設定されていません");
}
```

### API呼び出しエラー

```typescript
try {
  const response = await simpleChat("こんにちは");
} catch (error) {
  console.error("OpenAI API エラー:", error);
  // フォールバック: Ollamaモードに切り替え
}
```

## セキュリティ

- API キーは環境変数で管理
- `.env` ファイルは `.gitignore` に含める
- プロダクション環境では secrets management を使用推奨

## 次のステップ

1. **環境変数設定**: `OPENAI_API_KEY` を `.env` に追加
2. **テスト実行**: `bun run test-openai.ts`
3. **サーバー起動**: `bun run dev`
4. **OpenAIモード使用**: `mode: "openai"` でAPIコール

## トラブルシューティング

### エラー: "OpenAI API キーが設定されていません"

```bash
# .env ファイルを確認
cat .env | grep OPENAI_API_KEY

# 設定されていない場合
echo "OPENAI_API_KEY=sk-proj-your-key-here" >> .env
```

### エラー: "OpenAI API error"

- APIキーが正しいか確認
- レート制限を確認
- OpenAIのステータスページを確認

これでElysiaAIは Ollama と OpenAI の両方をサポートし、用途に応じて使い分けられるようになりました！
