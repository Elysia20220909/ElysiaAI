# プロジェクト移転チェックリスト

このチェックリストは、ElysiaAI プロジェクトの所有権を移転する際に必要なステップをカバーしています。

## 事前準備

### コードベースの整理
- [x] すべての変更がコミットされている
- [x] すべてのブランチがプッシュされている
- [x] すべてのタグがプッシュされている
- [x] ビルドエラーがない
- [x] すべてのテストが通過
- [ ] 未解決のIssueを確認
- [ ] 未マージのPRを確認

### ドキュメントの準備
- [x] README.md が最新
- [x] CHANGELOG.md が更新されている
- [x] API ドキュメントが完全
- [x] セットアップガイドが正確
- [x] トラブルシューティングガイドが含まれている
- [x] ライセンス情報が明確
- [x] 貢献ガイドが整備されている

## ステップ 1: ドキュメント更新

### 所有権関連ドキュメント
- [x] CODEOWNERS ファイル作成
- [x] MAINTAINERS.md 作成
- [x] CONTRIBUTORS.md 作成
- [x] GOVERNANCE.md 作成
- [ ] LICENSE の著作権情報更新（新オーナー決定後）

### プロジェクトメタデータ
- [ ] package.json の author 更新
- [ ] package.json の repository URL 更新
- [ ] package.json の homepage 更新
- [ ] package.json の bugs URL 更新
- [ ] README.md のメンテナー情報更新
- [ ] README.md のバッジURLs更新

## ステップ 2: GitHub設定

### リポジトリ設定
- [ ] リポジトリの説明を更新
- [ ] トピックタグを設定
- [ ] ウェブサイトURLを設定（該当する場合）
- [ ] デフォルトブランチを確認
- [ ] ブランチ保護ルールを確認

### コラボレーター管理
- [ ] 新しいオーナー/メンテナーを追加
- [ ] 適切な権限レベルを設定
- [ ] チーム構成を確認（組織の場合）

### GitHub機能
- [ ] Issues が有効
- [ ] Discussions が有効（推奨）
- [ ] Projects が設定されている（オプション）
- [ ] Wiki が設定されている（オプション）
- [ ] Security Advisories が有効

## ステップ 3: CI/CD とシークレット

### GitHub Actions
- [ ] ワークフローが正常に動作
- [ ] すべてのシークレットを確認
- [ ] 新しいオーナーがシークレットにアクセス可能

### 必要なシークレット
```bash
# 以下のシークレットを新しい値で再生成：
- JWT_SECRET
- JWT_REFRESH_SECRET
- ENCRYPTION_KEY
- DATABASE_URL（本番環境）
- REDIS_URL（本番環境）
- その他のAPI キー
```

### シークレット更新手順
1. Settings > Secrets and variables > Actions
2. 各シークレットの "Update" をクリック
3. 新しい値を入力して保存

## ステップ 4: 外部サービス連携

### デプロイメントサービス
- [ ] Vercel/Netlify の所有権移転
- [ ] Heroku アプリの移転
- [ ] AWS/GCP リソースの移転
- [ ] Docker Hub の移転（該当する場合）

### 監視とログ
- [ ] Sentry プロジェクトの移転
- [ ] Datadog の移転
- [ ] その他の監視ツール

### パッケージレジストリ
- [ ] npm パッケージの所有権（公開している場合）
- [ ] その他のレジストリ

## ステップ 5: データベースとストレージ

### 本番環境データベース
- [ ] データベースのバックアップ作成
- [ ] 新しいオーナーにアクセス権限付与
- [ ] 接続文字列を新しいシークレットに更新

### ストレージ
- [ ] S3/GCS バケットのアクセス権限
- [ ] CDN 設定の移転
- [ ] アップロードファイルの移行計画

## ステップ 6: GitHub リポジトリ移転

