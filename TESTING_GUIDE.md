# Test Suite for Elysia Cross-Platform

## テスト実行コマンド

### Rust Library
```bash
cd rust
cargo test --release
cargo test --all-features
```

### Native C++ Addon
```bash
cd native
npm test
npm run test:all
```

### Desktop App (Electron)
```bash
cd desktop
npm test
npm run test:e2e
```

### Game Server (Bun)
```bash
cd ElysiaAI/game
bun test
```

### Mobile App (React Native)
```bash
cd mobile
npm test
npx jest --coverage
eas build --platform ios --non-interactive --no-wait
eas build --platform android --non-interactive --no-wait
```

### Swift Native
```bash
cd swift
swift test
swift build -c debug  # Debug build with tests
```

## CI/CD テスト検証

### GitHub Actions ワークフロー実行確認

1. **Desktop テスト**
   ```
   ✓ macOS Intel build
   ✓ macOS ARM64 build
   ✓ Windows x64 build
   ✓ Windows ia32 build (オプション)
   ✓ Linux x64 build
   ```

2. **Game Server テスト**
   ```
   ✓ macOS Intel standalone
   ✓ macOS ARM64 standalone
   ✓ Windows x64 standalone
   ✓ Linux x64 standalone
   ```

3. **Rust Library テスト**
   ```
   ✓ macOS x64 build & test
   ✓ macOS ARM64 build & test
   ✓ Windows x64 build & test
   ✓ Windows ia32 build & test
   ✓ Linux x64 build & test
   ✓ Linux ARM64 build & test (クロスコンパイル)
   ✓ Clippy lint check
   ```

4. **Native Addon テスト**
   ```
   ✓ macOS build (Node 18, 20)
   ✓ Windows build (Node 18, 20)
   ✓ Linux build (Node 18, 20)
   ✓ Unit tests
   ```

5. **Mobile EAS Build**
   ```
   ✓ iOS build (リリース時)
   ✓ Android build (リリース時)
   ```

6. **Swift Native**
   ```
   ✓ macOS Intel build
   ✓ macOS ARM64 build
   ```

## ローカルテスト実行チェックリスト

- [ ] Rust tests パス
  ```bash
  cd rust && cargo test --release
  ```

- [ ] Native addon ビルド成功
  ```bash
  cd native && npm install && npm run build:release
  ```

- [ ] Desktop アプリケーションビルド成功
  ```bash
  cd desktop && npm install && npm run build (current OS)
  ```

- [ ] Game server standalone ビルド成功
  ```bash
  cd ElysiaAI/game && bun install && bun run build:release
  ```

- [ ] Mobile ビルド検証
  ```bash
  cd mobile && npm install && npx expo lint
  ```

- [ ] Swift ビルド成功
  ```bash
  cd swift && swift build -c release
  ```

## パフォーマンステスト

### Rust Benchmark
```bash
cd rust
cargo bench
```

### Desktop App パフォーマンス
```bash
cd desktop
npm run build:release
# ファイルサイズチェック
ls -lh dist/*.dmg dist/*.exe dist/*.AppImage
```

### Game Server 起動時間
```bash
time ElysiaAI/game/dist/game-server
```

## エンドツーエンドテスト例

### Native Module
```javascript
const addon = require('./native/index.js');

console.log('Testing native module...');
console.log(addon.normalize('  hello world  ')); // 'hello world'
console.log(addon.tokenize('hello-world-test')); // ['hello', 'world', 'test']
console.log(addon.wordCount('one two three'));   // 3
console.log(addon.libraryInfo());               // { name, version, os, arch }
```

### Rust Library
```rust
use elysia_rust::{TextProcessor, LibraryInfo};

fn main() {
    println!("{}", TextProcessor::normalize("  hello world  "));
    println!("{:?}", TextProcessor::split("a,b,c", ","));
    println!("{}", TextProcessor::word_count("hello world"));
    
    let info = LibraryInfo::get();
    println!("Running on {}-{}", info.os, info.arch);
}
```

## テスト結果ドキュメント

テスト実行後、以下をアップデート：
1. [TESTING_RESULTS.md](TESTING_RESULTS.md) - テスト結果サマリー
2. [BENCHMARKS.md](docs/BENCHMARKS.md) - パフォーマンスベンチマーク
3. GitHub Issues - 失敗ケースの記録

## トラブルシューティング

### Rust テスト失敗
```bash
RUST_BACKTRACE=1 cargo test
```

### Native binding エラー
```bash
cd native
npm run clean
npm install
npm run rebuild
```

### Electron ビルド失敗
```bash
cd desktop
rm -rf node_modules dist
npm install
npm run build:release
```

### Bun スタンドアロン ビルド失敗
```bash
cd ElysiaAI/game
bun install --force
bun run build:release --verbose
```
