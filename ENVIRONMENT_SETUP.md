# 環境セットアップガイド

## 前提条件のインストール

### 1. Rust のインストール

```powershell
# Windows: rustup をインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o rustup-init.exe
.\rustup-init.exe -y

# または Chocolatey を使用
choco install rust

# インストール確認
cargo --version
rustup --version
```

### 2. Bun のインストール

```powershell
# Windows: PowerShell で実行
iwr https://bun.sh/install.ps1 | iex

# または npm から
npm install -g bun

# インストール確認
bun --version
```

### 3. Docker のインストール

```powershell
# Docker Desktop for Windows
choco install docker-desktop

# WSL2 (推奨)
wsl --install

# インストール確認
docker --version
docker buildx version
```

### 4. wasm-pack のインストール

```powershell
# Rust がインストール済みの場合
cargo install wasm-pack

# または npm から
npm install -g wasm-pack

# インストール確認
wasm-pack --version
```

---

## セットアップ完了後のテスト実行

すべての前提条件がインストール完了したら、以下を実行：

```powershell
# テストスクリプト実行
.\scripts\run-tests.ps1
```

---

## トラブルシューティング

### Cargo/Rustが見つからない

```powershell
# rustup PATH更新
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
```

### Bun が見つからない

```powershell
# インストール場所確認
where.exe bun

# または npm から実行
npm run test
```

### WSL/Docker 関連エラー

```powershell
# WSL2 有効化
wsl --set-default-version 2

# Docker daemon 起動
Start-Service docker

# or Docker Desktop アプリから起動
```
