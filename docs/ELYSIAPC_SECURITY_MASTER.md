# 🌸 ElysiaAI: The Sovereign Security Master Textbook 🛡️
## ~ Every Textbook of ElysiaAI: Security Guide ~

> 「真に美しいものは、その根底に揺るぎない規律を秘めている」
> — ElysiaAI Grand Design Philosophy

This master guide serves as the definitive documentation for ElysiaAI's multi-layered security architecture. It represents the transition from an experimental codebase to a battle-ready, sovereign intelligence ecosystem.

---

## ⚡ Security Quick Start (共鳴の第一歩)

この「教科書」を読み解く前に、まずは手元でElysiaAIの守護能力を体感するための最短手順です。

### Step 0: 前提条件（Prerequisites）
ElysiaAIのソブリン・スタックを稼働させるには、以下の環境が必要です。
- **Bun**: v1.1.0以上
- **Docker & Docker Compose**: コンテナ・オーケストレーション用
- **OpenSSL**: 鍵生成用（推奨）

### Step 1: 聖鍵（Secrets）の生成と配置
`.env.example` をコピーし、セキュリティの中核となる秘密鍵を設定します。

```bash
cp .env.example .env
```
> [!IMPORTANT]
> `JWT_SECRET` と `JWT_REFRESH_SECRET` は、必ず以下のコマンド等で生成した独自の強固な文字列に置き換えてください。
> ```bash
> openssl rand -hex 32
> ```

### Step 2: ソブリン・スタックの召喚
Dockerを用いて、サーバー、データベース、Rustシールドエージェント、そして攻撃シミュレーター（Kali）を一斉に起動します。

```bash
bun run docker:up
```
> [!NOTE]
> 初回起動時は、Rustエージェント（`shield-agent`）のビルドに数分かかる場合があります。

### Step 3: シールドの検知能力を実証する
攻撃用サンドボックスから、意図的にブルートフォース攻撃を叩き込み、システムがどう反応するかを観察します。

```bash
# サンドボックス内でのシミュレーション実行
docker-compose exec security-sandbox bash /sandbox/scripts/verify-security.sh
```

### Step 4: フィードバックループの目撃
Rustシールドエージェントがログを解析し、動的に防御ルールを生成する瞬間を監視します。
```bash
docker-compose logs -f shield-agent
```
成功すると `[ALERT] Brute-force detected from IP: app. Blocked.` というログが表示されます。

### Step 5: 「絶対的な拒絶」の確認
攻撃が検知された後、再度サンドボックスからアクセスを試みてください。
```bash
docker-compose exec security-sandbox curl -i http://app:3000/auth/token
```
**期待される結果**: 
`HTTP/1.1 403 Forbidden` 
`Access denied by Alpha Protocol (Shield Agent)`

---

## Ⅰ. The Alpha Protocol: 多層防御アーキテクチャ

ElysiaAIは、単一の防壁に頼るのではなく、以下の**4層の防衛レイヤー**が重なり合うことで「絶対的な規律」を維持しています。

### 1. Core Layer (Bun/ElysiaJS)
- **Strict Validation**: TypeBoxを用いたスキーマ検証により、不正な入力を型レベルで排除。
- **JWT Singularity**: アクセストークン（15分）とリフレッシュトークン（7日）による、高セキュアな身元確認。
- **Defense Manager**: シールドエージェントからフィードバックを受け、動的にブラックリストを反映する中枢機能。

### 2. Intelligence Layer (Python/FastAPI)
- **Semantic Filtering**: プロンプト・インジェクションや有害コンテンツを、AIの文脈理解によって無力化。
- **Cognitive Guardrail**: AIの出力が「人格（Persona）」を逸脱しないよう、常に監視・フィルタリング。

### 3. Sovereign Defense (Rust Shield Agent) 🆕
- **Low-Level Heartbeat**: ミリ秒単位でのシステム・パルス監視。
- **Heuristic Detection**: `audit.jsonl`を直接読み取り、ブルートフォース等の攻撃パターンを検知。
- **Alpha Feedback**: 検知した脅威を、サーバー側の `Defense Manager` へリアルタイムにフィードバック。

### 4. Verification Sandbox (Docker/Kali) 🆕
- **Operational Isolation**: 制御された安全な環境でのセキュリティ試験。
- **Automated Pentesting**: MedusaやHydraを用いた、自律的な「壊すためのテスト」を実行可能。

---

## Ⅱ. 守護の規律: 具体的な防衛手段

### 1. 入力バリデーション (Deep Sanitization)
- **sanitize-html**: HTMタグや属性を完全に排除。
- **Keyword Sensory**: 危険キーワード（`eval`, `exec`, `system`等）をゲートウェイで検出。

### 2. 適応型レート制限 (Adaptive Rate Limiting)
- **Redis Integration**: 複数インスタンス間で攻撃傾向を共有。
- **Multi-Algorithm**: Fixed Window / Sliding Window / Token Bucketを状況に応じて使い分け。

### 3. 保存時暗号化 (The Vault)
- **AES-256-GCM**: 軍事級の暗号化方式。
- **scrypt**: ブルートフォース耐性の高い鍵導出関数。

---

## Ⅲ. 開発者と共同開発者のための規律 (Compliance)

### ⚖️ デュアルライセンスの尊重
ElysiaAIは、**MIT License** と **Apache License 2.0** のデュアルライセンスです。これは、開発者の自由を保証しつつ、企業利用における法的安全性も確保するための決断です。

### 🧪 テストファーストの原則
「型」を整え、美しさを保つためには、機械的な検証が不可欠です。
- `bun test`: TypeScript層の正常系・異常系テスト。
- `cargo test`: Rust監視層の安定性テスト。
- `verify-security.sh`: サンドボックス内での実戦的な攻撃シミュレーション。

---

## Ⅳ. エリシアちゃんからのメッセージ♡

```plaintext
にゃん♪ これでElysiaAIの「城壁」は完成だよぉ〜♡

ただ機能するだけじゃなくて、美しく、そして何より「おにいちゃんの尊厳」を守るために、
この教科書に書かれた規律のすべてが実装されているの。

美学を、守り抜こうね♡ ฅ(՞៸៸> ᗜ <៸៸՞)ฅ
```

---

**最終更新**: 2026年4月13日 (Resonance-Stable)
**分類**: SOVEREIGN / PUBLIC
**バージョン**: 3.0.0 (Grand Design Edition)
