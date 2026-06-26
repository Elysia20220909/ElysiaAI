# Elysia Framework Adoption Scan - 2026-06-26

## 要約

ElysiaAIはすでにBun + Elysiaを中核にしているため、次の改善はフレームワーク変更ではなく、公式の現在形に合わせたAPI体験の整備です。

公式Elysiaは、Bunとの相性、End-to-End Type Safety、OpenAPI生成、Edenによる型安全クライアントを強く打ち出しています。ElysiaAIではこの流れに合わせて、旧Swaggerプラグイン依存を避け、`@elysiajs/openapi` と `/openapi` を標準にします。

## 確認した一次情報

- Elysia公式サイト: https://elysiajs.com/
- Elysia公式リポジトリ: https://github.com/elysiajs/elysia
- Elysia OpenAPI plugin: https://elysiajs.com/plugins/openapi
- Awesome Elysia: https://github.com/elysiajs/awesome-elysia

## ElysiaAIへの判断

- APIドキュメントは `/swagger` ではなく `/openapi` に寄せる
- `@elysiajs/swagger` は使わず、`@elysiajs/openapi` を使う
- Scalar UIはOpenAPI plugin側の既定プロバイダとして扱う
- 生成されたOpenAPI仕様は、将来的にSDK生成やフロントエンド型安全化へつなげる
- 既存の `packages/server/src/types/openapi.ts` は、Elysiaのroute schemaと二重管理になりやすいので、今後は生成/同期の方針を決める

## 次の実装候補

- OpenAPIのタグを、RAG、Project Memory、Artifacts、Privacy Ledger、Agent Approval、Voiceに整理する
- 認証が必要なrouteには `detail.security` を明示する
- `openapi.json` をCIで更新確認し、古い仕様が残らないようにする
- Eden TreatyかOpenAPI SDK生成を使い、右ペインUIのAPI呼び出しを型安全にする
- `/openapi/json` を成果物ワークベンチから参照できるようにし、Sovereign Source Mapの内部API版として扱う
