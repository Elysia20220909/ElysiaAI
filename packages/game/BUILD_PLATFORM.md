# Elysia AI Game - クロスプラットフォーム対応ガイド

## サポートプラットフォーム

### デスクトップ

#### macOS
- **Intel (x64)**: macOS 10.15以降
- **Apple Silicon (ARM64)**: M1/M2/M3/M4、macOS 11.0以降

#### Windows
- **64-bit (x64)**: Windows 10/11 (Intel/AMD)
- **32-bit (ia32)**: Windows 10以降（レガシーシステム対応）

#### Linux
- **x64**: Ubuntu 20.04以降、Debian 10以降、または同等のディストリビューション

### Web（ブラウザベース）
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 任意のモダンブラウザ（WebSocket + SSE対応）

---

## ゲーム概要

### オセロ（リバーシ）
- 8x8盤面、黒白2プレイヤー
- 石を挟んで裏返すクラシックルール
- **AI対戦**: 3つの難易度（ランダム/強/最強）
- **観戦モード**: リアルタイムで対局を観戦
- **CLI/Webクライアント**: ターミナルまたはブラウザで対局

### ネットワークゲーム
- ノード・エージェントベースの戦略ゲーム
- リアルタイムマルチプレイヤー対応
- WebSocketによる即時同期

---

## ビルド方法

### スタンドアロンバイナリ（推奨）

Bunのコンパイル機能を使用して、Node.js不要の単一実行ファイルを生成します。

#### すべてのプラットフォーム
```bash
cd ElysiaAI/game
bun install
bun run build:all
```

#### macOS向け

##### Intel Mac用
```bash
bun run build:mac:intel
# 出力: dist/elysia-game-mac-intel
```

##### Apple Silicon (M1/M2/M3) 用
```bash
bun run build:mac:arm
# 出力: dist/elysia-game-mac-arm64
```

##### 両方のアーキテクチャ
```bash
bun run build:mac
# 出力: dist/elysia-game-mac (Intel), dist/elysia-game-mac-arm64 (ARM)
```

#### Windows向け

##### 64-bit版（推奨）
```bash
bun run build:win:x64
# 出力: dist/elysia-game-win-x64.exe
```

##### すべてのWindows版
```bash
bun run build:win
# 出力: dist/elysia-game-win.exe
```

#### Linux向け
```bash
bun run build:linux
# 出力: dist/elysia-game-linux
```

### 開発モード

```bash
cd ElysiaAI/game
bun install
bun run dev
```

サーバーが http://localhost:3001 で起動します。

---

## 実行方法

### スタンドアロンバイナリ

#### macOS
```bash
# 実行権限を付与
chmod +x dist/elysia-game-mac-intel
# または
chmod +x dist/elysia-game-mac-arm64

# 実行
./dist/elysia-game-mac-intel
# または
./dist/elysia-game-mac-arm64
```

初回起動時にGatekeeperの警告が出る場合:
```bash
# セキュリティ承認
xattr -d com.apple.quarantine dist/elysia-game-mac-*
```

#### Windows
```cmd
dist\elysia-game-win-x64.exe
```

または、エクスプローラーからダブルクリック。

#### Linux
```bash
chmod +x dist/elysia-game-linux
./dist/elysia-game-linux
```

### Bun環境（開発向け）

```bash
cd ElysiaAI/game
bun server.ts
```

---

## クライアント使用方法

### Webクライアント（推奨）

1. ゲームサーバーを起動
2. ブラウザで `client.html` を開く
3. またはサーバーのSwagger UI: http://localhost:3001/swagger

### CLIクライアント（ターミナル）

```bash
# TypeScript版（推奨）
bun cli-client.ts

# JavaScript版
bun cli-client.js
# または
node cli-client.js
```

#### CLI操作
```
=== Elysia Network Game CLI ===
モード: 1=対人 2=AI 3=観戦 > 2

ターン: 黒(●)
着手座標 x y（例: 2 3）: 4 5
```

---

