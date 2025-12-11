# Elysia風ネットワークシミュレーションゲーム

## 概要
- ElysiaJS + Bunで構築した型安全・リアルタイム・API自動ドキュメント対応のネットワークゲーム
- Python network_simulation.pyのロジックをTypeScript/JSで再設計
- ノード・エージェント・ターン進行・WebSocketリアルタイム通信

## 起動方法
1. `bun ElysiaAI/game/server.ts` でサーバ起動（ポート3001）
2. `game/client.html` をブラウザで開く

## 主なAPI
- `POST /game/start` : ゲーム初期化（ノード・エージェント配置）
- `GET /game/state` : 現在のゲーム状態取得
- `POST /game/action` : エージェント移動等のアクション
- `WS /game/ws` : リアルタイム状態配信
- `GET /swagger` : OpenAPIドキュメント

## 新仕様・拡張案
- 複数ユーザー同時参加（ユーザーID・相手ID指定可能）
- ターン制（同一ユーザー連続行動はスキップ）
- ペナルティ（同じノード連続移動でスコア減点）
- 勝敗判定（スコア10点で勝者決定）
- 履歴・勝者表示・UIデザイン強化（CSS/アニメーション/履歴/勝者演出）
- クライアント側で移動先自動選択・複数ユーザー対応

## 参考
- [ElysiaJS公式](https://elysiajs.com/)
- [network_simulation.py](https://github.com/chloeamethyst/network_simulation.py)
