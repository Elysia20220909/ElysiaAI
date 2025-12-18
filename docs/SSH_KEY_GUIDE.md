# SSH Key Management Guide for ElysiaAI

## キー情報

| 項目 | 値 |
|------|-----|
| **キーペア** | `id_elysiaai` / `id_elysiaai.pub` |
| **アルゴリズム** | ED25519 (楕円曲線) |
| **場所** | `~/.ssh/` |
| **フィンガープリント** | `SHA256:ab3RUc7+oPvtMh8hrelaPdm79TrUWUMVwtDgWLWiOcM` |
| **コメント** | `elysiaai@elysia-ai.local` |

## 設定済みホスト

- **github.com** - Git リポジトリ操作用
- **gitlab.com** - GitLab操作用
- **deploy** - 本番環境デプロイ用（要設定）

## 使用方法

### 1. Git リポジトリの操作
```bash
# リポジトリをクローン（SSH使用）
git clone git@github.com:Elysia20220909/ElysiaAI.git

# SSH接続テスト
ssh -T git@github.com
```

### 2. リモートサーバーへのアクセス
```bash
# デプロイサーバーに接続
ssh deploy

# またはホスト名で直接接続
ssh -i ~/.ssh/id_elysiaai user@your-server.com
```

### 3. SSH キーを GitHub/GitLab に追加

#### GitHub の場合：
1. [GitHub Settings > SSH and GPG keys](https://github.com/settings/keys)
2. **New SSH key** をクリック
3. 以下の公開鍵をペーストしてください

**公開鍵：**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOCNSCOSUUlNYXkB60qq66Bb9IX4sOJqGjLp1ot5zeOC elysiaai@elysia-ai.local
```

#### GitLab の場合：
1. **User Settings > SSH Keys**
2. 同じ公開鍵を追加

## セキュリティ設定

✅ 秘密鍵のパーミッション設定完了（ユーザーのみアクセス可）

```powershell
# パーミッション確認
icacls ~/.ssh/id_elysiaai
```

**安全性:**
- ED25519: 最新の強力な暗号化
- パスフレーズなし: 自動スクリプト/CI/CD用
- プライベート鍵は絶対に共有しない

## Windows での SSH エージェント設定

### OpenSSH を使用する場合：
```powershell
# サービスを自動開始に設定
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent

# キーを追加（PowerShell管理者モード）
ssh-add ~/.ssh/id_elysiaai
```

### Git Bash/WSL を使用する場合：
```bash
# ~/.ssh/config で自動読込設定済み
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_elysiaai
```

## トラブルシューティング

| 問題 | 解決方法 |
|------|--------|
| Permission denied | パーミッション確認: `icacls ~/.ssh/id_elysiaai` |
| ssh-agent not found | OpenSSH サービス起動: `Start-Service ssh-agent` |
| GitHub接続失敗 | `ssh -T git@github.com` でテスト、公開鍵が正しく登録されているか確認 |
| キーが使われていない | `~/.ssh/config` で適切なホスト設定があるか確認 |

## 鍵のローテーション

セキュリティベストプラクティスとして、定期的に鍵をローテーションしてください：

```powershell
# 新しい鍵を生成
ssh-keygen -t ed25519 -f ~/.ssh/id_elysiaai_new -N "" -C "elysiaai@elysia-ai.local"

# GitHub/GitLab に新しい公開鍵を追加

# 古いキーを使用しているホストを確認、更新後にファイルを置き換え
```

## 参考資料

- [GitHub SSH setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [GitLab SSH Keys](https://docs.gitlab.com/ee/user/ssh.html)
- [OpenSSH Manual](https://man.openbsd.org/ssh_config)
- [ED25519 Curve](https://en.wikipedia.org/wiki/Curve25519)
