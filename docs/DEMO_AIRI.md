# AIRI インスパイアのテスト実装まとめ

このドキュメントは、AIRI の構成を参考にしたテスト用ミニ実装の案内です。大きな本番コードを触らず、動作確認用のサンドボックスとして利用できます。

## 追加したもの

1. **Web デモ (Vue + UnoCSS runtime)**

   - `public/demo-airi.html`
   - CDN 版の Vue 3 と UnoCSS Runtime を使った軽量サンドボックス。
   - `/api/demo/chat` で簡易チャット（マルチモデル・アンサンブルが動けばその結果、動かない場合はモック応答）。
   - `/api/demo/voice` で簡易ボイス再生（現状モック data:URL）。

2. **サーバー側デモ API**
   - `/api/demo/chat` : `multiModelEnsemble` を利用し、失敗時はモック返信でフォールバック。
   - `/api/demo/voice` : TTS 実装が未接続でも落ちないモックを返却。将来的に unspeech / TTS プロバイダへ差し替え可。
   - `public/` を静的配信するように Express に追加。

## 使い方

```bash
# サーバー起動（ルート）
bun run dev

# ブラウザで開く
http://localhost:3000/demo-airi.html
```

- 送信: テキストを入力し「送信」または Ctrl+Enter。
- ボイス試聴: 直近の AI 応答を `/api/demo/voice` でリクエストし、返った data:URL をそのままブラウザ再生。

## 既存クライアントとの関係

- **Desktop (Electron)** / **Mobile (Expo)** は既存のチャット UI を保持。今回のデモは衝突しない独立サンドボックス。
- **Tauri/Capacitor** は未導入のため、将来このデモ API をフロントに差し替える形で最小 PoC を構築可能。

## 次のステップ候補

- `/api/demo/voice` を unspeech もしくは任意の TTS プロバイダにリバースプロキシする。
- UnoCSS を本体ビルドに導入する場合は Vite/Vue の専用パッケージを追加し、ランタイム版から移行する。
- Desktop/Mobile から本デモ API へ接続する切り替えトグルを UI に実装する。
