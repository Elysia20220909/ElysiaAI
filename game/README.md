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

# オセロ（リバーシ）ゲーム

## 概要
- 8x8盤面・黒白2人・石を挟んで裏返すルール
- Web/CLI両方で体験可能
- AI対戦・観戦モード・角ボーナス・連続パス・引き分け対応
- 履歴・勝者表示・デザイン強化

## 起動方法
1. `bun ElysiaAI/game/server.ts` でサーバ起動（ポート3001）
2. `game/client.html` をブラウザで開く（Web版）
3. `bun ElysiaAI/game/cli-client.ts` でターミナル版CLI起動

## 主なAPI
- `POST /game/start` : ゲーム初期化（aiEnabled指定でAI対戦）
- `GET /game/state` : 現在のゲーム状態取得
- `POST /game/action` : 着手（x, y, player指定）
- `WS /game/ws` : リアルタイム状態配信
- `GET /swagger` : OpenAPIドキュメント

## 拡張仕様
- 角マス着手時ボーナス（+2点）
- 連続パスで自動終了
- 石数が同数なら引き分け
- AI対戦（ランダム合法手）
- 観戦モード（盤面のみ表示）
- 履歴・勝者演出・盤面ハイライト
- 多人数対応（ユーザーID管理・観戦）

## 参考
- [ElysiaJS公式](https://elysiajs.com/)
- [network_simulation.py](https://github.com/chloeamethyst/network_simulation.py)
