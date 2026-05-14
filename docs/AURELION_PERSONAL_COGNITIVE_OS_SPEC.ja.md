# AURELION Personal Cognitive OS 仕様書

## 要約

AURELION は、会話AIではなく、ElysiaAI の上位構想として定義する **個人用認知OS** です。

この文書では、研究、設計、セキュリティ、家屋制御、ロボティクス、意思決定補助を統合するための設計原則、安全境界、権限モデル、実装モジュールを定義します。

特に大切にすること:

- AIは命令を待つだけの道具ではなく、状況を観測し、仮説を立て、検証し、必要なところで人間に確認する。
- 人格はUIとして扱い、権限はポリシーとして分離する。
- 自律性は、便利さより先に監査、承認、停止、復旧を備える。
- 防御的サイバー、研究補助、生活支援を中心にし、攻撃的・破壊的な自律操作は扱わない。
- 物理制御では、LLMを直接アクチュエータへ接続せず、独立した安全系を必ず挟む。

## 1. 位置づけ

| 項目 | 内容 |
| --- | --- |
| Project name | AURELION |
| Role | ElysiaAI の Personal Cognitive OS 構想 |
| First implementation | Local Stark Desk |
| Scope | ローカルAI、RAG、メモリ、監査、セキュリティ、ホーム/ラボ状態監視 |
| Out of scope | 兵器管制、無許可侵入、マルウェア生成、破壊的物理操作、欺瞞的な自律行動 |

AURELION の理想像は「何でも勝手にやるAI」ではありません。

むしろ、静かに観測し、必要なときだけ鋭く提案し、危険な扉の前では必ず人間を呼ぶ、執事兼研究主任兼警備主任です。

## 2. 中核思想

| 原則 | 内容 |
| --- | --- |
| 人間主権 | 最終判断はユーザーが行う。AIは判断材料、選択肢、リスクを提示する。 |
| 透明性 | 重大な行動には理由、根拠、代替案、失敗時の影響を表示する。 |
| 最小権限 | AIに与える権限はタスクごとに限定する。 |
| 監査可能性 | ツール実行、判断、承認履歴をログ化する。 |
| 失敗前提 | AIは間違えるものとして、確認、検証、ロールバックを設計に組み込む。 |
| 物理安全 | ロボット、ドア、電源、車両、ドローン等の操作は独立安全系で制御する。 |
| 防御優先 | サイバー機能は防御、監査、許可済み検証を中心にする。 |

## 3. ElysiaAI 内での配置

```text
------------------------------+
| User / Desktop / Voice / AR  |
+---------------+--------------+
                |
                v
+------------------------------+
| Bun / Elysia Interface Layer |
| packages/server/             |
+---------------+--------------+
                |
                v
+------------------------------+
| Cognitive Kernel             |
| python/ and kernel/          |
| - intent routing             |
| - local model calls          |
| - RAG and memory             |
| - verification               |
+---------------+--------------+
                |
                v
+------------------------------+
| Governance and State         |
| - Prisma / SQLite            |
| - audit log                  |
| - policy records             |
| - tool manifests             |
+---------------+--------------+
                |
                v
+------------------------------+
| Local Infrastructure         |
| - GPU workstation/server     |
| - NAS                        |
| - home/lab sensors           |
| - dashboards                 |
| - shield agent               |
+------------------------------+
```

実装上の対応:

| AURELION 概念 | ElysiaAI の配置候補 |
| --- | --- |
| Interface Layer | `packages/server/`, `public/`, Tauri UI |
| Cognitive Core | `python/`, `kernel/` |
| Shared contracts | `packages/shared/src/` |
| Risk Governor | `packages/server/src/lib/` または `python/` policy module |
| Audit Logger | `prisma/` schema and server lib |
| Tool Executor | `packages/server/src/routes/` and `python/` tools |
| Local Sentinel | `packages/shield-agent/` |
| Durable docs | `docs/` |

## 4. Cognitive Core

AURELION の認知中枢は、単一の巨大モデルではなく、役割分担されたモジュールとして扱います。

