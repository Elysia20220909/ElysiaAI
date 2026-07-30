# ElysiaAI Beta 0.1 Release Notes

## 要約

Beta 0.1は、ElysiaAIをローカルで毎日試せるPrivate AI Cockpitへ近づけるための候補版です。

今回の中心は、派手な自律Agentではありません。まずは自分のPCの上で、会話、検索、RAG、記憶、Security Agentが一本につながることを確認します。古い机に灯りを置くように、毎日使うための足場を整えるリリースです。

## 主な変更

- Tauri UIをMVP用のローカルコックピットへ整理
- Bun / ElysiaからOllamaへ直接つなぐローカルチャット経路を追加
- ワークスペース内の軽量ファイル検索と最小RAG導線を追加
- ランタイムMemoryの表示、追加、削除、セッションクリアを追加
- MVP readiness APIとSecurity Agentの最小監査APIを追加
- Secrets、GitHub Actions、依存関係、ログ異常をSecurity Agentで確認できるように整理
- WindowsでTauri開発起動と実Ollama連携を確認
- macOS実機確認と3分デモ収録のRunbookを追加
- Tauri配布前点検の `desktop:check` とRunbookを追加
- Windows/macOS向けのTauri配布ゲートとLinux `glib` advisory gateをCIに接続

## 確認済み

- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run test --coverage`
- `bun run check:git-hygiene`
- `bun run check:runner-policy`
- `bun run check:deps`
- `bun run check:encoding`
- `bun audit`
- `bun run security:glassworm -- --ci`
- `bun run security:audit`
- Python MVP対象のRuff / Pytest
- Windowsで `bun tauri dev` のRust build完了と `app.exe` 起動
- 実Ollama `llama3.2` で `mode: local-ollama` 応答
- Gitleaks worktree scanでSecrets検出ゼロ
- GitHub Actionsの最新 `master` 実行成功
- Guardian CIで `desktop:check:windows`、`desktop:check:macos`、`desktop:check:linux:beta` 相当の配布前点検を実行

## Known Issues

- macOS実機での `bun tauri dev` 確認は未完了
- 3分デモ動画は未収録
- READMEへの完成版デモ動画リンクは未掲載
- Windows署名、macOS公証、Tauri updaterは配布前レビューで判断（未署名・未公証のテスト配布ビルドでは、起動時にOSのセキュリティ警告である Windows Defender SmartScreen や macOS Gatekeeper が表示される制限があります）。
- Dependabot alert #7の `glib` は、Tauri / Wry / Linux GTK3系の上流依存リスクとしてIssue #104で追跡中。Linux配布は `desktop:check:linux` でblocker扱い（`--allow-linux-glib-advisory` を明示的に指定した警告記録用ビルドのみが許容され、原則配布対象外）。
- Pythonの無指定 `ruff check .` と無指定 `pytest` は、MVP外の既存スクリプトまで含めると失敗するため、Beta 0.1では対象範囲をMVP関連に限定

## テスターに見てほしいこと

- 初回起動で迷わないか
- Ollama `llama3.2` を用意できるか
- `mode: local-ollama` が表示されるか
- 日本語ファイル検索が自然に使えるか
- RAG Sourcesの出典表示が分かりやすいか
- Memoryの追加、削除、クリアが安心して使えるか
- Security Agentの結果が次の行動につながるか

## 次の作業

- macOS実機で `bun tauri dev` を確認する
- 3分デモ動画を収録する
- READMEに完成版デモ動画リンクを追加する
- 3〜5人のテスターへBeta 0.1候補を配布する
- `bun run desktop:check` の警告を確認し、署名/公証/更新方針を決める
- Windows/macOS署名方針を決め、Linuxは `glib >= 0.20.0` へ上がるまで配布対象外として扱う
- 初回フィードバックをIssueへ整理する
