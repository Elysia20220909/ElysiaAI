# Elysia AI - クロスプラットフォーム対応ガイド

## サポートプラットフォーム

### macOS
- **Intel Mac (x64)**: macOS 10.13以降
- **Apple Silicon (ARM64)**: macOS 11.0以降
- **Universal Binary**: Intel・Apple Siliconの両方に対応

### Windows
- **64-bit (x64)**: Windows 10以降
- **32-bit (ia32)**: Windows 10以降（レガシーシステム対応）

### Linux
- **x64**: Ubuntu 18.04以降、または同等のディストリビューション

## ビルド方法

### macOS向けビルド

#### Intel Mac用
```bash
cd desktop
bun install
bun run build:mac:intel
```

#### Apple Silicon (M1/M2/M3) 用
```bash
cd desktop
bun install
bun run build:mac:arm
```

#### Universal Binary（推奨）
Intel・Apple Siliconの両方で動作する単一アプリケーション:
```bash
cd desktop
bun install
bun run build:mac:universal
```

#### すべてのmacOS形式
```bash
cd desktop
bun install
bun run build:mac
```

### Windows向けビルド

#### 64-bit版（推奨）
```bash
cd desktop
bun install
bun run build:win:x64
```

#### 32-bit版（レガシーシステム向け）
```bash
cd desktop
bun install
bun run build:win:ia32
```

#### 両方のアーキテクチャ
```bash
cd desktop
bun install
bun run build:win
```

### Linux向けビルド
```bash
cd desktop
bun install
bun run build:linux
```

### すべてのプラットフォーム向けビルド
```bash
cd desktop
bun install
bun run build:all
```

## Swift ネイティブアプリ（iOS/macOS）

### 必要要件
- Xcode 15.0以降
- Swift 6.0以降
- macOS 13.0以降（開発環境）

### ビルド方法

#### macOS向けCLI
```bash
cd swift
swift build -c release
```

#### iOS向け（Xcodeプロジェクト生成）
```bash
cd swift
swift package generate-xcodeproj
open ElysiaAI.xcodeproj
```

### サポートプラットフォーム
- iOS 16.0以降
- macOS 13.0以降（Intel/Apple Silicon両対応）

## アーキテクチャ詳細

### macOS
- **x64**: Intel Core プロセッサ搭載Mac
- **arm64**: Apple Silicon (M1/M2/M3/M4) プロセッサ搭載Mac
- **universal**: 両方のアーキテクチャを含むFat Binary

### Windows
- **x64**: 64ビットIntel/AMD プロセッサ
- **ia32**: 32ビットIntel/AMD プロセッサ（レガシー対応）

### Linux
- **x64**: 64ビットx86プロセッサ

## 配布パッケージ形式

### macOS
- **DMG**: macOS標準のディスクイメージ
- **ZIP**: 圧縮アーカイブ（手動配布向け）

### Windows
- **NSIS**: インストーラー（推奨）
- **Portable**: インストール不要の実行可能ファイル

### Linux
- **AppImage**: 単一実行ファイル（推奨）
- **DEB**: Debian/Ubuntu向けパッケージ

## 実行方法

### 開発モード
```bash
cd desktop
bun install
bun run start
```

### ビルド済みアプリケーション

#### macOS
1. DMGファイルをマウント
2. アプリケーションを「アプリケーション」フォルダにドラッグ
3. 初回起動時は右クリック→「開く」でGatekeeper警告を回避

#### Windows
- NSISインストーラーを実行してインストール
- またはPortable版を任意の場所に展開して実行

#### Linux
- AppImageファイルに実行権限を付与: `chmod +x Elysia-AI-*.AppImage`
- ダブルクリックまたは `./Elysia-AI-*.AppImage` で実行

## トラブルシューティング

### macOS
- **「開発元が未確認」エラー**: システム環境設定 → セキュリティとプライバシー → 「このまま開く」
- **Universal Binary推奨**: Intel Macでも動作する最も互換性の高いビルド

### Windows
- **32bit/64bit判別**: タスクマネージャーでシステムタイプを確認
- **古いPC**: 32bit版（ia32）を使用

### Linux
- **依存関係エラー**: `libgtk-3-0`などのパッケージをインストール
- **AppImage実行権限**: `chmod +x`を必ず実行

## 関連リンク
- [Electron公式ドキュメント](https://www.electronjs.org/)
- [Swift Package Manager](https://swift.org/package-manager/)
- [electron-builderドキュメント](https://www.electron.build/)
