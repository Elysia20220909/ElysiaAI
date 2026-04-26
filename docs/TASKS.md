# 📋 ElysiaAI 開発タスクリスト (Backlog)

## 🎨 ユーザー体験 (User Experience)
- [x] **VOICEVOX 連携の調整**: 音声の可愛さをさらにブラッシュアップする。
- [x] **ターミナル演出**: 起動時や特定コマンド実行時に、ターミナルに星が降るようなアニメーションを追加。
- [ ] **季節イベント**: 特定の日に実行した際の隠しメッセージや特殊演出の追加。

## ⚙️ インフラ・バックエンド (Infrastructure)
- [ ] **完全ローカル動作 (Ollama)**: オフライン環境でも Ollama を使用して動作するように検証と設定の追加。
- [x] **スクリプトの TypeScript 化**: `scripts/` 内の主要な `.ps1`, `.sh` を `scripts/manage.ts` に統合完了。

## 🔒 セキュリティ・安定性 (Security & Stability)
- [x] **本番環境用セキュリティ設定**: `FORCE_HTTPS`, `CSP` などの設定を `src/config.ts` で一元管理完了。
- [x] **モニタリング**: Prometheus メトリクスの導入、ヘルスチェックの改善、Graceful Shutdown の実装完了。

---
> [!NOTE]
> このファイルは `docs/TODO.md` の内容を元に作成されました。実装が進むごとにチェックを入れていきます。