### 移転前の最終確認
```bash
# すべてがプッシュされているか確認
git status
git branch -a
git tag

# リモート確認
git remote -v

# 最新の状態に
git pull origin master
```

### GitHub での移転手順
1. Settings > General に移動
2. "Danger Zone" セクションまでスクロール
3. "Transfer ownership" をクリック
4. 新しいオーナーのユーザー名を入力
5. リポジトリ名を再確認
6. `[username]/[repo]` の形式で確認
7. "I understand, transfer this repository" を入力
8. "Transfer this repository" をクリック

### 移転後の確認
- [ ] 新しいオーナーが管理者アクセスを確認
- [ ] すべてのブランチが存在
- [ ] すべてのタグが存在
- [ ] Issues と PRs が保持されている
- [ ] Actions ワークフローが動作
- [ ] GitHub Pages が動作（使用している場合）

## ステップ 7: コミュニケーション

### 内部コミュニケーション
- [ ] チームメンバーに移転を通知
- [ ] 新しい権限とアクセス方法を共有

### 外部コミュニケーション
- [ ] コミュニティに移転を発表
- [ ] Issue/PR でアクティブな貢献者に通知
- [ ] 新しいリポジトリURLを共有
- [ ] README に移転の告知を追加（一時的）

### アナウンス例

```markdown
## 📢 プロジェクト移転のお知らせ

ElysiaAI プロジェクトが [旧所有者] から [新所有者] に移転されました。

**新しいリポジトリURL**: https://github.com/[new-owner]/ElysiaAI

### 影響
- Issue と PR はすべて保持されています
- Git リモートURLが変更されました
- 貢献ガイドラインは変更ありません

### 開発者の対応
既存の開発者は、リモートURLを更新してください：

\`\`\`bash
git remote set-url origin https://github.com/[new-owner]/ElysiaAI.git
\`\`\`

ご協力ありがとうございます！
```

## ステップ 8: 移転後の整理

### 即座に実行
- [ ] すべてのシークレットを再生成
- [ ] API キーをローテーション
- [ ] アクセストークンを更新
- [ ] Webhook URLを確認

### 1週間以内
- [ ] すべての外部サービスが正常動作を確認
- [ ] CI/CD パイプラインが動作を確認
- [ ] デプロイメントをテスト
- [ ] コミュニティからのフィードバックを収集

### 1ヶ月以内
- [ ] 移行完了の最終確認
- [ ] アクティビティログを確認
- [ ] 未解決の問題をクローズ
- [ ] 移転完了の正式発表

## トラブルシューティング

### リモートURL変更が必要な場合
```bash
# 現在のリモートを確認
git remote -v

# 新しいURLに変更
git remote set-url origin https://github.com/[new-owner]/ElysiaAI.git

# 確認
git remote -v
git fetch origin
```

### CI/CD が失敗する場合
1. GitHub Actions のログを確認
2. シークレットが正しく設定されているか確認
3. ワークフローファイルのパスを確認
4. 権限設定を確認

### 外部サービスが動作しない場合
1. Webhook URL を新しいリポジトリURLに更新
2. API トークンを再生成
3. サービス側のログを確認
4. DNS設定を確認（カスタムドメインの場合）

## 緊急時の連絡先

移転中に問題が発生した場合：
- GitHub Support に連絡
- プロジェクトメンテナーに連絡
- バックアップから復元の準備

## バックアップ計画

移転前に必ずバックアップ：
```bash
# リポジトリ全体のクローン
git clone --mirror https://github.com/[owner]/ElysiaAI.git

# データベースバックアップ
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 設定ファイルのバックアップ
cp -r .github/workflows ~/backups/
cp .env.example ~/backups/
```

## チェックリスト完了

すべてのステップが完了したら：
- [ ] このチェックリストをアーカイブ
- [ ] 移転完了レポートを作成
- [ ] 関係者に最終報告

---

**作成日**: 2025-12-17  
**最終更新**: 2025-12-17  
**バージョン**: 1.0  
