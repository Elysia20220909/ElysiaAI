# Elysia AI - Tauri Desktop App

AIRI インスパイアの軽量・高速・セキュアなデスクトップアプリ（Rust + Tauri）。

## 特徴

- **軽量**: Electron の 1/3 のメモリ使用量
- **高速**: Rust バックエンドで高速起動
- **セキュア**: プロセス分離とサンドボックス
- **クロスプラットフォーム**: Windows / macOS / Linux 対応

## セットアップ

### 前提条件

- Rust (https://rustup.rs/)
- Node.js 18+

### インストール

```bash
cd tauri-app
npm install  # または: bun install
```

## 開発

### サーバーを起動

まずプロジェクトルートで Elysia サーバーを起動:

```bash
# ルートディレクトリで
bun run dev
```

### Tauri アプリを起動

```bash
cd tauri-app
npm run dev
```

デバッグウィンドウが自動的に開き、`http://localhost:3000/demo-airi.html` が読み込まれます。

## ビルド

### 開発ビルド（デバッグ）

```bash
npm run build:debug
```

### 本番ビルド

```bash
npm run build
```

ビルド成果物は `src-tauri/target/release/bundle/` に生成されます。

## アーキテクチャ

```
tauri-app/
├── package.json          # Node.js 依存関係
├── tauri.conf.json       # Tauri 設定
├── icons/                # アプリアイコン
└── src-tauri/
    ├── Cargo.toml        # Rust 依存関係
    ├── build.rs          # ビルドスクリプト
    └── src/
        ├── main.rs       # Rust メインプロセス
        └── lib.rs        # ライブラリコード
```

### IPC コマンド

- `get_app_version()`: アプリバージョン取得
- `ping_server(url)`: サーバー接続確認

## Electron との比較

| 項目             | Tauri      | Electron    |
| ---------------- | ---------- | ----------- |
| バイナリサイズ   | ~3-5 MB    | ~50-100 MB  |
| メモリ使用量     | ~50-100 MB | ~150-300 MB |
| 起動速度         | ~0.5 秒    | ~2-3 秒     |
| バックエンド言語 | Rust       | Node.js     |

## トラブルシューティング

### ビルドエラー

```bash
# Rust ツールチェーン更新
rustup update

# 依存関係再インストール
cd src-tauri
cargo clean
cargo build
```

### アイコンが表示されない

`icons/` ディレクトリに以下のサイズの PNG を配置:

- 32x32
- 128x128
- 256x256 (推奨)
- icon.png (1024x1024)

## 参考

- [Tauri Documentation](https://tauri.app/)
- [AIRI Project](https://github.com/moeru-ai/airi)
