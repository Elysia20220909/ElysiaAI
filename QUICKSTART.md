# Elysia AI - Getting Started Guide

## クイックスタート

### システム要件

| 対応OS | 推奨 | 最小 |
|--------|------|------|
| macOS | Apple Silicon M1+ | Intel i5, 8GB RAM |
| Windows | Windows 11 | Windows 10, 8GB RAM |
| Linux | Ubuntu 20.04+ | Ubuntu 18.04, 4GB RAM |

### インストール

#### 1. Desktop App (Electron)

**macOS:**
```bash
# Intel Mac
wget https://github.com/Elysia20220909/ElysiaAI/releases/latest/download/elysia-macos-x64.dmg
open elysia-macos-x64.dmg

# Apple Silicon
wget https://github.com/Elysia20220909/ElysiaAI/releases/latest/download/elysia-macos-arm64.dmg
open elysia-macos-arm64.dmg
```

**Windows:**
```bash
# 64-bit
wget https://github.com/Elysia20220909/ElysiaAI/releases/latest/download/elysia-windows-x64.exe
elysia-windows-x64.exe
```

**Linux:**
```bash
wget https://github.com/Elysia20220909/ElysiaAI/releases/latest/download/elysia-linux-x64.AppImage
chmod +x elysia-linux-x64.AppImage
./elysia-linux-x64.AppImage
```

#### 2. Game Server (Standalone)

```bash
# macOS
wget https://github.com/Elysia20220909/ElysiaAI/releases/latest/download/game-server-macos
chmod +x game-server-macos
./game-server-macos

# Windows
wget https://github.com/Elysia20220909/ElysiaAI/releases/latest/download/game-server-windows.exe
game-server-windows.exe

# Linux
wget https://github.com/Elysia20220909/ElysiaAI/releases/latest/download/game-server-linux
chmod +x game-server-linux
./game-server-linux
```

#### 3. Rust Library

```bash
cargo add elysia-rust
```

#### 4. Node.js Native Addon

```bash
npm install elysia-native
```

#### 5. Python Integration

```bash
pip install elysia-py
```

### Hello World

#### Rust
```rust
use elysia_rust::TextProcessor;

fn main() {
    let text = "  hello world  ";
    println!("{}", TextProcessor::normalize(text));
    // Output: hello world
}
```

#### JavaScript (Node.js)
```javascript
const addon = require('elysia-native');

console.log(addon.normalize('  hello world  '));
// Output: hello world
```

#### WebAssembly
```html
<script type="module">
  import init, { ElysiasWasm } from './wasm/pkg/elysia_wasm.js';
  
  init().then(() => {
    console.log(ElysiasWasm.normalize('  hello world  '));
    // Output: hello world
  });
</script>
```

#### Python
```python
import elysia_ai

text = elysia_ai.normalize('  hello world  ')
print(text)  # Output: hello world
```

---

## APIリファレンス

### Rust API

```rust
// Text processing
TextProcessor::normalize(text: &str) -> String
TextProcessor::to_lowercase(text: &str) -> String
TextProcessor::to_uppercase(text: &str) -> String
TextProcessor::split(text: &str, delimiter: &str) -> Vec<String>
TextProcessor::word_count(text: &str) -> usize
TextProcessor::truncate(text: &str, max_len: usize) -> String

// Configuration
let config = Config::new();
config.to_json()?

// Library info
let info = LibraryInfo::get();
```

### JavaScript API

```javascript
// Native addon
addon.normalize(text)         // String -> String
addon.tokenize(text)          // String -> Array
addon.wordCount(text)         // String -> Number
addon.libraryInfo()           // () -> Object

// WebAssembly
ElysiasWasm.normalize(text)   // String -> String
ElysiasWasm.tokenize(text)    // String -> Array
ElysiasWasm.word_count(text)  // String -> Number
ElysiasWasm.version()         // () -> String
```

---

## トラブルシューティング

### Desktop App が起動しない

```bash
# ログ確認
~/.config/Elysia/logs/  # Linux
~/Library/Logs/Elysia/ # macOS
%APPDATA%\Elysia\logs\ # Windows
```

### Native Module ビルド失敗

```bash
cd node_modules/elysia-native
npm install  # Rebuild
```

### Game Server が接続できない

```bash
# ポート確認
netstat -an | grep 3000

# ファイアウォール設定
sudo ufw allow 3000  # Linux
```

---

## 次のステップ

- [API ドキュメント](./docs/API.md)
- [高度な機能](./docs/ADVANCED_FEATURES.md)
- [デプロイメント](./docs/DEPLOYMENT_GUIDE.md)
