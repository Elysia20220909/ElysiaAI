# 0001: Use Bun and ElysiaJS

- **Status:** Accepted
- **Date:** 2026-03-20
- **Context:**
  ElysiaAIは、リアルタイム性（WebSocket通信など）と人間らしい応答速度を両立した、愛と思いやりを持つAI-Native OSを目標としています。高負荷なAI処理や大量のコンカレント接続に対しても、軽量で一貫したパフォーマンスを提供できる基盤が必要です。Node.jsやExpressなどの従来エコシステムは盤石ですが、起動速度とTypeScriptのシームレスな統合に課題がありました。
- **Decision:**
  ランタイムとして **Bun** を、Webフレームワークとして **ElysiaJS** を採用します。BunはJavaScriptCoreエンジンにより高速な起動と実行パフォーマンスを提供し、TypeScriptのネイティブサポートを持ちます。ElysiaJSはBun上で最高速度を叩き出すフレームワークであり、完全な型安全性とWeb標準（Fetch API）準拠の設計によってElysiaAIのパフォーマンス要件と美学に合致します。
- **Consequences:**
  - **メリット:** サーバー起動の高速化。TypeScriptエコシステムでの開発体験の飛躍的な向上。高いHTTP/WebSocketスループット。Prismaを通じた安全なデータ型推論。
  - **デメリット:** Node.js専用のネイティブライブラリに一部互換性の壁が存在する可能性。新しい技術スタックのためコミュニティ情報が一部薄い（ただし急速に拡大中）。
