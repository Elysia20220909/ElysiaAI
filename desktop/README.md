# Elysia AI - Desktop App (Electron)

Windows/Mac/Linux ネイティブデスクトップアプリケーション。

## 特徴

- クロスプラットフォーム（Windows/Mac/Linux）
- ネイティブウィンドウ統合
- ローカルストレージによる設定永続化
- ストリーミングAI応答対応
- ピンクグラデーションのElysiaテーマ

## セットアップ

### 依存関係のインストール

```bash
# Windows
..\scripts\setup-desktop.ps1

# Linux/macOS
../scripts/setup-desktop.sh
```

または直接:

```bash
cd desktop
npm install  # または: bun install
```

## 開発

### サーバーの起動

まずElysiaサーバーとFastAPI RAGサーバーを起動:

```bash
# プロジェクトルートで
./scripts/dev.ps1     # Windows
# または
./scripts/dev.sh      # Linux/macOS
```

### デスクトップアプリの起動

```bash
cd desktop
npm start  # または: bun start
```

アプリが起動したら:

1. 右上の⚙️をクリック
2. サーバーURL を設定（デフォルト: `http://localhost:3000`）
3. 設定を保存
4. メッセージを入力して送信

## ビルド（配布用パッケージ作成）

### Windows

```bash
npm run build:win
```

生成物: `dist/win-unpacked/` または `dist/Elysia-AI Setup.exe`

### macOS

```bash
npm run build:mac
```

生成物: `dist/mac/` または `dist/Elysia-AI.dmg`

### Linux

```bash
npm run build:linux
```

生成物: `dist/linux-unpacked/` または `dist/Elysia-AI.AppImage`

## カスタマイズ

### アイコンの変更

1. `assets/icon.png` (1024x1024) を作成
2. [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) でマルチフォーマット生成:

   ```bash
   npm install -g electron-icon-builder
   electron-icon-builder --input=./assets/icon.png --output=./assets
   ```

### ウィンドウサイズの調整

`main.js` を編集:

```javascript
const mainWindow = new BrowserWindow({
  width: 1200, // 幅を変更
  height: 800, // 高さを変更
  // ...
});
```

## トラブルシューティング

### サーバーに接続できない

- Elysiaサーバーが起動しているか確認: `http://localhost:3000`
- ファイアウォール設定を確認
- 設定画面で正しいURLを入力しているか確認

### アプリが起動しない

```bash
# キャッシュをクリア
rm -rf node_modules package-lock.json
npm install
```

### ビルドエラー

- electron-builder のログを確認: `dist/builder-debug.yml`
- Node.js のバージョンを確認（推奨: v18以降）

## 技術スタック

- **Electron 28**: クロスプラットフォームデスクトップフレームワーク
- **electron-store**: ローカル設定ストレージ
- **electron-builder**: パッケージング・配布ツール
- **IPC (Inter-Process Communication)**: メインプロセス⇔レンダラープロセス通信

## アーキテクチャ

```text
desktop/
├── main.js       # メインプロセス（Node.js）
├── preload.js    # プリロードスクリプト（コンテキストブリッジ）
├── index.html    # レンダラープロセス（UI）
└── package.json  # Electron設定
```

### セキュリティ

- `nodeIntegration: false` - Node.js API をレンダラーから隔離
- `contextIsolation: true` - コンテキストの分離
- `preload.js` - 安全なIPC通信用コンテキストブリッジ

## ライセンス

親プロジェクトと同じMITライセンス。詳細は [../LICENSE](../LICENSE) を参照。