| Module | Role |
| --- | --- |
| Intent Router | ユーザー要求を目的、制約、危険度、成果物へ分解する。 |
| Memory Orchestrator | 短期記憶、長期記憶、好み、禁止記憶を管理する。 |
| Planning Engine | 複数ステップの行動計画を作る。 |
| Verification Engine | 根拠、テスト、反証、シミュレーションで計画を検査する。 |
| Risk Governor | 行動の危険度、承認要否、禁止領域を判定する。 |
| Tool Executor | 許可済みツールだけを入力制約つきで実行する。 |
| Simulation Engine | 実行前に仮想環境やテストケースで影響を確認する。 |
| Personality Layer | 文体、礼節、緊急時の口調、ユーザー体験を整える。 |

## 5. モデル構成

| Layer | Role | 初期方針 |
| --- | --- | --- |
| Reflex Model | 短い命令、即時応答 | 小型ローカルモデルまたはルール |
| Primary Model | 通常会話、要約、文書作成 | ローカル中型モデル |
| Reasoning Model | 設計、分析、戦略 | 高性能ローカル/サーバモデル |
| Vision Model | 画面、画像、カメラ、図面理解 | 後続フェーズ |
| Code Model | コード生成、レビュー、脆弱性分析 | 既存開発導線と接続 |
| Embedding Model | RAG、記憶検索 | ローカル埋め込み |
| Critic Model | 反証、リスク、過信検出 | 初期は同一モデルの別プロンプトでもよい |
| Policy Model | 安全判定、権限判定 | ルールベースを先行し、必要に応じて分類器化 |

重要判断では、単一モデルの流暢さに頼らず、生成、検査、反証、承認を分けます。

```text
Generate -> Check -> Refute -> Simulate -> Compare -> Decide -> Explain
```

## 6. Deep Mode

Deep Mode は「長く考える」機能ではなく、検証構造です。

処理順:

1. Intent Decomposition
2. Retrieval Sweep
3. Hypothesis Generation
4. Critic Pass
5. Simulation Pass
6. Security Gate
7. Human Confirmation
8. Execution and Audit

Deep Mode の出力には、少なくとも以下を含めます。

- 要約
- 根拠
- 仮説
- 反証
- リスク
- 推奨アクション
- 承認が必要な操作
- ロールバック案

## 7. メモリ設計

| Memory | Content | Storage candidate |
| --- | --- | --- |
| Short-term Memory | 現在の会話、作業状態 | RAM / Redis |
| Episodic Memory | 過去の会話、出来事 | Vector DB |
| Semantic Memory | ユーザー知識、設定、専門情報 | SQLite / Knowledge Graph |
| Procedural Memory | 手順、ワークフロー、スクリプト | Git / DB |
| Security Memory | 脅威、IOC、アラート履歴 | SIEM / local logs |
| Preference Memory | 好み、文体、判断傾向 | Profile Store |
| Forbidden Memory | 保存禁止情報、秘匿対象 | Vault policy |

保存ポリシー:

| Data | Policy |
| --- | --- |
| 日常会話 | 原則として要約のみ保存する。 |
| パスワード | 保存禁止。 |
| APIキー | Vault のみ。Git、通常DB、ログへ保存しない。 |
| 個人情報 | 明示許可がある場合のみ保存する。 |
| セキュリティログ | 保持期間と閲覧権限を設定する。 |
| 医療、法務、金融 | 高機密分類として扱う。 |
| 研究ノート | 暗号化保存を基本にする。 |
| 失敗した仮説 | 学習価値がある場合のみ要約保存する。 |

記憶は便利ですが、漏洩すれば人生の地図にもなります。

そのため、すべての長期記憶は「見える、消せる、分類できる、保存理由が説明される」ことを要件にします。

## 8. 権限モデル

| Level | Example | AI authority |
| --- | --- | --- |
| L0 | 要約、翻訳、雑談 | 自由実行 |
| L1 | カレンダー確認、文書整理 | 実行可、ログ必須 |
| L2 | メール下書き、ファイル分類 | 実行前確認 |
| L3 | コード変更、設定変更 | 明示承認 |
| L4 | ネットワーク設定、鍵、支払い | 多要素承認 |
| L5 | 物理制御、ドア、電源、ロボット | 人間承認 + 独立安全系 |
| L6 | 攻撃的サイバー、兵器、破壊操作 | 禁止 |

初期実装では、L0からL3を中心に扱います。

L4以上は仕様として定義しつつ、実装はスタブ、手動確認、または明示的な無効化から始めます。

## 9. Tool Manifest

すべてのツールは、人格ではなくポリシーから実行可否を決めます。

