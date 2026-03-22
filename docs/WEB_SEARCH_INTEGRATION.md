# インターネット接続機能の追加

## 実装内容

### 1. Web検索ライブラリ (`src/lib/web-search.ts`)

インターネットから情報を取得する包括的な検索機能を実装しました。

**機能:**

- **Wikipedia検索**: 日本語Wikipediaから概要を取得
- **天気情報**: Open-Meteo API経由で日本の主要10都市の天気を取得
- **ニュース**: NHKニュースのRSSフィードから最新ニュースを取得
- **Web検索**: DuckDuckGo APIで一般的な検索
- **統合検索**: 質問内容に応じて適切な検索を自動選択

**対応都市 (天気):**
東京、大阪、名古屋、札幌、福岡、京都、神戸、横浜、仙台、広島

**ニュースカテゴリ:**

- general: 一般ニュース
- technology: 技術ニュース
- sports: スポーツニュース
- culture: 文化ニュース

### 2. カジュアルチャット連携 (`src/lib/casual-chat.ts`)

日常会話機能にWeb検索を統合しました。

**変更点:**

- `generateCasualResponse()` を async 関数に変更
- `needsWebSearch()` で検索が必要か自動判定
- 検索結果を会話形式で返す `formatSearchResultForChat()`

**検索トリガーキーワード:**

- 天気、気温、ニュース、最新、今日、現在
- what is, who is, when, where
- について、とは、って何、教えて

### 3. API統合 (`src/index.ts`)

**カジュアルモードでの自動検索:**

```typescript
// カジュアルモードの場合、Web検索を試行
if (mode === "casual" && body.messages.length > 0) {
  const lastUserMessage = body.messages[body.messages.length - 1];
  if (lastUserMessage.role === "user") {
    const casualResponse = await casualChat.generateCasualResponse(lastUserMessage.content);
    if (casualResponse) {
      enhancedSystemPrompt += `\n\n参考情報: ${casualResponse}`;
    }
  }
}
```

**新しいAPIエンドポイント:**

```
GET /api/search?q=検索クエリ
```

### 4. テストファイル (`test-web-search.ts`)

全ての検索機能をテストするスクリプトを作成しました。

**テスト内容:**

1. Wikipedia検索 (人工知能)
2. 天気情報 (東京)
3. 最新ニュース
4. Web検索 (TypeScript)
5. 統合検索 (今日の天気)

## 使用方法

### カジュアルモードで使用

```bash
curl -X POST http://localhost:3000/elysia-love \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "今日の東京の天気は?"}
    ],
    "mode": "casual"
  }'
```

### 直接検索API使用

```bash
curl "http://localhost:3000/api/search?q=今日の天気"
```

### テスト実行

```bash
bun run test-web-search.ts
```

## 会話例

**質問**: 「今日の東京の天気どう?」
**応答**: 「ちょっと調べてみたよ！

東京の天気: 晴れ、気温15℃、湿度60%、風速3m/s

これで合ってるかな？他に知りたいことある?」

**質問**: 「最新のニュース教えて」
**応答**: 「ちょっと調べてみたよ！

最新ニュース:
・○○○○のニュース
・△△△△の話題
・□□□□について

これで合ってるかな？他に知りたいことある?」

**質問**: 「人工知能って何?」
**応答**: 「ちょっと調べてみたよ！

人工知能について:
人工知能とは、コンピュータを使って、学習・推論・判断など人間の知能のはたらきを人工的に実現したものである。...

詳細: https://ja.wikipedia.org/wiki/人工知能

これで合ってるかな?他に知りたいことある?」

## 技術仕様

### 外部API

- **Wikipedia API**: https://ja.wikipedia.org/w/api.php
- **Open-Meteo API**: https://api.open-meteo.com (無料、登録不要)
- **NHKニュースRSS**: https://www.nhk.or.jp/rss/
- **DuckDuckGo API**: https://api.duckduckgo.com

### タイムアウト設定

全ての外部API呼び出しに10秒のタイムアウトを設定しています。

### エラーハンドリング

- ネットワークエラー: コンソールログに記録し、null/空配列を返す
- タイムアウト: 自動的にフォールバック
- API利用不可: 他の検索方法を試行

## 次のステップ

1. **テスト実行**: `bun run test-web-search.ts`
2. **サーバー再起動**: `bun run dev`
3. **動作確認**: カジュアルモードで天気やニュースを質問

これで日常会話がリアルタイム情報に対応し、より実用的になりました！
