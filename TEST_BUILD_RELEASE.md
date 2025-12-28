# Test & Release Automation Summary

## 実行方法

### Windows (PowerShell)

```powershell
# すべて実行
.\scripts\run-all.ps1

# テストのみ
.\scripts\run-all.ps1 -Action test

# ビルドのみ
.\scripts\run-all.ps1 -Action build

# リリース作成
.\scripts\run-all.ps1 -Action release -Version 1.0.0

# Docker なしでビルド
.\scripts\run-all.ps1 -Action build -SkipDocker $true
```

### Linux/macOS (Bash)

```bash
# すべて実行
./scripts/run-all.sh

# テストのみ
./scripts/run-all.sh test

# ビルドのみ
./scripts/run-all.sh build

# リリース作成
./scripts/run-all.sh release 1.0.0

# Docker スキップ
SKIP_DOCKER=true ./scripts/run-all.sh build
```

---

## 自動実行内容

### 1️⃣ テスト実行（run_tests）

```
✅ Rust library tests         → cargo test --release
✅ Native addon tests         → npm test
✅ Desktop app tests          → npm test
```

### 2️⃣ ビルド実行（run_build）

```
✅ Rust library build         → cargo build --release
✅ WebAssembly build          → wasm-pack build --release
✅ Desktop app build          → npm run build:release
✅ Game server build          → bun run build:standalone
```

### 3️⃣ Docker イメージビルド（build_docker）

```
✅ Multi-arch support         → docker buildx (linux/amd64,arm64)
✅ Game server image          → elysia-game:latest
✅ Tag versioning             → elysia-game:1.0.0
```

### 4️⃣ リリース準備（create_release）

```
✅ Git tag 作成               → git tag -a v1.0.0
✅ リモート push              → git push origin v1.0.0
✅ GitHub Actions トリガー    → .github/workflows/release.yml
```

---

## 環境要件

### 必須

- Git 2.x+
- Node.js 18+
- npm 9+

### オプション（機能別）

| 機能 | 必須ツール |
|------|-----------|
| Rust テスト | `cargo` (Rust) |
| WASM ビルド | `wasm-pack` |
| Game Server | `bun` |
| Docker | `docker`, `docker buildx` |

---

## トラブルシューティング

### スクリプトが実行されない

```powershell
# PowerShell 実行ポリシー設定
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 前提条件インストール

```powershell
# ENVIRONMENT_SETUP.md を参照
Get-Content ENVIRONMENT_SETUP.md
```

### 各コマンド個別実行

```powershell
# テストスキップ
.\scripts\run-all.ps1 -Action build -SkipDocker $true

# ビルドスキップ
.\scripts\run-all.ps1 -Action test
```

---

## リリース後の自動処理

GitHub Actions ワークフロー自動実行：

1. **release.yml** - アーティファクト生成・公開
2. **docker-push.yml** - Docker Hub プッシュ
3. **security.yml** - セキュリティスキャン

詳細は以下のファイルを参照：
- [.github/workflows/release.yml](.github/workflows/release.yml)
- [.github/workflows/docker-push.yml](.github/workflows/docker-push.yml)
- [.github/workflows/security.yml](.github/workflows/security.yml)