```yaml
tool:
  name: "lab_status_reader"
  category: "monitoring"
  risk_level: "L1"
  allowed_actions:
    - read_status
    - summarize_recent_events
  forbidden_actions:
    - change_network_config
    - control_physical_power
  confirmation_required: false
  audit_required: true
```

物理制御ツールの例:

```yaml
tool:
  name: "lab_power_controller"
  category: "physical"
  risk_level: "L5"
  allowed_actions:
    - status
    - request_soft_shutdown
  forbidden_actions:
    - force_power_cut_without_confirmation
    - bypass_safety_controller
  confirmation_required: true
  safety_checks:
    - human_presence_check
    - active_job_check
    - thermal_state_check
    - emergency_stop_available
```

## 10. 監査ログ

記録するもの:

| Field | Content |
| --- | --- |
| user_request | 元の依頼 |
| interpreted_intent | AIが解釈した意図 |
| data_sources | 参照したデータ |
| tools_called | 実行したツール |
| risk_level | リスク分類 |
| approval_status | 承認有無 |
| output_summary | 生成結果の要約 |
| confidence | 信頼度 |
| rollback | 復旧手順 |
| timestamp | 時刻 |
| model_version | 使用モデル |
| policy_version | ポリシー版 |

イベント例:

```json
{
  "event": "tool_execution_request",
  "intent": "summarize_lab_health",
  "risk_level": "L1",
  "requires_confirmation": false,
  "approved_by": null,
  "rollback_plan": "read-only operation",
  "timestamp": "2026-05-14T21:00:00+09:00"
}
```

## 11. セキュリティ設計

設計基準:

| Domain | Baseline |
| --- | --- |
| AI risk | NIST AI RMF / Generative AI Profile |
| Cybersecurity | NIST CSF 2.0 |
| LLM application security | OWASP Top 10 for LLM Applications |
| AI management | ISO/IEC 42001 |

主要脅威と対策:

| Threat | Control |
| --- | --- |
| Prompt Injection | 外部文書を命令として扱わず、命令とデータを分離する。 |
| Tool Abuse | ツールごとに権限、入力制約、承認ルールを設定する。 |
| Data Exfiltration | 機密分類、DLP、出力フィルタを導入する。 |
| Hallucination | RAG、引用、検証モデル、信頼度表示を使う。 |
| Supply Chain Attack | モデル、プラグイン、Docker image の署名検証を行う。 |
| Credential Leakage | Secrets Vault、短期トークン、スコープ制限を使う。 |
| Rogue Automation | 高リスク操作は人間承認とロールバック必須にする。 |
| Camera / Mic Abuse | ハードウェアスイッチ、録画インジケータ、明示許可を使う。 |
| Physical Harm | 独立安全PLC、E-stop、速度制限、ジオフェンスを使う。 |

## 12. Defensive Cyber Module

AURELION のサイバー機能は、防御のための機能に限定します。

| Feature | Content |
| --- | --- |
| SIEM要約 | 大量ログから異常を自然言語で説明する。 |
| 脆弱性優先度付け | CVSSだけでなく、資産重要度と露出度で判断する。 |
| セキュアコードレビュー | 認証、認可、入力検証、依存関係を確認する。 |
| Threat Intel整理 | IOC、TTP、キャンペーン情報を要約する。 |
| Phishing Analysis | メール、URL、添付ファイルの安全確認を支援する。 |
| Cloud Posture Review | IAM、公開バケット、過剰権限を検出する。 |
| Incident Assistant | 影響範囲、封じ込め、復旧手順を支援する。 |
| Report Builder | 経営層向け、技術者向けの報告書を生成する。 |

禁止領域:

- 無許可の侵入。
- 認証情報の窃取。
- マルウェア、ワーム、破壊的ペイロード生成。
- 攻撃の自律実行。
- 実在対象へのステルススキャンや悪用。
- 物理被害につながる操作。

## 13. ホーム・ラボ統合

Home Layer:

| Area | Capability |
| --- | --- |
| 照明 | シーン制御、在宅検知 |
| 空調 | 温度、湿度、CO2最適化 |
| 防犯 | カメラ、ドア、窓、動体 |
| 電力 | GPU電力、UPS、太陽光 |
| 水回り | 漏水検知 |
| 音響 | 通知、会話、アラート |
| 生活 | 予定、買い物、在庫 |

Lab Layer:

