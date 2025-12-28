# Elysia Native - C++ Node.js Addon Cross-Platform Build Guide

## サポートプラットフォーム

### macOS
- **Intel (x64)**: macOS 10.15以降
- **Apple Silicon (ARM64)**: macOS 11.0以降
- **Universal Binary**: 両アーキテクチャ対応

### Windows
- **64-bit (x64)**: Windows 10/11
- **32-bit (ia32)**: Windows 10/11（レガシー対応）

### Linux
- **x64**: Ubuntu 20.04以降、Debian 10以降、または同等

---

## 必要要件

### 共通
- **Node.js**: 18.x以降
- **Python**: 3.x（node-gyp用）

### macOS
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```

### Windows
- **Visual Studio Build Tools 2022** (無料):
  - Desktop development with C++
  - Windows 10/11 SDK
  - MSVC v143 build tools

  インストール:
  ```powershell
  # Chocolateyの場合
  choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"
  
  # 公式インストーラー
  https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
  ```

### Linux
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y build-essential python3

# Fedora/RHEL
sudo dnf install gcc-c++ make python3
```

---

## セットアップ

### 1. node-gypインストール

```bash
# グローバルインストール（推奨）
npm install -g node-gyp

# または、プロジェクト内
npm install --save-dev node-gyp
```

### 2. 依存関係インストール

```bash
cd native
npm install
```

自動的にビルドが実行されます（`install`スクリプト）。

---

## ビルド方法

### 標準ビルド

```bash
cd native

# リリースビルド（最適化あり）
npm run build:release

# デバッグビルド（デバッグ情報付き）
npm run build:debug

# または
npm run build
```

### プラットフォーム別ビルド

#### macOS Universal Binary
```bash
# Intel + Apple Silicon両対応
npm run build:mac
```

出力: `build/Release/elysia_native.node`（Universal Binary）

#### Windows

##### 64-bit版
```bash
npm run build:win:x64
```

##### 32-bit版
```bash
npm run build:win:ia32
```

#### Linux
```bash
npm run build:linux
```

### クリーンビルド

```bash
# ビルド成果物を削除
npm run clean

# クリーン後、再ビルド
npm run rebuild
```

---

## 動作確認

### テスト実行

```bash
cd native
npm test
# または
node index.js
```

### 使用例

```javascript
const native = require('./native');

// テキスト処理（C++で高速化）
const result = native.processText('Hello, Elysia!');
console.log(result);
```

---

## クロスコンパイル

### macOS上でUniversal Binaryビルド

```bash
# 自動的に両アーキテクチャをビルド
npm run build:mac

# 確認
lipo -info build/Release/elysia_native.node
# 出力例: Architectures in the fat file: x86_64 arm64
```

### Windows上で異なるアーキテクチャをビルド

```powershell
# 64-bit版
npm run build:win:x64

# 32-bit版（別途32bit Node.jsが必要）
npm run build:win:ia32
```

---

## CI/CD統合

### GitHub Actions例

```yaml
name: Build Native Addon

on: [push, pull_request]

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      
      - uses: actions/setup-python@v4
        with:
          python-version: '3.x'
      
      - name: Install dependencies
        run: |
          cd native
          npm install
      
      - name: Build
        run: |
          cd native
          npm run build:release
      
      - name: Test
        run: |
          cd native
          npm test
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: addon-${{ matrix.os }}-node${{ matrix.node }}
          path: native/build/Release/*.node
```

---

## トラブルシューティング

### macOS

#### Xcode License Agreement エラー
```bash
sudo xcodebuild -license accept
```

#### アーキテクチャミスマッチ
```bash
# 現在のNode.jsアーキテクチャ確認
node -p "process.arch"

# ビルドしたアドオンのアーキテクチャ確認
lipo -info build/Release/elysia_native.node
```

### Windows

#### Python見つからないエラー
```powershell
# Python 3.xをインストール
winget install Python.Python.3

# node-gypにPythonパス指定
npm config set python "C:\Python3\python.exe"
```

#### Visual Studio見つからない
```powershell
# VS Build Toolsのインストール確認
where cl.exe

# Developer Command Promptから実行
# または
npm config set msvs_version 2022
```

#### MSBuild エラー
```powershell
# キャッシュクリア
npm run clean
npm cache clean --force

# 再インストール
npm install
```

### Linux

#### `gyp: Permission denied` エラー
```bash
# ビルドディレクトリの権限修正
chmod -R 755 build/
```

#### コンパイラエラー
```bash
# C++17サポート確認
g++ --version  # 7.x以降推奨

# アップデート
sudo apt-get install g++-11
```

---

## パフォーマンス最適化

### リリースビルド設定

```json
// package.json
{
  "scripts": {
    "build:release": "node-gyp configure --release && node-gyp build --release"
  }
}
```

### コンパイラ最適化（binding.gyp）

```json
{
  "targets": [{
    "configurations": {
      "Release": {
        "msvs_settings": {
          "VCCLCompilerTool": {
            "Optimization": 2,
            "InlineFunctionExpansion": 2
          }
        },
        "xcode_settings": {
          "GCC_OPTIMIZATION_LEVEL": "3"
        },
        "cflags": ["-O3"]
      }
    }
  }]
}
```

---

## 配布

### npm パッケージとして配布

```json
// package.json
{
  "name": "elysia-native",
  "version": "1.0.0",
  "main": "index.js",
  "binary": {
    "module_name": "elysia_native",
    "module_path": "./build/Release/",
    "host": "https://github.com/youruser/elysia-native/releases/download/"
  },
  "scripts": {
    "install": "node-gyp rebuild || node-pre-gyp install"
  }
}
```

### プリビルドバイナリ（node-pre-gyp）

```bash
# node-pre-gypインストール
npm install --save-dev @mapbox/node-pre-gyp

# ビルド
npx node-pre-gyp build

# パッケージ化
npx node-pre-gyp package

# S3やGitHub Releasesにアップロード
npx node-pre-gyp publish
```

---

## アーキテクチャ対応状況

| プラットフォーム | x64 | ia32 | ARM64 | Universal |
|----------------|-----|------|-------|-----------|
| macOS | ✅ | - | ✅ | ✅ |
| Windows | ✅ | ✅ | ⚠️ | - |
| Linux | ✅ | ✅ | ✅ | - |

✅ = 完全対応  
⚠️ = 実験的サポート  
\- = 非対応

---

## 関連リンク

- [node-gyp公式ドキュメント](https://github.com/nodejs/node-gyp)
- [Node-API (N-API)](https://nodejs.org/api/n-api.html)
- [node-addon-api](https://github.com/nodejs/node-addon-api)
- [node-pre-gyp](https://github.com/mapbox/node-pre-gyp)

---

**Last Updated**: 2025-12-25  
**Version**: 1.0.0
