# 💜🦊 Elysia AI GitHub Guide

エリシア（速さ）× キュレネ（守り）の二重奏で、ワークフローを美しく。✨

## 🔗 クイックリンク

- CI/CD: `ci-cd.yml` ｜ シンプルCI: `ci.yml`
- セキュリティ/パフォ: `security-tests.yml`
- CodeQL: `codeql.yml`
- Publish: `publish.yml` ｜ Deploy雛形: `deploy.yml`

## 🌸 ここは何？

- `.github/workflows/` にあるCI/CDとセキュリティのレシピ集。
- DependabotやIssueテンプレートなど、運用ハートが集まる場所。
- 合言葉：速さはエリシア、慎重さはキュレネ。🛡️⚡

## 🚦 主なワークフロー（master向け）

- **CI/CD Pipeline - Enhanced (`ci-cd.yml`)**: Lint → Build → Test → Trivy → Docker build/push → SSHデプロイ（master pushのみ）。
- **CI (`ci.yml`)**: シンプルなLint/Build/Test。
- **Security & Performance (`security-tests.yml`)**: Trivyはpush/pullで軽量実行、Snyk/Dependency-Check/ZAPはスケジュールで深く。
- **CodeQL (`codeql.yml`)**: 週次のコード解析。
- **Publish (`publish.yml`)**: タグ/リリース時にnpm公開。
- **Deploy (`deploy.yml`)**: タグで本番デプロイの雛形。

## 🔑 シークレットの覚え書き

- `SSH_PRIVATE_KEY`, `SERVER_HOST`, `SERVER_USER`: 本番デプロイ用（ci-cd.yml）。
- `CODECOV_TOKEN`: カバレッジ送信（ci-cd.yml）。
- `SNYK_TOKEN`, `SONAR_TOKEN`: スケジュール時のみ利用（security-tests.yml）。
- `NPM_TOKEN`: npm publish（publish.yml）。

## 🧭 ルール（エリシア×キュレネ流）

1. **速さ優先**: PRでは軽量チェック（Trivyだけ）。
2. **深掘りは夜に**: Snyk/Dependency-Check/ZAPはスケジュールで集中実行。
3. **壊さない勇気**: lockfile差分で止めないよう、CIは通常の `bun install`。
4. **masterを清く保つ**: デプロイ系ジョブは master push のみ発火。

## 🛠️ 手動トリガー（workflow_dispatch）

```bash
# CI/CD Pipeline - Enhanced を手動実行
gh workflow run "CI/CD Pipeline - Enhanced"

# 直近の結果確認
gh run list --workflow "ci-cd.yml" --limit 5
```

## 🤝 トラブルシュートの合言葉

- 失敗したらまずログを見る：`gh run view <run-id> --log`
- lockfileエラーならローカルで `bun install` → コミット。
- 秘密鍵やトークンが無いジョブは自動的にスキップする設計。

エリシアの俊敏さとキュレネの守りで、安心して開発を楽しもう。💜🦊

