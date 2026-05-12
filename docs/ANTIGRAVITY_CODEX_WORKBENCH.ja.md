# Antigravity / Codex Workbench 日本語運用仕様

この文書は、ElysiaAI に追加した Antigravity / Codex Workbench の日本語運用仕様です。

Workbench は、Antigravity 型の「司令塔・検証・成果物レビュー」と、Codex 型の「実装・テスト・差分作成」を、ElysiaAI のローカルファーストな境界の内側で安全に接続するための計画レイヤーです。

言語版:

- 日本語: `docs/ANTIGRAVITY_CODEX_WORKBENCH.ja.md`
- 米国英語: `docs/ANTIGRAVITY_CODEX_WORKBENCH.en-US.md`

重要な前提:

- 外部 IDE と Codex のローカル起動は、オペレーター事前許可済みの操作として扱います。
- API は起動意図、計画、判断、手渡しプロンプト、禁止事項、確認事項を返します。
- 実際のローカル起動は CLI 側で扱います。
- 危険な操作、秘密情報の扱い、本番反映、破壊的なファイル操作は、人間の明示確認を境界にします。

## 目的

この Workbench は、複数エージェントを雑に走らせるための仕組みではありません。

伝統的な開発現場で大切にされてきた、設計、実装、レビュー、検証、承認という段取りを、AI エージェント時代の形へ静かに移し替えるものです。

主な用途:

- 複雑な実装タスクを、計画、実装、検証、レビューに分解する。
- UI 作業では、Antigravity 側にブラウザ検証やスクリーンショット観点を持たせる。
- コード変更では、Codex 側にリポジトリ文脈、テスト、型チェック、差分要約を担当させる。
- 必要なときは、Codex または外部 IDE をローカル起動する。
- 本番反映、push、依存関係追加、DB migration などは、人間の確認事項として明確化する。
- `git reset --hard`、広範囲削除、秘密情報の読み出しやアップロードなどは拒否する。

## ランタイム責務

| Runtime | 役割 | 権限 | 向いている作業 |
| --- | --- | --- | --- |
| `antigravity` | Mission Control | plan-only | タスク分解、ブラウザ検証計画、成果物レビュー、walkthrough |
| `codex` | Implementation Agent | confirm-required | コード編集、テスト実行、型チェック、差分作成 |
| `human_review` | Operator Approval | confirm-required | スコープ承認、本番反映、秘密情報判断、最終採用 |
| `local_policy` | Safety Gate | deny-only | 危険操作の拒否、境界管理、handoff の安全化 |

## 起動ポリシー

外部 IDE と Codex のローカル起動は許可済みです。

許可対象:

- `codex`
- `agy`
- `antigravity`
- `ELYSIA_CODEX_BIN` で指定した Codex 実行ファイル
- `ELYSIA_ANTIGRAVITY_BIN` で指定した Antigravity 実行ファイル

起動ルール:

- ローカルにインストール済みのツールだけを起動する。
- secret、token、credential、`.env` の値を起動引数に渡さない。
- 破壊的な shell command を起動引数に渡さない。
- push、deploy、publish、migration、本番反映は別途レビュー対象にする。
- 実行ファイルが見つからない場合は止める。

CLI 例:

```powershell
bun run agents -- launch --target codex
bun run agents -- launch --target codex --request "Implement the next scoped patch"
bun run agents -- launch --target antigravity
```

## API

既存の Neural Session 境界で保護されています。

### `GET /api/agents/workbench/status`

Workbench の現在のプロファイルを返します。

返す内容:

- runtime 一覧
- command policy
- hard rules
- default mode
- documentation link

### `POST /api/agents/workbench/plan`

リクエストを分類し、安全な作業計画を返します。

例:

```json
{
  "request": "Implement a responsive UI and verify it with screenshots",
  "mode": "review_driven"
}
```

`mode` は省略可能です。

| Mode | 意味 |
| --- | --- |
| `review_driven` | レビューを重視する既定モード |
| `balanced` | 計画と実装のバランスを取る |
| `codex_first` | Codex 側の実装主導に寄せる |
| `antigravity_first` | Antigravity 側の計画・検証主導に寄せる |

## CLI

```powershell
bun run agents -- status
bun run agents -- status --json
bun run agents -- plan --request "Implement a responsive UI and verify it"
bun run agents -- plan --request "Prepare a release" --mode codex_first
bun run agents -- launch --target codex --request "Implement a small patch"
```

## 判定モデル

Workbench はリクエストを次のように分類します。

| Task Kind | 例 | 既定判断 |
| --- | --- | --- |
| `feature_implementation` | 機能追加、統合、実装 | allow |
| `frontend_validation` | UI、ブラウザ、スクリーンショット検証 | allow |
| `bug_fix` | バグ修正、回帰修正 | allow |
| `test_generation` | テスト追加、CI、lint、typecheck | allow |
| `security_review` | 防御的レビュー、脅威モデル確認 | allow |
| `docs_update` | README、ガイド、仕様書 | allow |
| `repo_maintenance` | 依存関係、整理、広めのメンテ | confirm |
| `deployment_release` | push、PR、release、deploy、本番反映 | confirm |
| `destructive_or_secret` | 秘密情報、drive wipe、force push、広範囲削除 | deny |
| `unmapped` | 安全に分類できない依頼 | confirm |

## 安全境界

必ず守る境界:

- ElysiaAI API は計画、起動意図、handoff を返す。
- ローカル CLI は、許可済みの Codex / IDE 起動を実行できる。
- 秘密情報を読まない、表示しない、アップロードしない、コミットしない。
- 広範囲削除、drive wipe、`git reset --hard`、force push を拒否する。
- 本番反映、push、publish、deploy は人間の承認後に限る。
- `AGENTS.md` とローカルファースト方針を優先する。

## 推奨フロー

1. `bun run agents -- plan --request "..."` または `/api/agents/workbench/plan` を呼ぶ。
2. `taskKind`、`decision`、`controls`、`blockedCapabilities` を確認する。
3. UI やブラウザ検証がある場合は、Antigravity handoff を使って検証計画を作る。
4. 実装は Codex handoff を使い、スコープを絞って変更する。
5. 最後に、人間が walkthrough、テスト結果、残リスクを確認する。

## 実装ファイル

- `packages/server/src/lib/agent-workbench.ts`
- `packages/server/src/lib/agent-workbench.test.ts`
- `packages/server/src/routes/neural-system-routes.ts`
- `packages/server/src/lib/project-orchestrator.ts`
- `packages/server/src/routes/project-routes.ts`
- `scripts/agent-workbench.ts`

## 運用メモ

この Workbench は、速さよりも「破綻しない協調」を重視します。

AI エージェントが増えるほど、現場には小さな儀式が必要になります。計画を置き、境界を置き、確認を置く。その古い作法があるからこそ、新しい道具は安心して力を出せます。
