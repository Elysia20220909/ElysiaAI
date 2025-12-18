# GPG Key Management Guide for ElysiaAI

## キー情報

| 項目 | 値 |
|------|-----|
| **キーID** | `056EC24BFFC1E479` |
| **フルID** | `74CABE5FC986D394F6FC67A4056EC24BFFC1E479` |
| **アルゴリズム** | RSA 4096ビット |
| **作成日** | 2025-12-18 |
| **有効期限** | 2028-12-17（3年） |
| **ユーザー** | ElysiaAI <elysiaai@elysia-ai.local> |

## 使用方法

### 1. コミット署名（自動有効）

```bash
# 自動署名有効（設定済み）
git commit -m "Your message"

# 手動署名
git commit -S -m "Your message"

# 署名の検証
git log --show-signature
```

### 2. Git に公開鍵を登録

#### GitHub の場合：
1. [GitHub Settings > SSH and GPG keys](https://github.com/settings/keys)
2. **New GPG key** をクリック
3. 以下の公開鍵をペースト

**公開鍵：**
```
-----BEGIN PGP PUBLIC KEY BLOCK-----

mQINBGlDZtcBEACsEkvg1X8ksfiM39kcLNQvNPRQz0TA/vhHZE4B1WKMVxie/hxA
l152+hje+GKUCwbmcKVW5HeiwdCrCwZl8N0fQfUImcyAC1Q4YAFrlAtCFOwpCI51
C4u5CfzVJyIDspVUla1d1EU0AVupPbcrmv6GMiAx28tqmO6KqIJqak3hFYiD/igc
hjQlTQHBpgpTxKt1iF5ReOrb+qJqHEcG3Kq7JWo62KQJsJxpS4qltbXnOxopkmY7
V3QcDHjPluMdnA0fOBG3N+0rgnvNCC+V6U4Itlqgi8LEk9GzMnEGCigIVEiMb+CW
2Q7/YKiOFzDzVYltM1NY27CM9eBb3ijeNTbneBptkCrDwsJV+F0x0b9s0cxHEjWY
Se0sf1RZ0r3qfldb0lB+8O9sL0nckCqe3l8TT/J9DDZXtvYjrFP1l2HKb0W+fbi0
nrY6w2VFXoJvTlQXQeXPXcMOt58UIeta6VHFUi7VG5nX9VgAP4Flb9wttncOCnks
AAGj0oI1hpPFoix0C3z/FKiB+VSP8But5s4tQwoov2/N6EJcDOUneL1lJYceQgxv
Wg3ZjupLK8XsfQTj37GXtewARbWiN4oU1CJDgLG0WzepIhSAvocZDIaSyHxRIBir
tYOS+mK2pjL9O3ErvMLwY6j41KqUF19LRL0ATnU0j6o25KK1yBbh8+OBjQARAQAB
tCNFbHlzaWFBSSA8ZWx5c2lhYWlAZWx5c2lhLWFpLmxvY2FsPokCWAQTAQgAQhYh
BHTKvl/JhtOU9vxnpAVuwkv/weR5BQJpQ2bXAxsvBAUJBaOagAULCQgHAgIiAgYV
CgkICwIEFgIDAQIeBwIXgAAKCRAFbsJL/8HkeRbMEACGzL8AuvXfy06JH9X2Jwc/
i6hzF3RkJH1S5V0wdWmuuRrLDDo7Qi0M1Q7rJl+vBSpHXMB7wp4KcsZDdUmO6BFi
jTpLmx68f6ZUbxxQZOxd1WUN6yb2sS/0GnOMD3StIskxmndL8JMMwDjcO4tmO3QO
l/Gpte1FYCOFFuGDJb8C+gu2XXiWmysg/kg5mrGL4hst/HHj6VeykvjyCkUjuGrk
AhJznCs+zUpoWffD60hNcKZL2bsNtyv5gtE61AR5tSC/LELLBfbu9IGoqfnquuvw
8g0/S4KZiFLRvKjjwU1iiRZEzT0LNaGVvJcgzUPa+KIMpFcXhkCIb7HQ8MF72Qnf
A/1AflEyjhpQgK8PCx/jQT1UqH/W7lMR/8/27k4LjEfC6J4tdSfbPxiSxa7ueLif
16ZvFE8GC6e9l8m3j3qBmjPUkQp7qYxFALXpr0DKn2DOPKS9KfDHJsaS92gE7YJs
KNILjKlAHbNVAE0NtZxAkPyLHfUnv5oDysY/TTdw37CbMBXuKFQFvU8gm67T7IAt
Nh+xwbEyv0r9K6QQKgB7csuCd5cOGI+bY8AkMrEPdINojh7+1JT8gSbczsRYFCbz
gOHDmRh8+v3ZHabRibeKyrE9asH6uTyMls1CYEsxIB2ghGBiOdc1XbWbj93PN3Eq
BTb8qC23NHOGZWUnmv1zhQ==
=gt1C
-----END PGP PUBLIC KEY BLOCK-----
```

#### GitLab の場合：
1. **User Settings > GPG Keys**
2. 同じ公開鍵を追加

## セキュリティ設定

✅ 設定済み：
- Git 自動署名有効: `commit.gpgsign = true`
- GPG プログラムパス設定完了
- RSA 4096ビット暗号化（強力）
- 3年有効期限

## コマンドリファレンス

### キー管理

```bash
# すべての秘密鍵を表示
gpg --list-secret-keys --keyid-format=long

# すべての公開鍵を表示
gpg --list-keys --keyid-format=long

# 公開鍵をエクスポート（ASCII形式）
gpg --armor --export 056EC24BFFC1E479

# 公開鍵をファイルに保存
gpg --armor --export 056EC24BFFC1E479 > public-key.asc
```

### コミット署名

```bash
# 署名付きコミット（自動有効）
git commit -m "message"

# 署名を確認
git log --show-signature

# コミットの署名検証
git verify-commit <commit-hash>

# 過去のコミットに署名を追加
git rebase --exec 'git commit --amend --no-edit -S' -i HEAD~<n>
```

### トラブルシューティング

| 問題 | 解決方法 |
|------|--------|
| `gpg: 署名に失敗しました` | `gpg --version` で GPG がインストールされているか確認 |
| `No secret key` | `gpg --list-secret-keys` でキーがあるか確認 |
| `signing failed: Inappropriate ioctl for device` | 環境変数 `GPG_TTY` を設定 |
| `pinentry-curses: Cannot find a suitable terminal` | `echo PINENTRY_USER_DATA=0` を .gnupg/gpg-agent.conf に追加 |

### GPG エージェント設定（Windows）

```powershell
# GPG エージェントのリスタート
Stop-Process -Name gpg-agent -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 新しいエージェントが自動起動されます
```

## パスフレーズ管理

### パスフレーズの変更

```bash
gpg --edit-key 056EC24BFFC1E479
gpg> passwd
gpg> quit
```

### パスフレーズの一時キャッシュ

```bash
# キャッシュ有効期限設定（~/.gnupg/gpg-agent.conf）
default-cache-ttl 3600
max-cache-ttl 86400
```

## リボケーション証明書

リボケーション証明書は以下に保存されています：
- Windows: `C:\Users\<username>\AppData\Roaming\gnupg\openpgp-revocs.d\`
- Linux: `~/.gnupg/openpgp-revocs.d/`

ファイル名: `74CABE5FC986D394F6FC67A4056EC24BFFC1E479.rev`

## 参考資料

- [GnuPG Official Manual](https://gnupg.org/documentation/)
- [GitHub GPG Keys Setup](https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-new-gpg-key-to-your-github-account)
- [GitLab GPG Keys](https://docs.gitlab.com/ee/user/project/repository/gpg_signed_commits/)
- [Git Commit Signing](https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work)
