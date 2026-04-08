# Elysia OS: API Reference (v3.0 Sovereign)

このドキュメントでは、Elysia OS カーネルが提供する REST API および「スキル（Skill）」の技術仕様について詳述します。

## 1. Core API (REST)

### `POST /chat/stream`
AI との対話およびスキル実行のメインエンドポイントです。
- **Payload**: `{"message": "string"}`
- **Response**: Server-Sent Events (SSE)
    - `data: {"content": "..."}`: AI の発言
    - `data: {"skills": [...]}`: 実行されたスキルの結果

### `GET /system/monitor`
OS の現在の健康状態（テレメトリ）を返します。
- **Response**:
  ```json
  {
    "system": { "cpu": 15, "ram": 40, "disk": { "free": 200 } },
    "elysia": { "version": "3.0.0", "status": "stable" }
  }
  ```

---

## 2. Skill Registry (Instruction Set)

AI は特定の構文を生成することで、OS 機能を直接操作できます。

| スキル | 構文 | 説明 |
| :--- | :--- | :--- |
| **The Eye** | `<skill:web_search(query="...")>` | DuckDuckGo による最新情報の検索 |
| **The Sight** | `<skill:capture_screen()>` | デスクトップのキャプチャと解析 |
| **The Hand** | `<skill:git_info()>` | Git の状態と履歴の取得 |
| **Soul Memory**| `<skill:update_soul(key="...", value="...")>` | 永続的な感情・嗜好の記憶 |
| **System Doctor**| `<skill:system_doctor()>` | OS の整合性検査と診断 |
| **OS Growth** | `<skill:install_app(id="...", ...)>` | 新しい UI コンポーネントの動的生成 |

---

## 3. Integration Guide

### WebSocket (Next Phase)
現在は HTTP/SSE ですが、次期フェーズで双方向 WebSocket による「能動的プッシュ（Proactive Push）」へ移行予定です。

### セキュリティ
API キーは `etc/elysia/config.json` で定義されます。外部からのアクセス時は `X-API-KEY` ヘッダーが必要です。