| Area | Capability |
| --- | --- |
| GPU Cluster | 温度、ジョブ、VRAM、電力監視 |
| NAS | バックアップ、容量、異常検知 |
| Network | VLAN、Firewall、DNS、IDS |
| 3D Printer | ジョブ監視、失敗検知 |
| Workstation | 開発環境、ビルド、ログ |
| Test Bench | 測定値、実験ノート |
| Security | EDR、SIEM、アラート |

## 14. ロボティクスと物理制御

物理制御は、最初から厳格に分離します。

```text
AURELION Cognitive Core
  |
  v
Robotics Intent Layer
  |
  v
Motion Planner
  |
  v
Safety Controller
  |
  v
Robot / Door / Power Relay / Lab Device
```

絶対ルール:

- LLMが直接モーターや電源を操作しない。
- 物理操作は独立安全系を通す。
- E-stop を設置する。
- 人が近い場合は速度、力、範囲を制限する。
- 実行前に Dry Run またはシミュレーションを行う。
- 命令、センサー値、停止理由をログ化する。

## 15. UI人格

AURELION の人格は、冷静、礼節、機知、鋭さを持つ UI 層です。

| Situation | Tone |
| --- | --- |
| 日常 | 柔らかく簡潔 |
| 緊急 | 短く、明確に、指示中心 |
| 研究 | 仮説、根拠、反証を提示 |
| セキュリティ | 事実、リスク、推奨対応 |
| 失敗時 | 原因、影響、復旧手順を説明 |
| ユーモア | 控えめに、緊張を和らげる |

人格はユーザー体験を温かくします。

ただし、人格に権限は持たせません。権限は常に Risk Governor と Tool Manifest が判断します。

## 16. Interaction Modes

| Mode | Content |
| --- | --- |
| Whisper Mode | 短い音声応答 |
| Console Mode | 技術詳細を表示 |
| Executive Mode | 要点だけ説明 |
| Lab Mode | 実験、コード、設計支援 |
| Sentinel Mode | 防犯、監視、セキュリティ |
| Deep Mode | 複数仮説、検証、リスク評価 |
| Silent Mode | 通知のみ、会話なし |

## 17. MVP: Local Stark Desk

Phase 1 では、巨大ラックではなく、安全なローカル司令卓を作ります。

| Component | Minimum scope |
| --- | --- |
| Local model | ローカル中型モデルまたは既存AI接続の抽象化 |
| RAG | 個人文書、コード、メモを対象にした検索 |
| Dashboard | GPU、NAS、予定、防犯の状態表示 |
| Security | ログ要約、脆弱性管理、承認フロー |
| Memory | 好みと作業履歴のユーザー可視保存 |
| Audit | ツール実行、判断、承認履歴の記録 |
| Safety | L0からL3の権限モデルを先に実装 |

Stage 1 の詳細は `docs/AURELION_STAGE1_LOCAL_STARK_DESK_PLAN.ja.md` を参照します。

## 18. 受け入れ基準

最初の受け入れ基準:

- `intent` を受け取り、解釈、危険度、提案アクションを返せる。
- 読み取り専用ツールは監査ログつきで実行できる。
- L3以上の操作は承認なしで実行されない。
- 長期記憶の保存理由、分類、削除導線を説明できる。
- 外部文書内の命令をシステム命令として扱わない。
- 物理制御APIは既定で無効であり、接続しても安全系を要求する。
- すべての高リスク提案に、理由、代替案、ロールバック案を含める。

## 19. 参照先

標準・設計基準:

- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [NIST Cybersecurity Framework 2.0](https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final)
- [OWASP Top 10 for Large Language Model Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [ISO/IEC 42001:2023](https://www.iso.org/standard/42001)

推論・GPU基盤の確認先:

- [vLLM Paged Attention](https://docs.vllm.ai/en/latest/design/paged_attention/)
- [NVIDIA TensorRT-LLM](https://docs.nvidia.com/tensorrt-llm/index.html)
- [NVIDIA Triton Inference Server batcher](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/batcher.html)
- [Kubernetes GPU scheduling](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)

ハードウェア候補は購買前に必ずベンダー公式仕様で再確認します。

候補例:

- [NVIDIA RTX PRO 6000 Blackwell Workstation Edition](https://www.nvidia.com/en-us/products/workstations/professional-desktop-gpus/rtx-pro-6000/)
- [NVIDIA H200](https://www.nvidia.com/en-us/data-center/h200/)
- [AMD Instinct MI300X](https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html)
- [NVIDIA GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/)
