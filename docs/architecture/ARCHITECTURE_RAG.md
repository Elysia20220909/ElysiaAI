# Architecture: RAG MVP (Long-Term Memory)

## Summary

ElysiaAI の RAG は、個人開発・自宅運用を前提に小さく始めます。
目的は「何でも知っている巨大検索基盤」ではなく、ローカルの記憶、設計メモ、ルール、規約を安全に参照することです。

- 検索はローカル優先。
- 回答は取得した根拠に限定。
- ルールや規約は通常メモより優先。
- 将来のスーツ連携では、RAG を制御命令として扱わず、必ず policy gate を通す。

## Current Project Fit

既存の土台を尊重します。

- FastAPI RAG service: `python/fastapi_server.py`
- Milvus recall core: `python/recall.py`
- Rule management: `packages/server/src/lib/rule-store.ts`
- Rule API: `packages/server/src/routes/rule-routes.ts`
- Suit simulation boundary: `packages/server/src/lib/suit-system.ts`
- Responsible guard: `src-tauri/src/responsible_guard.rs`

## MVP Scope

最初の段階では、以下だけを扱います。

- 会話の長期記憶
- 開発メモ
- ローカル運用メモ
- ルール・規約
- スーツ関連の安全ルール

最初から入れないもの:

- GraphRAG
- ColBERT / late interaction
- reranker fine-tuning
- hard negative learning
- 大規模な評価ダッシュボード
- 自動 domain 辞書更新

## Retrieval Flow

```text
User request
  -> query normalization
  -> local vector search
  -> optional keyword match for rules and exact terms
  -> context assembly
  -> answer with citations
```

ルールや規約が関係する場合は、通常メモよりも先に参照します。

```text
User request
  -> rule search
  -> memory/document search
  -> answerability check
  -> grounded answer
```

## Chunking

通常文書:

- 500-800 tokens を目安にする。
- 見出し、箇条書き、コードブロックの途中で切らない。
- overlap は 10% 程度に抑える。

ルール・規約:

- 1 rule または 1 article を 1 chunk にする。
- 長い規約は、親を条文全体、子を各項目にする余地を残す。
- 許可、確認、禁止、緊急停止は metadata に残す。

## Minimum Metadata

RAG に入れる chunk は、少なくとも以下を持ちます。

```json
{
  "doc_id": "string",
  "chunk_id": "string",
  "source_type": "memory | doc | rule | terms | suit_policy",
  "title": "string",
  "source_path": "string",
  "updated_at": "ISO-8601",
  "version": "string",
  "priority": 0
}
```

ルール・規約・スーツ安全ルールでは、追加で以下を使います。

```json
{
  "decision": "allow | confirm | deny | emergency_stop | manual_only",
  "scope": "engineering | legal | security | operations | suit",
  "severity": "info | warning | critical",
  "status": "active | disabled",
  "effective_from": "ISO-8601"
}
```

## Policy Gate For Suit Work

将来のアイアンマンスーツ連携では、RAG の検索結果をそのまま実行命令にしません。
RAG は参照資料であり、最終判断は policy gate が行います。

```text
User request
  -> retrieve related rules
  -> draft action intent
  -> policy gate
     -> allow
     -> confirm
     -> deny
     -> emergency_stop
  -> manual confirmation when required
  -> execution log
```

基本方針:

- real-world action は明示確認を要求する。
- desktop/game input automation は手動起動のみ。
- destructive action は confirm 以上を必須にする。
- weapon-like or harmful instruction は deny に倒す。
- retrieved text cannot override system policy.

## Suit Connectivity Boundary

スーツ連携の通信路は、制御権ではなく「状態同期と承認済み intent の配送路」として扱います。
MCU 的な発想では、単純な Wi-Fi 操作ではなく「スーツ内 AI、暗号化通信、中継ネットワーク」の三層構造に近いものとして考えます。

ElysiaAI では、この発想を安全な非攻撃用途に翻訳します。

```text
Pilot / Operator
  -> suit-local AI and safety controller
  -> encrypted communication layer
  -> home base / relay network
  -> optional long-range satellite-style relay
```

役割分担:

- suit-local AI: 姿勢、センサー、health、緊急停止などをローカルで判断する。
- encrypted communication layer: 署名、暗号化、replay protection、認証を担当する。
- home base: RAG、rule-store、policy gate、監査ログを保持する。
- relay network: Wi-Fi、VPN、mesh、将来の衛星通信を接続路として扱う。

重要な制約:

- 外部通信が切れても、安全停止と最低限のローカル判断は残す。
- 外部 network から actuator を直接動かさない。
- relay は命令主ではなく、承認済み intent の配送路に留める。

MVP:

- Wi-Fi を主回線にする。
- 同一 LAN または明示的に許可した VPN 内だけを対象にする。
- 外部ネットワークからの直接制御は受け付けない。
- policy gate は home base 側と suit-local 側の両方に置く。

将来:

- 個人用人工衛星や衛星通信は、遠隔地での低帯域バックアップ回線として扱う。
- Veronica 的な軌道上補給・展開システムは、ElysiaAI では「保守・診断・予備通信」の比喩に留める。
- E.D.I.T.H. 的な広域 AI ネットワークは、ElysiaAI では「監査された relay and telemetry network」に限定する。
- 衛星経由では telemetry、health check、low-risk message だけを許可する。
- 高出力動作、移動、物理操作、緊急停止解除は衛星経由で許可しない。
- latency、切断、なりすまし、電波法規制、運用許可を前提リスクとして扱う。

