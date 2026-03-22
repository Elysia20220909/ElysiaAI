# 日常会話モード - 実装ガイド

## ✅ 新機能：カジュアルな日常会話

Elysia AIに友達と話すような気軽な雑談機能を追加しました！

### 🎯 主な特徴

#### 1. **日常会話モード (Casual Mode)**

- タメ口で気軽に話せる
- 感情豊かな反応（驚き、共感、笑い）
- 自然な会話の流れ
- 雑談に最適

#### 2. **6種類のチャットモード**

| モード       | アイコン | Temperature | 説明                           |
| ------------ | -------- | ----------- | ------------------------------ |
| **Casual**   | 😊       | 0.85        | 友達みたいな気軽な会話         |
| Sweet        | 💕       | 0.8         | 甘々で可愛いエリシアちゃん     |
| Normal       | 💬       | 0.7         | バランスの取れた会話           |
| Professional | 💼       | 0.5         | ビジネス向けの丁寧な対応       |
| Creative     | 🎨       | 0.9         | 創造的でユニークな回答         |
| Technical    | 🔧       | 0.3         | 技術的な詳細を含む専門的な回答 |

### 📖 使い方

#### API経由

```bash
# カジュアルモードでチャット
curl -X POST http://localhost:3000/elysia-love \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "今日めっちゃ疲れた〜"}
    ],
    "mode": "casual"
  }'
```

#### レスポンス例

```
お疲れ様...大変だったね。何かあった？
よかったら聞くよー
```

### 💬 会話パターン

#### 挨拶

```
ユーザー: おはよう！
エリシア: おはよー！今日もいい天気だね！何か面白いことあった？

ユーザー: こんにちは
エリシア: やっほー！久しぶり！元気してた？
```

#### 感情表現

```
ユーザー: 嬉しいことがあった！
エリシア: おお！それは良かったね！！私も嬉しいよ！

ユーザー: つらいことがあって...
エリシア: 大丈夫？何かあった？よかったら聞くよ
```

#### 日常の話題

```
ユーザー: 今日ランチ何食べた？
エリシア: 食べ物の話！？好き！何食べたの？

ユーザー: 最近ゲームにハマってて
エリシア: おお！趣味の話！好き！何にハマってるの？
```

### 🎨 会話パターン一覧

#### 実装済みパターン

1. **挨拶** (greeting)
   - 朝の挨拶、一般的な挨拶、夜の挨拶

2. **感情** (emotion)
   - 嬉しい、悲しい、驚き

3. **日常** (daily)
   - 食べ物、天気、仕事、趣味

4. **共感** (empathy)
   - 同意、質問

5. **別れの挨拶** (farewell)
   - さよなら、またね

### 🛠️ 技術詳細

#### 新規ファイル

**`src/lib/casual-chat.ts`**

- 会話パターン検出
- 感情分析
- 話題提案
- コンテキスト管理

**機能:**

```typescript
// パターン検出
detectConversationPattern(input: string): ConversationPattern | null

// ランダム応答
getRandomResponse(pattern: ConversationPattern): string

// カジュアル応答生成
generateCasualResponse(input: string): string | null

// 感情分析
analyzeEmotion(text: string): EmotionAnalysis

// 話題提案
getRandomTopic(): TopicSuggestion
```

#### 更新ファイル

**`src/lib/customization.ts`**

- カジュアルモード追加
- 日常会話用プロンプトテンプレート追加（3種類）

**`.internal/app/llm/llm-config.ts`**

- ElysiaMode型を拡張（casual, creative, technical追加）
- Casualモード用システムプロンプト追加
- 各モードのコマンド追加

**`src/index.ts`**

- ChatRequest型を拡張
- モードバリデーションを更新
- API説明を更新

### 📊 会話スタイル比較

| 要素     | Sweet            | Normal             | Casual             |
| -------- | ---------------- | ------------------ | ------------------ |
| 語尾     | にゃん♡、だよ〜♪ | です、ます         | だよ、だね、〜     |
| 感情表現 | 甘々、可愛い     | 丁寧、親しみやすい | 率直、共感的       |
| 絵文字   | ♡♪✨             | 適度に使用         | ！？〜             |
| 敬語     | なし             | 丁寧語             | なし（タメ口）     |
| 適用場面 | 癒し、萌え       | 一般的な質問       | 雑談、友達との会話 |

### 🎯 使用例

#### ストレス発散の相談

```javascript
{
  "messages": [
    {"role": "user", "content": "今日仕事でミスしちゃって落ち込んでる..."}
  ],
  "mode": "casual"
}

// Response:
// "つらいよね...でも誰にでもミスはあるよ。
//  明日また頑張ればいいじゃん！
//  今日はゆっくり休んでね"
```

#### 趣味の話

```javascript
{
  "messages": [
    {"role": "user", "content": "最近アニメにハマってるんだよね"}
  ],
  "mode": "casual"
}

// Response:
// "おお！アニメの話！好き！何見てるの？
//  私も興味ある！詳しく教えて！"
```

#### 日常の雑談

```javascript
{
  "messages": [
    {"role": "user", "content": "今日めっちゃいい天気だった！"}
  ],
  "mode": "casual"
}

// Response:
// "いいね！！天気いいと気分上がるよね！
//  外出した？何かした？"
```

### 🔄 モード切り替え

#### APIエンドポイント

```bash
# モード一覧取得
GET /customization/modes

# レスポンス
[
  {
    "id": "casual",
    "name": "日常会話モード",
    "description": "友達と話すような気軽な雑談",
    "icon": "😊",
    "temperature": 0.85,
    "maxTokens": 2000
  },
  ...
]
```

#### コマンドでモード切り替え

```
/casual - 日常会話モードに切り替え
/chat - 日常会話モードに切り替え
/sweet - 甘々モードに切り替え
/normal - 通常モードに切り替え
/professional - プロフェッショナルモードに切り替え
/creative - クリエイティブモードに切り替え
/technical - テクニカルモードに切り替え
```

### 💡 今後の拡張予定

1. **会話履歴の分析**
   - よく話す話題の追跡
   - 感情の変化の記録
   - パーソナライズされた応答

2. **より多くの会話パターン**
   - 恋愛相談
   - 悩み相談
   - ジョークと笑い
   - 励ましと応援

3. **コンテキスト理解の向上**
   - 前の会話を覚えておく
   - 話題の自然な展開
   - より人間らしい反応

### 🧪 テスト

```bash
# カジュアルモードをテスト
curl -X POST http://localhost:3000/elysia-love \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "今日めっちゃ楽しいことあった！"}
    ],
    "mode": "casual"
  }'

# モード一覧を確認
curl http://localhost:3000/customization/modes
```

### 📝 設定

#### デフォルトモードの変更

```typescript
// ユーザー設定で変更可能
const userSettings = {
  defaultMode: "casual", // カジュアルモードをデフォルトに
  ...
};
```

### 🎉 まとめ

日常会話モードにより、Elysia AIがより人間らしく、親しみやすいアシスタントになりました！

- ✅ 6種類のモード（casual追加）
- ✅ 感情豊かな応答
- ✅ 自然な会話パターン
- ✅ 雑談に最適
- ✅ APIで簡単に切り替え

友達と話すように気軽にチャットを楽しんでください！

---

**実装日**: 2025年12月5日
**バージョン**: v2.1.0
**新機能**: カジュアル日常会話モード
