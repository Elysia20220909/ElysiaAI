# 💜 .github ディレクトリ

このディレクトリには、GitHubの設定とワークフローが含まれています。

## 📁 構成

```
.github/
├── ISSUE_TEMPLATE/          # Issueテンプレート
│   ├── bug_report.md       # 🐛 バグ報告
│   ├── feature_request.md  # ✨ 機能リクエスト
│   └── question.md         # ❓ 質問
├── workflows/              # GitHub Actions
│   ├── ci.yml             # 🔄 継続的インテグレーション
│   ├── deploy.yml         # 🚀 デプロイメント
│   ├── security-tests.yml # 🔒 セキュリティテスト
│   └── codeql.yml         # 🔍 コード品質分析
├── dependabot.yml         # 🤖 依存関係自動更新
└── pull_request_template.md # 📋 PRテンプレート
```

## 🎯 主な機能

- **自動CI/CD**: プッシュごとに自動テスト・デプロイ
- **セキュリティスキャン**: 脆弱性の自動検出
- **Dependabot**: 依存関係の自動更新
- **テンプレート**: 統一されたIssue/PR作成

---

Made with 💜 by Elysia AI
