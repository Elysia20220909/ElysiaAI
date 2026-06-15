# ElysiaAI Beta 0.1 Execution Plan

## 要約

Beta 0.1の目的は、ElysiaAIを「開発者の手元で動くMVP」から「限定テスターが毎日試せるPrivate AI Cockpit」へ進めること。

現時点では、Core MVP、Ollama縦通し、RAG、Memory、Security Agent、Windows Tauri、ローカルSecurity Gate、GitHub Actionsは確認済み。残るブロッカーは、macOS実機確認、デモ収録、テスター投入である。

## P0: Release Gate

- [x] Secrets検出ゼロをローカルで確認する
  - Gitleaks worktree scan: no leaks found
  - Security Agent: secrets ok
  - 広域regex scan: no matches
- [x] 実Ollamaで `mode: local-ollama` を確認する
- [x] Visual Studio Build Tools C++ / Windows SDKを導入する
- [x] Windowsで `bun tauri dev` を再実行する
  - FastAPI / Elysia lite stackは起動成功
  - Tauri Rust buildは完了
  - `target\debug\app.exe` 起動まで到達
- [x] GitHub Actionsの最新実行を確認する
  - 最新の `master` 実行は `ElysiaAI CI (Guardian)` / `ICE Runner Policy` ともにsuccess
- [x] Dependabot alert #7はdismissせず、上流依存リスクとして追跡する
  - Tracking issue: #104
  - Beta 0.1では「既知の上流依存リスク」として扱う
- [ ] macOS実機で `bun tauri dev` を確認する
  - Runbook: `docs/MACOS_TAURI_DEV_VERIFICATION.md`
  - Tracking issue: #105
- [x] 差分をpushし、GitHub Actionsを実行する

## P1: Demo Package

- [x] 3分デモ台本を作成する
- [ ] 実機Tauriウィンドウで3分デモ動画を収録する
  - Runbook: `docs/DEMO_RECORDING_RUNBOOK.md`
  - Tracking issue: #106
- [ ] READMEにデモ動画リンクとKnown Issuesを追加する
- [ ] Beta 0.1タグ用のリリースノートを作る

## P2: Tester Pilot

対象は3〜5人に限定する。目的は大規模利用ではなく、初回起動と日常導線の摩擦を測ること。

### テスター条件

- WindowsまたはmacOSでローカル開発環境を触れる
- Ollamaの導入に抵抗がない
- AIチャットより「個人用ローカル作業机」という価値を評価できる

### テスト項目

- 起動できたか
- Ollama `llama3.2` をpullできたか
- `mode: local-ollama` が表示されたか
- 日本語ファイル検索が期待どおりヒットしたか
- RAG Sourcesが理解しやすいか
- Memoryの表示、削除、クリアが自然か
- Security Agentの結果が行動につながるか

### 回収する指標

- 初回起動成功率
- 初回起動にかかった時間
- つまずいたコマンド
- 毎日使いたいと思った機能
- 不要または分かりにくい機能
- Beta 0.1に必要な最低改善点

## P3: Beta 0.1 Decision

以下を満たしたらBeta 0.1へ進む。

- GitHub Actionsが成功している
- Windows/macOSのTauri起動が確認済み
- Secrets検出ゼロが維持されている
- Dependabot alert #7はdismissせず、Issue #104で既知の上流依存リスクとして追跡している
- 3分デモ動画が完成している
- 3〜5人のテスターから初回フィードバックを回収している
- P0/P1の重大不具合がIssue化されている

## 推奨スケジュール

### Day 1

- Visual Studio Build Tools導入完了
- Windows Tauri再確認完了
- GitHub push / Actions確認

### Day 2

- macOS Tauri確認
- Demo動画収録

### Day 3

- README / Release note整理
- Tester kit配布

### Day 4-7

- テスター3〜5人からフィードバック回収
- Issue化
- Beta 0.1 Go / No-Go判定
