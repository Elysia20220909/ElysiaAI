# Elysia Rust - Cross-Platform Build Guide

## サポートプラットフォーム

### macOS
- **Intel (x64)**: macOS 10.15以降
- **Apple Silicon (ARM64)**: macOS 11.0以降
- **Universal Binary**: 両アーキテクチャ統合バイナリ

### Windows
- **64-bit (x64)**: Windows 10/11
- **32-bit (ia32)**: Windows 10/11（レガシー対応）

### Linux
- **x64**: Ubuntu 20.04+, Debian 10+, CentOS 8+
- **ARM64**: Linux on ARM

---

## 必要要件

### 共通
- **Rust**: 1.70以降
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

### macOS
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```
- ターゲットのインストール:
  ```bash
  rustup target add x86_64-apple-darwin
  rustup target add aarch64-apple-darwin
  ```

### Windows
- **Visual Studio Build Tools 2022** または **Visual Studio 2022**
  - C++ Workload
  - Windows SDK
- ターゲットのインストール:
  ```powershell
  rustup target add x86_64-pc-windows-msvc
  rustup target add i686-pc-windows-msvc
  ```

### Linux
```bash
# Ubuntu/Debian
sudo apt-get install -y build-essential
rustup target add x86_64-unknown-linux-gnu
rustup target add aarch64-unknown-linux-gnu  # ARM64の場合
```

---

## ビルド方法

### 基本的なビルド

```bash
# デフォルト（リリースビルド）
cargo build --release

# デバッグビルド
cargo build

# すべてのターゲット
cargo build --all-targets
```

### プラットフォーム固有ビルド

#### macOS
```bash
# Intel のみ
cargo build --target x86_64-apple-darwin --release

# Apple Silicon のみ
cargo build --target aarch64-apple-darwin --release

# Universal Binary（両アーキテクチャ）
cargo build --target x86_64-apple-darwin --release
cargo build --target aarch64-apple-darwin --release
lipo -create \
    target/x86_64-apple-darwin/release/libelysia_rust.dylib \
    target/aarch64-apple-darwin/release/libelysia_rust.dylib \
    -output target/release/libelysia_rust.dylib
```

#### Windows
```bash
# 64-bit
cargo build --target x86_64-pc-windows-msvc --release

# 32-bit（オプション）
cargo build --target i686-pc-windows-msvc --release
```

#### Linux
```bash
# x64
cargo build --target x86_64-unknown-linux-gnu --release

# ARM64（クロスコンパイル）
rustup target add aarch64-unknown-linux-gnu
cargo build --target aarch64-unknown-linux-gnu --release
```

### スクリプト使用（推奨）

#### Bash/Linux
```bash
chmod +x scripts/build.sh

# すべてのプラットフォーム
./scripts/build.sh all release

# 特定プラットフォーム
./scripts/build.sh mac release
./scripts/build.sh win release
./scripts/build.sh linux release
```

#### PowerShell/Windows
```powershell
.\scripts\build.ps1 -Platform all -BuildType release
.\scripts\build.ps1 -Platform mac -BuildType release
.\scripts\build.ps1 -Platform win -BuildType release
```

### npm スクリプト

```bash
# リリースビルド
npm run build:release

# プラットフォーム固有
npm run build:mac
npm run build:win:x64
npm run build:win:ia32
npm run build:linux
npm run build:linux:arm64

# Universal Binary (macOS)
npm run build:mac:universal
```

---

## テスト

```bash
# ユニットテスト実行
cargo test

# すべての機能でテスト
cargo test --all-features

# 特定のテストを実行
cargo test text_processor

# ベンチマーク
cargo bench
```

---

## リント・フォーマット

```bash
# Clippy (linter)
cargo clippy --all-targets --all-features

# フォーマット確認
cargo fmt --check

# 自動フォーマット
cargo fmt
```

---

## 出力ファイル

### macOS
```
target/x86_64-apple-darwin/release/libelysia_rust.dylib
target/aarch64-apple-darwin/release/libelysia_rust.dylib
target/release/libelysia_rust.dylib (Universal Binary)
```

### Windows
```
target\x86_64-pc-windows-msvc\release\elysia_rust.dll
target\i686-pc-windows-msvc\release\elysia_rust.dll
```

### Linux
```
target/x86_64-unknown-linux-gnu/release/libelysia_rust.so
target/aarch64-unknown-linux-gnu/release/libelysia_rust.so
```

---

## トラブルシューティング

### Rustのアップデート
```bash
rustup update
```

### ターゲットが見つからない
```bash
# 利用可能なターゲット確認
rustup target list

# 必要なターゲットをインストール
rustup target add <target>
```

### クロスコンパイルの問題
```bash
# cargo-xwin を使用（Windows/macOS → 異なるアーキテクチャ）
cargo install cargo-xwin
cargo xwin build --target x86_64-pc-windows-msvc
```

### ビルドキャッシュのクリア
```bash
cargo clean
cargo build --release
```

---

## 配布

### Crates.io への公開
```bash
cargo publish
```

### バイナリの配布
1. `target/release/` 内のバイナリを収集
2. プラットフォーム別にパッケージ化
3. GitHub Releases または S3 にアップロード

### ドキュメント生成
```bash
cargo doc --open
```

---

## 最適化設定

### Cargo.toml の Release プロフィール
```toml
[profile.release]
opt-level = 3          # 最大最適化
lto = true            # リンク時最適化
codegen-units = 1     # シングルスレッド（より最適化）
strip = true          # シンボルを削除
```

### 環境変数
```bash
# ネイティブ CPU に最適化
RUSTFLAGS="-C target-cpu=native" cargo build --release

# 追加の最適化
RUSTFLAGS="-C link-arg=-fuse-ld=lld" cargo build --release
```

---

## 関連リソース

- [Rust Official Guide](https://doc.rust-lang.org/book/)
- [Cargo Documentation](https://doc.rust-lang.org/cargo/)
- [Cross-Platform Compilation](https://rust-lang.github.io/rustup/cross-compilation.html)
- [rust-lang/cc-rs](https://github.com/rust-lang/cc-rs) - C/C++ コンパイル

---

## サポート

問題が発生した場合:
1. [Rust Discord](https://discord.com/invite/rust-lang)
2. [Stack Overflow - Rust タグ](https://stackoverflow.com/questions/tagged/rust)
3. [Elysia GitHub Issues](https://github.com/Elysia20220909/ElysiaAI/issues)
