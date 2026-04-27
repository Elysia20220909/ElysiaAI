# Elysia OS: API Reference (v3.0 Sovereign)

こ�Eドキュメントでは、Elysia OS カーネルが提供すめEREST API および「スキル�E�Ekill�E�」�E技術仕様につぁE��詳述します、E
## 1. Core API (REST)

### `POST /chat/stream`
AI との対話およびスキル実行�Eメインエンド�Eイントです、E- **Payload**: `{"message": "string"}`
- **Response**: Server-Sent Events (SSE)
    - `data: {"content": "..."}`: AI の発言
    - `data: {"skills": [...]}`: 実行されたスキルの結果

### `GET /system/monitor`
OS の現在の健康状態（テレメトリ�E�を返します、E- **Response**:
  ```json
  {
    "system": { "cpu": 15, "ram": 40, "disk": { "free": 200 } },
    "elysia": { "version": "3.0.0", "status": "stable" }
  }
  ```

---

## 2. Skill Registry (Instruction Set)

AI は特定�E構文を生成することで、OS 機�Eを直接操作できます、E
| スキル | 構文 | 説昁E|
| :--- | :--- | :--- |
| **The Eye** | `<skill:web_search(query="...")>` | DuckDuckGo による最新惁E��の検索 |
| **The Sight** | `<skill:capture_screen()>` | チE��クトップ�Eキャプチャと解极E|
| **The Hand** | `<skill:git_info()>` | Git の状態と履歴の取征E|
| **Soul Memory**| `<skill:update_soul(key="...", value="...")>` | 永続的な感情・嗜好の記�E |
| **System Doctor**| `<skill:system_doctor()>` | OS の整合性検査と診断 |
| **OS Growth** | `<skill:install_app(id="...", ...)>` | 新しい UI コンポ�Eネント�E動的生�E |

---

## 3. Integration Guide

### WebSocket (Next Phase)
現在は HTTP/SSE ですが、次期フェーズで双方吁EWebSocket による「�E動的プッシュ�E�Eroactive Push�E�」へ移行予定です、E
### セキュリチE��
API キーは `etc/elysia/config.json` で定義されます。外部からのアクセス時�E `X-API-KEY` ヘッダーが忁E��です、E