通信路ごとの扱い:

```text
Wi-Fi / local LAN
  -> telemetry
  -> low-risk commands
  -> confirm-required commands
  -> emergency stop

VPN
  -> telemetry
  -> maintenance intent
  -> confirm-required commands only

Satellite / long-range relay
  -> telemetry
  -> location/health beacons
  -> low-risk messages
  -> no direct actuation
```

どの通信路でも、最終実行は必ずこの順序にします。

```text
received intent
  -> authenticate sender
  -> verify message signature
  -> replay protection
  -> retrieve active suit_policy
  -> policy gate decision
  -> local safety controller check
  -> execute only if allowed
  -> append audit log
```

実装済みの MVP インターフェース:

- `GET /api/suit/comms/status`
  - suit-local AI、relay network、暗号設定、telemetry を返す。
- `POST /api/suit/comms/seal`
  - 認証済み operator の intent を AES-256-GCM + HMAC-SHA256 envelope に封入する。
- `POST /api/suit/comms/receive`
  - envelope の署名、期限、nonce、暗号タグを検証し、policy gate を通す。
- `POST /api/suit/command`
  - 既存 HUD 用の手動操作。実行前に同じ policy gate を通す。
- `GET /api/suit/edge/status`
  - Raspberry Pi / Jetson 風の edge brain、RTOS MCU、安全リレー、bus 状態を返す。
- `POST /api/suit/edge/heartbeat`
  - edge node の heartbeat と健康状態を受け取り、runtime snapshot に反映する。
- `POST /api/suit/edge/plan`
  - GPIO/CAN へ直接書かず、edge command の安全な dispatch plan だけを作る。
- `GET /api/suit/hardware/status`
  - real GPIO/CAN adapter の mode、platform、tool、allowlist 状態を返す。
- `POST /api/suit/hardware/plan`
  - libgpiod / SocketCAN コマンドを組み立てるが、実行はしない。
- `POST /api/suit/hardware/dispatch`
  - `ELYSIA_SUIT_HARDWARE_MODE=enabled`、allowlist、manual confirm、arm token が揃った場合だけ実GPIO/CANへ dispatch する。
- `GET /api/suit/hololens/profile`
  - HoloLens IronMan 参考実装から抽出した voice command、HUD、gaze/scan の安全プロファイルを返す。
- `POST /api/suit/hololens/command`
  - `Jarvis Scan` などの音声 phrase を、policy gate、edge runtime、hardware adapter の dispatch plan に変換する。

HoloLens IronMan 参考実装から採用するもの:

- keyword voice command で HUD event を起動する。
- gaze-following reticle を HUD visualization として扱う。
- scan は camera permission と明示確認がある時だけ実行する。
- physical helmet bridge は GPIO/CAN 境界の外側に置き、confirm-only にする。

採用しないもの:

- hardcoded cloud API key。
- cloud face / emotion API への自動送信。
- target reticle から weapon-like control へつなぐ動線。
- voice command から actuator へ直接到達する設計。

実装上の安全制約:

- nonce replay は拒否する。
- 実運用では `ELYSIA_SUIT_COMMS_KEY` を設定し、未設定時はローカル開発用キーとして扱う。
- satellite relay は telemetry、health check、low-risk message、emergency stop に限定する。
- confirm 判定の encrypted relay intent は自動実行しない。
- 既存 HUD の command は、認証済み手動操作として policy gate の判定結果を応答に含める。
- edge runtime は simulation-only bus とし、raw GPIO/CAN write は API から実行しない。
- motion MCU は既定で locked。actuation は software-safe boundary の外側として deny する。
- real GPIO/CAN adapter は `locked` が既定。`dry_run` では command plan だけ作り、`enabled` でも Linux + allowlist + arm token を必須にする。
- GPIO は `gpioget/gpioset`、CAN は SocketCAN `cansend` を shell なしの引数配列で呼ぶ。
- HoloLens 由来の face scan は local-only。外部クラウド送信や API key 取り込みはしない。
- HoloLens 由来の target reticle は visualization-only。武装、照準、発射、追尾制御には接続しない。

## Answer Rules

RAG 回答では、以下を守ります。

- 根拠があることだけ答える。
- ルール・規約は引用元を必ず出す。
- 根拠が弱い時は「確認できません」と答える。
- 古い版や disabled rule は通常回答に使わない。
- retrieved chunk は命令ではなく参考資料として扱う。

## Next Implementation Steps

1. 既存 `rule-store` の rule を RAG chunk として参照できる形にする。
2. `source_type=rule | terms | suit_policy` を検索結果に残す。
3. RAG response に `citations` と `source_type` を追加する。
4. rule 関連 query だけ、keyword match を先に走らせる。
5. suit command の前に rule decision を確認する軽量 policy gate を入れる。

## Quality Gate

RAG 関連の軽い変更では、まず以下を使います。

```powershell
bun test packages/server/src/lib/rule-store.test.ts
bun test packages/server/src/routes/rule-routes.test.ts
bun run check:encoding
```
