# Swift Build Guide - Windows, macOS (Intel/ARM)

## サポートプラットフォーム

### macOS
- **Intel (x86_64)**: macOS 13.0以降
- **Apple Silicon (arm64)**: M1/M2/M3/M4、macOS 13.0以降
- **Universal Binary**: 両アーキテクチャ対応の単一バイナリ

### iOS
- **arm64**: iOS 16.0以降

### Windows
- **x64**: Windows 10/11 (Intel/AMD 64bit)

---

## macOS ビルド方法

### 自動アーキテクチャ判定（推奨）
```bash
cd swift
swift build -c release
```
実行環境に応じて自動的に最適なバイナリを生成します。

### アーキテクチャ指定ビルド

#### Apple Silicon (ARM64) 用
```bash
swift build -c release --arch arm64
```

#### Intel (x86_64) 用
```bash
swift build -c release --arch x86_64
```

#### Universal Binary（両対応）
```bash
swift build -c release --arch arm64 --arch x86_64
```

### Xcodeでビルド
```bash
swift package generate-xcodeproj
open ElysiaAI.xcodeproj
```

Xcode内で `⌘+B` でビルド、`⌘+R` で実行。

### ビルド確認
```bash
# アーキテクチャの確認
lipo -info .build/release/ElysiaAICLI

# 出力例: Architectures in the fat file are: x86_64 arm64
```

---

## Windows ビルド方法

## 前提条件

Swift for Windowsをビルドするには、以下が必要です：

1. **Visual Studio 2022 Community** (インストール済み ✅)

   - Windows 11 SDK (22621)
   - C++ build tools (x86, x64, ARM64)

2. **Swift 6.2.1 Toolchain** (インストール済み ✅)

3. **Developer Command Prompt環境**

## ビルド方法

### 方法1: Developer Command Prompt for VS 2022を使用

```cmd
# スタートメニューから「Developer Command Prompt for VS 2022」を起動
cd C:\Users\hosih\elysia-ai\swift
swift build -c release
```

### 方法2: PowerShell実行ポリシーを変更

```powershell
# 管理者権限でPowerShellを起動
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# VS Dev環境をロード
& "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\Launch-VsDevShell.ps1" -Arch amd64

# ビルド実行
cd C:\Users\hosih\elysia-ai\swift
swift build -c release
```

### 方法3: 環境変数を手動設定

```powershell
# MSVC環境変数を設定
$env:Path += ";C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64"
$env:INCLUDE = "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.44.35207\include"
$env:LIB = "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.44.35207\lib\x64"

# ビルド
swift build -c release
```

## ビルド成果物

成功すると以下に生成されます：

```plaintext
.build/release/ElysiaAICLI.exe
```

## 実行方法

```powershell
# 環境変数でエリシアサーバーURLを設定
$env:ELYSIA_URL = "http://localhost:3000"

# CLI実行
.\.build\release\ElysiaAICLI.exe
```

## トラブルシューティング

### エラー: `unable to load standard library`

**原因**: Swift標準ライブラリが見つからない

**解決策**: Developer Command Prompt for VS 2022を使用してください

### エラー: `could not find CLI tool 'link'`

**原因**: MSVCリンカーがパスに存在しない

**解決策**: VS Developer環境を正しくロードしてください

## 現在の状態

- ✅ Swift 6.2.1インストール完了
- ✅ Visual Studio 2022インストール完了
- ✅ SwiftコードのRAG URLバグ修正完了 (deb8398)
- ⏸️ ビルドにはDeveloper Command Prompt環境が必要

## 次のステップ

1. Developer Command Prompt for VS 2022を開く
2. `swift build -c release`を実行
3. ビルド成功を確認
4. CLIツールをテスト
