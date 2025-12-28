# Cross-Platform Build Summary

## ✅ 対応完了

### デスクトップアプリ（Electron）

#### macOS
- ✅ Intel Mac (x64)
- ✅ Apple Silicon (arm64)  
- ✅ Universal Binary（両対応）

#### Windows
- ✅ 64-bit (x64)
- ✅ 32-bit (ia32) - レガシーシステム対応

#### Linux
- ✅ x64

### ゲームサーバー（Elysia + Bun）

#### macOS
- ✅ Intel (x64)
- ✅ Apple Silicon (arm64)

#### Windows
- ✅ 64-bit (x64)
- ✅ 32-bit (ia32) - レガシーシステム対応

#### Linux
- ✅ x64

### モバイルアプリ（React Native + Expo）

#### iOS
- ✅ iPhone (iOS 13.0+)
- ✅ iPad (iPadOS 13.0+)
- ✅ ARM64

#### Android
- ✅ Android 6.0+ (API 23+)
- ✅ ARM64-v8a, ARMv7, x86, x86_64

### ネイティブアプリ（Swift）

#### macOS
- ✅ Intel (x86_64) - macOS 13.0+
- ✅ Apple Silicon (arm64) - M1/M2/M3/M4

#### iOS
- ✅ ARM64 - iOS 16.0+

### ネイティブC++バインディング（Node.js Addon）

#### macOS
- ✅ Intel (x64)
- ✅ Apple Silicon (ARM64)
- ✅ Universal Binary

#### Windows
- ✅ 64-bit (x64)
- ✅ 32-bit (ia32)

#### Linux
- ✅ x64
- ✅ ARM64

### Docker（マルチアーキテクチャ）

#### サポート
- ✅ linux/amd64
- ✅ linux/arm64

---

## 🚀 ビルド方法

### クイックスタート

#### デスクトップアプリ

##### macOS Intel/Apple Silicon両対応（推奨）
```bash
# デスクトップアプリ
cd desktop
bun install
bun run build:mac:universal

# Swiftネイティブアプリ
cd swift
swift build -c release --arch arm64 --arch x86_64
```

##### Windows Intel PC対応
```bash
# デスクトップアプリ（64bit + 32bit両方）
cd desktop
bun install
bun run build:win

# または64bitのみ
bun run build:win:x64

# または32bitのみ
bun run build:win:ia32
```

#### ゲームサーバー

##### すべてのプラットフォーム
```bash
cd ElysiaAI/game
bun install
bun run build:all
```

##### macOS
```bash
# Intel版
bun run build:mac:intel

# Apple Silicon版
bun run build:mac:arm

# 両方
bun run build:mac
```

##### Windows Intel PC
```bash
# 64bit版
bun run build:win:x64

# すべて
bun run build:win
```

##### Linux
```bash
bun run build:linux
```

### ビルドスクリプト使用

#### デスクトップアプリ

##### PowerShell（Windows）
```powershell
# すべてのプラットフォーム
.\scripts\build-desktop.ps1 -Platform all

# macOS Universal Binary
.\scripts\build-desktop.ps1 -Platform mac-universal

# Windows 64bit
.\scripts\build-desktop.ps1 -Platform win-x64
```

##### Bash（macOS/Linux）
```bash
# すべてのプラットフォーム
./scripts/build-desktop.sh all

# macOS Universal Binary
./scripts/build-desktop.sh mac-universal

# Windows Intel PC
./scripts/build-desktop.sh win
```

#### ゲームサーバー

##### PowerShell（Windows）
```powershell
# すべてのプラットフォーム
.\scripts\build-game.ps1 -Platform all

# macOS Intel
.\scripts\build-game.ps1 -Platform mac-intel

# Windows 64bit
.\scripts\build-game.ps1 -Platform win-x64
```

##### Bash（macOS/Linux）
```bash
# すべてのプラットフォーム
./scripts/build-game.sh all

# macOS ARM
./scripts/build-game.sh mac-arm

# Linux
./scripts/build-game.sh linux
```

---

## 📦 配布パッケージ

### デスクトップアプリ（Electron）

#### macOS
- `Elysia-AI-{version}-universal.dmg` - **推奨**: Intel/ARM両対応
- `Elysia-AI-{version}-x64.dmg` - Intel Mac専用
- `Elysia-AI-{version}-arm64.dmg` - Apple Silicon専用

#### Windows
- `Elysia-AI-Setup-{version}.exe` - インストーラー（64bit + 32bit両対応）
- `Elysia-AI-{version}-win.exe` - ポータブル版

#### Linux
- `Elysia-AI-{version}.AppImage` - 単一実行ファイル
- `elysia-ai_{version}_amd64.deb` - Debian/Ubuntuパッケージ

### ゲームサーバー（Standalone）

#### macOS
- `elysia-game-mac-intel` - Intel Mac用（~50MB）
- `elysia-game-mac-arm64` - Apple Silicon用（~45MB）

#### Windows
- `elysia-game-win-x64.exe` - 64bit版（~55MB）
- `elysia-game-win-ia32.exe` - 32bit版（レガシー）

#### Linux
- `elysia-game-linux` - x64版（~48MB）

※ Bun runtimeが埋め込まれており、Node.js不要で動作します。

---

## 📖 詳細ドキュメント

### デスクトップアプリ
- [desktop/README_PLATFORM.md](desktop/README_PLATFORM.md) - Electronアプリビルド詳細

### ゲームサーバー
- [ElysiaAI/game/BUILD_PLATFORM.md](ElysiaAI/game/BUILD_PLATFORM.md) - ゲームサーバービルド詳細
- [ElysiaAI/game/DOCKER.md](ElysiaAI/game/DOCKER.md) - Dockerマルチアーキテクチャビルド
- [ElysiaAI/game/README.md](ElysiaAI/game/README.md) - ゲーム概要・API仕様
- [ElysiaAI/game/CLI_MANUAL.md](ElysiaAI/game/CLI_MANUAL.md) - CLIクライアント使用方法