## API エンドポイント

### オセロゲーム
- `POST /game/start` - ゲーム初期化
  ```json
  {
    "aiEnabled": true,
    "aiLevel": "strong",  // "random" | "strong" | "god"
    "userIds": ["player1", "player2"]
  }
  ```
- `GET /game/state` - 現在の盤面取得
- `POST /game/action` - 着手
  ```json
  {
    "x": 4,
    "y": 5,
    "player": 1  // 1=黒, 2=白
  }
  ```
- `WS /game/ws` - リアルタイム状態配信

### その他
- `GET /swagger` - OpenAPI ドキュメント
- `GET /` - ヘルスチェック

---

## クロスプラットフォーム配布

### ファイル配布

#### macOS
- `elysia-game-mac-intel` → Intel Mac用
- `elysia-game-mac-arm64` → Apple Silicon用
- 両方配布してユーザーが選択

#### Windows
- `elysia-game-win-x64.exe` → 64bit版（推奨）
- `elysia-game-win-ia32.exe` → 32bit版（レガシー）

#### Linux
- `elysia-game-linux` → x64版
- `.tar.gz` または `.deb` でパッケージ化

### Docker配布（オプション）

```bash
# マルチアーキテクチャビルド
docker buildx build --platform linux/amd64,linux/arm64 -t elysia-game:latest .
```

---

## トラブルシューティング

### macOS

#### 「開発元が未確認」エラー
```bash
# セキュリティ承認
xattr -d com.apple.quarantine dist/elysia-game-mac-*

# または
右クリック → 「開く」
```

#### アーキテクチャの確認
```bash
file dist/elysia-game-mac-intel
# 出力: Mach-O 64-bit executable x86_64

file dist/elysia-game-mac-arm64
# 出力: Mach-O 64-bit executable arm64
```

### Windows

#### ポート競合
```powershell
# ポート3001を使用しているプロセスを確認
netstat -ano | findstr :3001

# プロセス終了
taskkill /PID <PID> /F
```

#### 実行できない
- Windows Defenderが初回起動をブロックする場合があります
- 「詳細情報」→「実行」を選択

### Linux

#### 依存関係エラー
```bash
# 必要なライブラリをインストール
sudo apt-get update
sudo apt-get install -y libssl-dev
```

#### 実行権限
```bash
chmod +x dist/elysia-game-linux
```

---

## パフォーマンス最適化

### 本番環境推奨設定

```bash
# 環境変数
export NODE_ENV=production
export PORT=3001
export MAX_CONNECTIONS=1000

# 実行
./dist/elysia-game-linux
```

### メモリ制限（Docker）

```yaml
# docker-compose.yml
services:
  game:
    image: elysia-game:latest
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

---

## 開発環境セットアップ

### 必要要件
- Bun 1.0.0以降
- TypeScript 5.0以降

### インストール

```bash
# Bunのインストール（macOS/Linux）
curl -fsSL https://bun.sh/install | bash

# Bunのインストール（Windows）
powershell -c "irm bun.sh/install.ps1 | iex"

# 依存関係インストール
cd ElysiaAI/game
bun install
```

### テスト

```bash
bun test
```

---

## ビルドサイズ

| プラットフォーム | サイズ | 備考 |
|----------------|--------|------|
| macOS Intel | ~50MB | x64バイナリ |
| macOS ARM | ~45MB | ARM64最適化 |
| Windows x64 | ~55MB | .exe形式 |
| Linux x64 | ~48MB | ELF形式 |

※ Bun runtimeが埋め込まれるため、Node.js不要で動作します。

---

## ライセンス

MIT License - 詳細は [LICENSE](../LICENSE) を参照

---

## 関連リンク

- [Elysia公式ドキュメント](https://elysiajs.com/)
- [Bun公式サイト](https://bun.sh/)
- [CLI操作マニュアル](CLI_MANUAL.md)
- [メインREADME](README.md)

---

**Last Updated**: 2025-12-25  
**Version**: 1.0.0
