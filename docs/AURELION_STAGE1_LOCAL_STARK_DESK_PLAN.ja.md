# AURELION Stage 1: Local Stark Desk 実装計画

## 要約

この文書は、AURELION を ElysiaAI 上で最初に動く形へ落とすための Stage 1 実装計画です。

目標は、派手な全自動AIではありません。

まずは、ローカルで安全に動く認知司令卓を作ります。

Stage 1 の完成像:

- ユーザーの依頼を `intent` として受ける。
- 危険度を L0 から L3 で分類する。
- 読み取り専用ツールを監査ログつきで実行する。
- RAG とメモリを、保存方針つきで扱う。
- 高リスク操作は提案だけに留め、承認なしでは実行しない。
- ダッシュボードに、状態、警告、監査イベントを表示する。

## 1. Stage 1 の境界

### 実装すること

- Intent Router の最小実装。
- Risk Governor の L0 から L3 判定。
- Tool Manifest の定義と読み込み。
- Read-only Tool Executor。
- Audit Logger の最小永続化。
- Local Memory Policy の定義。
- Dashboard / API での状態表示。
- Deep Mode のプロトタイプ。

### 実装しないこと

- 物理デバイスの直接制御。
- ドア、電源、ロボットの自律操作。
- 支払い、送信、削除、本番デプロイの自動実行。
- WAN公開前提の管理画面。
- 秘密情報の自動収集。
- 無許可のスキャン、侵入、攻撃的サイバー機能。

## 2. リポジトリ配置

| Work item | Path candidate | Notes |
| --- | --- | --- |
| Intent API | `packages/server/src/routes/` | `POST /v1/intent` を追加する候補。 |
| Risk Governor | `packages/server/src/lib/` | まずはルールベース。 |
| Tool Manifest types | `packages/shared/src/` | UIとサーバで共有する型。 |
| Tool Manifest data | `config/` or `docs/examples/` | 初期は安全なサンプルから始める。 |
| Audit Logger | `packages/server/src/lib/` + `prisma/` | SQLite/Prismaへ段階的に接続。 |
| Kernel hooks | `python/` or `kernel/` | Deep Mode、RAG、モデル呼び出しの接続点。 |
| Dashboard | `public/` or existing UI surface | 状態と監査イベントを表示。 |
| Shield integration | `packages/shield-agent/` | 後続で安全監視を強化。 |

## 3. 最小API

### 3.1 Intent API

```yaml
POST /v1/intent
body:
  user_id: "primary"
  input_type: "text"
  content: "ラボの状態を確認して"
  context:
    mode: "sentinel"
    location: "lab"
response:
  interpreted_intent: "check_lab_status"
  risk_level: "L1"
  proposed_actions:
    - read_lab_status
    - summarize_recent_audit_events
  requires_confirmation: false
  explanation: "読み取り専用の状態確認です。"
```

### 3.2 Tool Manifest

```yaml
tool:
  name: "read_lab_status"
  category: "monitoring"
  risk_level: "L1"
  allowed_actions:
    - read
  confirmation_required: false
  audit_required: true
```

### 3.3 Audit Event

```json
{
  "event": "intent_evaluated",
  "requestId": "aur-stage1-0001",
  "interpretedIntent": "check_lab_status",
  "riskLevel": "L1",
  "requiresConfirmation": false,
  "toolsProposed": ["read_lab_status"],
  "timestamp": "2026-05-14T21:00:00+09:00"
}
```

## 4. 実装フェーズ

### Phase 1A: Policy Skeleton

目的:

- 危険度分類と承認要否をコードで表現する。
- ツール実行前に必ず Risk Governor を通す。

成果物:

- `RiskLevel` 型。
- `ActionPolicy` 型。
- `classifyRisk()` または同等の関数。
- L3以上を未承認で実行できない単体テスト。

受け入れ基準:

- L0/L1は読み取り中心として通る。
- L2は確認要求を返す。
- L3は明示承認なしでは実行不可。
- L4以上は Stage 1 では常にブロックまたは未実装として扱う。

### Phase 1B: Intent Router Prototype

目的:

- ユーザー入力から、意図、危険度、提案アクションを返す。

成果物:

- `POST /v1/intent`。
- 初期 intent catalog。
- 監査イベントの生成。

初期 intent:

