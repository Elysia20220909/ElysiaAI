# Rust TCP/IP Stack - セットアップガイド

## 前提条件

### Rustのインストール

このプロジェクトをビルドする前に、Rustをインストールする必要があります。

#### Windowsの場合

1. [Rust公式サイト](https://www.rust-lang.org/tools/install)から`rustup-init.exe`をダウンロード
2. ダウンロードした実行ファイルを実行
3. デフォルト設定でインストール
4. PowerShellまたはコマンドプロンプトを再起動

または、PowerShellで以下を実行：

```powershell
# Rust公式インストーラーをダウンロードして実行
Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "rustup-init.exe"
.\rustup-init.exe
```

#### Linux/macOSの場合

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### インストールの確認

```bash
rustc --version
cargo --version
```

## プロジェクトのビルド

### 依存関係のインストールとビルド

```bash
cd rust
cargo build
```

### リリースビルド（最適化有効）

```bash
cargo build --release
```

## テストの実行

### 全テストを実行

```bash
cargo test
```

### 詳細な出力でテストを実行

```bash
cargo test -- --nocapture
```

### 特定のテストを実行

```bash
# Ethernetレイヤーのテスト
cargo test network::ethernet

# IPレイヤーのテスト
cargo test network::ip

# TCPレイヤーのテスト
cargo test network::tcp

# 統合テスト
cargo test --test network_integration_test
```

## デモプログラムの実行

```bash
cargo run --example tcp_ip_demo
```

出力例：
```
=== TCP/IP Stack Demo ===

1. Ethernet Frame Example
  Source MAC: 00:11:22:33:44:55
  Destination MAC: ff:ff:ff:ff:ff:ff
  EtherType: Ipv4
  Frame size: 18 bytes

2. IPv4 Packet Example
  Source IP: 192.168.1.100
  Destination IP: 192.168.1.1
  Protocol: Tcp
  TTL: 64
  Packet size: 24 bytes
  Checksum valid: true

...
```

## トラブルシューティング

### エラー: "cargo: command not found"

- Rustがインストールされていない、またはPATHが設定されていません
- ターミナルを再起動してPATHを更新してください
- 手動でPATHを設定：
  - Windows: `%USERPROFILE%\.cargo\bin`をPATHに追加
  - Linux/macOS: `~/.cargo/bin`をPATHに追加

### ビルドエラー: リンカーエラー

Windowsの場合、Visual Studio Build Toolsが必要です：

1. [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)をダウンロード
2. "Desktop development with C++"ワークロードを選択してインストール

または、MSVCの代わりにGNU toolchainを使用：

```bash
rustup default stable-x86_64-pc-windows-gnu
```

### 依存関係のエラー

```bash
# Cargoのキャッシュをクリア
cargo clean

# 再ビルド
cargo build
```

## 開発環境のセットアップ

### 推奨VSCode拡張機能

- `rust-analyzer` - Rust言語サポート
- `CodeLLDB` - デバッガー
- `Better TOML` - Cargo.tomlの編集サポート
- `crates` - 依存関係管理

### VSCodeでのデバッグ設定

`.vscode/launch.json`を作成：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug TCP/IP Demo",
      "cargo": {
        "args": [
          "build",
          "--example=tcp_ip_demo"
        ]
      },
      "args": [],
      "cwd": "${workspaceFolder}/rust"
    }
  ]
}
```

## コードフォーマットとリント

### コードフォーマット

```bash
cargo fmt
```

### リントチェック

```bash
cargo clippy
```

### ドキュメント生成

```bash
cargo doc --open
```

## パフォーマンステスト

### ベンチマークの実行

```bash
cargo bench
```

### プロファイリング

```bash
# flamegraphを使用したプロファイリング
cargo install flamegraph
cargo flamegraph --example tcp_ip_demo
```

## さらなる情報

- [Rust Book（日本語版）](https://doc.rust-jp.rs/book-ja/)
- [Cargo Book](https://doc.rust-lang.org/cargo/)
- [プロジェクトのTCP/IP実装詳細](./README_TCPIP.md)

## ライセンス

AGPL-3.0-or-later
