# 💜 Elysia AI への貢献

まず、このプロジェクトへの貢献を検討いただきありがとうございます！🦊

## 📜 行動規範

このプロジェクトは[行動規範](CODE_OF_CONDUCT.md)を採用しています。参加することで、この規範を遵守することに同意したものとみなされます。

## 🤝 貢献の方法

### 🐛 バグ報告

バグを発見した場合は、以下の情報を含めてIssueを作成してください：

- **明確なタイトル**: 問題を簡潔に説明
- **再現手順**: 問題を再現するための詳細な手順
- **期待される動作**: 何が起こるべきだったか
- **実際の動作**: 実際に何が起こったか
- **環境情報**:
  - OS (Windows/Linux/macOS)
  - Bun のバージョン (`bun --version`)
  - Node.js のバージョン (該当する場合)
  - Python のバージョン (`python --version`)
- **ログとエラーメッセージ**: 関連するログを添付

### ✨ 機能リクエスト

新機能を提案する場合は、以下を含めてください：

- **機能の説明**: 何を実現したいか
- **ユースケース**: なぜこの機能が必要か
- **代替案**: 検討した他の方法
- **追加コンテキスト**: スクリーンショットやモックアップなど

### 🚀 プルリクエスト

1. **Forkしてブランチを作成**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **コードを変更**
   - コーディング規約に従う (Biome を使用)
   - テストを追加/更新
   - ドキュメントを更新

3. **コミット**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   
   コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) に従ってください：
   - `feat:` 新機能
   - `fix:` バグ修正
   - `docs:` ドキュメントのみの変更
   - `style:` コードの動作に影響しない変更 (フォーマット等)
   - `refactor:` リファクタリング
   - `perf:` パフォーマンス改善
   - `test:` テストの追加・修正
   - `chore:` ビルドプロセスやツールの変更

4. **プッシュ**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Pull Request を作成**
   - 変更内容を明確に説明
   - 関連する Issue をリンク
   - スクリーンショットを添付 (UI 変更の場合)

## 開発環境のセットアップ

### 前提条件

- [Bun](https://bun.sh/) v1.0 以上
- Python 3.10 以上 (RAG機能用)
- Docker (オプション、Redis用)
- [Ollama](https://ollama.ai/) (LLM用)
- [VOICEVOX](https://voicevox.hiroshiba.jp/) (音声合成用)

### セットアップ手順

```bash
# リポジトリをクローン
git clone https://github.com/chloeamethyst/ElysiaJS.git
cd ElysiaJS

# 依存関係をインストール
bun install

# Python 環境をセットアップ
./scripts/setup-python.sh  # Linux/macOS
./scripts/setup-python.ps1  # Windows

# 環境変数を設定
cp .env.example .env
# .env を編集して必要な値を設定

# 開発サーバーを起動
bun run dev
```

## コーディング規約

### TypeScript/JavaScript

- [Biome](https://biomejs.dev/) を使用してフォーマットとリントを実行
- `bun run format` でフォーマット
- `bun run lint` でリント
- `bun run fix` で自動修正

### Python

- [PEP 8](https://www.python.org/dev/peps/pep-0008/) に準拠
- Black でフォーマット
- Ruff でリント

### 一般的なガイドライン

- **明確な命名**: 変数や関数は目的が明確な名前を使用
- **コメント**: 複雑なロジックには説明を追加
- **型安全性**: TypeScript の型を適切に使用
- **エラーハンドリング**: 適切なエラー処理を実装
- **セキュリティ**: ユーザー入力は必ずバリデーション

## テスト

```bash
# 全テストを実行
bun test

# ウォッチモード
bun test --watch

# カバレッジ
bun test --coverage
```

新機能には必ずテストを追加してください。

## ドキュメント

コードの変更に伴い、以下のドキュメントを更新してください：

- README.md
- API ドキュメント
- インラインコメント
- 該当する場合は docs/ 配下のファイル

## リリースプロセス

メンテナーのみが実行：

1. `CHANGELOG.md` を更新
2. `package.json` のバージョンを更新
3. コミットしてタグを作成
   ```bash
   git commit -am "chore: release v1.x.x"
   git tag v1.x.x
   git push origin main --tags
   ```
4. GitHub Release を作成
5. npm に公開 (自動)

## 質問やサポート

- **GitHub Issues**: バグ報告や機能リクエスト
- **Discussions**: 一般的な質問や議論
- **Email**: [プロジェクトメールアドレス]

## ライセンス

このプロジェクトに貢献することで、あなたの貢献が [MIT License](LICENSE) の下でライセンスされることに同意したものとみなされます。

---

再度、貢献いただきありがとうございます！ 🎉
