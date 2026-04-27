# 0001: Use Bun and ElysiaJS

- **Status:** Accepted
- **Date:** 2026-03-20
- **Context:**
  ElysiaAIは、リアルタイム性�E�EebSocket通信など�E�と人間らしい応答速度を両立した、�Eと思いめE��を持つAI-Native OSを目標としてぁE��す。高負荷なAI処琁E��大量�Eコンカレント接続に対しても、軽量で一貫したパフォーマンスを提供できる基盤が忁E��です、Eode.jsやExpressなどの従来エコシスチE��は盤石ですが、起動速度とTypeScriptのシームレスな統合に課題がありました、E- **Decision:**
  ランタイムとして **Bun** を、Webフレームワークとして **ElysiaJS** を採用します、EunはJavaScriptCoreエンジンにより高速な起動と実行パフォーマンスを提供し、TypeScriptのネイチE��ブサポ�Eトを持ちます、ElysiaJSはBun上で最高速度を叩き�Eすフレームワークであり、完�Eな型安�E性とWeb標準！Eetch API�E�準拠の設計によってElysiaAIのパフォーマンス要件と美学に合�Eします、E- **Consequences:**
  - **メリチE��:** サーバ�E起動�E高速化。TypeScriptエコシスチE��での開発体験�E飛躍的な向上。高いHTTP/WebSocketスループット。Prismaを通じた安�EなチE�Eタ型推論、E  - **チE��リチE��:** Node.js専用のネイチE��ブライブラリに一部互換性の壁が存在する可能性。新しい技術スタチE��のためコミュニティ惁E��が一部薁E���E�ただし急速に拡大中�E�、E