### モバイルアプリ
- [mobile/BUILD_PLATFORM.md](mobile/BUILD_PLATFORM.md) - iOS/Androidビルド詳細
- [mobile/README.md](mobile/README.md) - モバイルアプリ概要

### ネイティブアプリ
- [swift/BUILD.md](swift/BUILD.md) - Swiftネイティブアプリビルド詳細

### ネイティブC++バインディング
- [native/BUILD_PLATFORM.md](native/BUILD_PLATFORM.md) - Node.js Addonビルド詳細

### Rust ライブラリ
- [rust/BUILD_PLATFORM.md](rust/BUILD_PLATFORM.md) - Rustライブラリビルド詳細
- [rust/package.json](rust/package.json) - Rustプロジェクト設定

### CI/CD
- [.github/workflows/cross-platform.yml](.github/workflows/cross-platform.yml) - 自動ビルドワークフロー

---

## ✨ 主な変更点

### デスクトップアプリ

#### [desktop/package.json](desktop/package.json)
- macOS: Intel/ARM/Universal対応ビルドスクリプト追加
- Windows: 64bit/32bit対応ビルドスクリプト追加
- アーキテクチャ別ビルドターゲット設定

#### [desktop/build/entitlements.mac.plist](desktop/build/entitlements.mac.plist)
- macOSアプリ署名用エンタイトルメント設定（新規作成）

#### [scripts/build-desktop.ps1](scripts/build-desktop.ps1)
- PowerShell用クロスプラットフォームビルドスクリプト（新規作成）

#### [scripts/build-desktop.sh](scripts/build-desktop.sh)
- Bash用クロスプラットフォームビルドスクリプト（新規作成）

### ゲームサーバー

#### [ElysiaAI/game/package.json](ElysiaAI/game/package.json)
- macOS: Intel/ARM対応ビルドスクリプト追加（新規作成）
- Windows: 64bit/32bit対応ビルドスクリプト追加
- Linux: x64対応ビルドスクリプト追加
- スタンドアロンバイナリビルド設定

#### [ElysiaAI/game/BUILD_PLATFORM.md](ElysiaAI/game/BUILD_PLATFORM.md)
- ゲームサーバークロスプラットフォームビルドガイド（新規作成）

#### [scripts/build-game.ps1](scripts/build-game.ps1)
- PowerShell用ゲームビルドスクリプト（新規作成）

#### [scripts/build-game.sh](scripts/build-game.sh)
- Bash用ゲームビルドスクリプト（新規作成）

### ネイティブアプリ

#### [swift/Package.swift](swift/Package.swift)
- Intel/ARM両対応を明示化

#### [swift/BUILD.md](swift/BUILD.md)
- macOS Intel/ARM対応ビルド手順を追加

---

## 🎯 実行環境

### デスクトップアプリ（Electron）

| プラットフォーム | アーキテクチャ | 最小OS | 推奨 |
|----------------|--------------|--------|------|
| macOS | Intel (x64) | 10.13+ | ✅ |
| macOS | Apple Silicon (ARM64) | 11.0+ | ✅✅ |
| macOS | Universal | 10.13+ | ⭐ |
| Windows | 64-bit (x64) | 10+ | ✅ |
| Windows | 32-bit (ia32) | 10+ | ⚠️ |
| Linux | x64 | Ubuntu 18.04+ | ✅ |

### ゲームサーバー（Standalone）

| プラットフォーム | アーキテクチャ | 最小OS | 推奨 | サイズ |
|----------------|--------------|--------|------|--------|
| macOS | Intel (x64) | 10.15+ | ✅ | ~50MB |
| macOS | Apple Silicon (ARM64) | 11.0+ | ✅✅ | ~45MB |
| Windows | 64-bit (x64) | 10+ | ✅ | ~55MB |
| Windows | 32-bit (ia32) | 10+ | ⚠️ | ~55MB |
| Linux | x64 | Ubuntu 20.04+ | ✅ | ~48MB |

### モバイルアプリ（React Native + Expo）

| プラットフォーム | 最小バージョン | アーキテクチャ | 推奨 |
|----------------|---------------|--------------|------|
| iOS | 13.0 | ARM64 | ✅ |
| Android | 6.0 (API 23) | ARM64-v8a, ARMv7 | ✅ |

### ネイティブアプリ（Swift）

| プラットフォーム | アーキテクチャ | 最小OS | 推奨 |
|----------------|--------------|--------|------|
| macOS | Intel (x86_64) | 13.0+ | ✅ |
| macOS | Apple Silicon (arm64) | 13.0+ | ✅✅ |
| iOS | ARM64 | 16.0+ | ✅ |

### ネイティブC++バインディング（Node.js Addon）

| プラットフォーム | アーキテクチャ | Node.js | 推奨 |
|----------------|--------------|---------|------|
| macOS | x64, ARM64, Universal | 18+ | ✅ |
| Windows | x64, ia32 | 18+ | ✅ |
| Linux | x64, ARM64 | 18+ | ✅ |

### Rust ライブラリ

| プラットフォーム | アーキテクチャ | 最小OS | 推奨 |
|----------------|--------------|--------|------|
| macOS | x86_64, arm64 | 10.15+ | ✅ |
| Windows | x64, ia32 | 10+ | ✅ |
| Linux | x64, ARM64 | Ubuntu 20.04+ | ✅ |

⭐ = 最推奨  
✅✅ = 強く推奨  
✅ = 推奨  
⚠️ = レガシーサポート