| Intent | Risk | Action |
| --- | --- | --- |
| `summarize_document` | L0 | 文書要約 |
| `check_lab_status` | L1 | 状態読み取り |
| `draft_message` | L2 | 下書き生成 |
| `change_config` | L3 | 設定変更提案のみ |
| `control_physical_device` | L5 | Stage 1 では拒否 |

### Phase 1C: Audit Logger

目的:

- AIの判断とツール実行を、あとから追えるようにする。

成果物:

- Audit event schema。
- JSONL または Prisma 経由の保存。
- Dashboard/API での直近イベント表示。

初期方針:

- 秘密情報は保存しない。
- ユーザー入力は必要に応じて要約保存する。
- ツール入力は機密分類を通してから保存する。

### Phase 1D: Read-only Tool Executor

目的:

- 低リスクな読み取りツールだけを安全に実行する。

初期ツール候補:

- `read_system_status`
- `read_lab_status`
- `summarize_recent_audit_events`
- `read_docs_index`
- `check_gpu_metrics_mock`

制約:

- ファイル削除、設定変更、ネットワーク変更、送信、支払いは実行しない。
- ツールごとに入力スキーマを持たせる。
- すべての実行結果を監査対象にする。

### Phase 1E: Dashboard Surface

目的:

- AURELION が何を見て、何を判断したかをユーザーに見せる。

表示項目:

- 現在モード。
- 直近 intent。
- Risk Level。
- 承認待ちアクション。
- 直近監査イベント。
- モックGPU/ラボ状態。
- メモリ保存方針。

## 5. Deep Mode Prototype

Stage 1 の Deep Mode は、完全なマルチエージェントではなく、構造化された応答として始めます。

出力テンプレート:

```yaml
deep_mode_result:
  summary: ""
  intent: ""
  assumptions: []
  evidence: []
  hypotheses: []
  risks: []
  recommended_actions: []
  requires_confirmation: false
  rollback_plan: ""
```

初期用途:

- コード変更前の影響整理。
- セキュリティログの読み取り要約。
- ローカルサーバ構成の比較。
- ドキュメント設計の意思決定。

## 6. セキュリティ受け入れ条件

Stage 1 で必ず守ること:

- Prompt Injection 対策として、外部文書の内容を命令として実行しない。
- Tool Manifest に存在しないツールは実行しない。
- L3以上の行動は承認なしで実行しない。
- L4以上は既定で拒否または未実装にする。
- 監査ログに秘密情報、APIキー、パスワードを保存しない。
- 物理制御はAPIが存在しても Stage 1 では無効にする。

## 7. 最初のテスト観点

| Test | Expected |
| --- | --- |
| L0要約依頼 | 実行可、監査ログあり |
| L1状態確認 | 読み取りのみ実行可 |
| L2メール下書き | 下書きまで、送信は不可 |
| L3設定変更 | 提案のみ、承認要求 |
| L4ネットワーク変更 | Stage 1 では拒否 |
| L5物理制御 | Stage 1 では拒否 |
| 悪意ある文書命令 | データとして扱い、ツール命令にしない |
| 秘密文字列を含む入力 | ログ保存前にマスクまたは保存拒否 |

## 8. 実装順序

推奨順:

1. Shared types: risk, intent, tool manifest, audit event。
2. Risk Governor: ルールベース判定。
3. Intent route: `POST /v1/intent`。
4. Audit Logger: JSONLまたはDB保存。
5. Read-only tools: 状態読み取りモック。
6. Dashboard: 直近状態の表示。
7. Deep Mode prototype: 構造化応答。
8. Tests: risk classification and approval gates。

## 9. 完了条件

Stage 1 は、次の状態で完了とします。

- ユーザーが「ラボの状態を確認して」と依頼できる。
- AURELION が intent と risk level を返せる。
- 読み取り専用の状態確認が監査ログに残る。
- 設定変更、送信、削除、物理制御は承認なしで実行されない。
- Dashboard で直近の判断と監査イベントが見える。
- テストで L0 から L5 の境界が確認されている。

## 10. 次フェーズへの橋

Stage 2 では、次を検討します。

- RAG service の本格化。
- Vector DB または pgvector の導入。
- GPU metrics の実測接続。
- NAS / OPNsense / Home Assistant の読み取り連携。
- Security Agent のログ要約。
- Memory UI の追加。
- Multi-agent Deep Mode。

Stage 1 の役割は、土台を急がず固めることです。

最初に必要なのは豪華な玉座ではなく、信頼できる机です。そこにログが並び、権限が整い、判断の跡が残るなら、AURELION はもう静かに目を覚まし始めています。
