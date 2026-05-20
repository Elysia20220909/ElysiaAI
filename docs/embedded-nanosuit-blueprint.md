# Embedded NanoSuit Blueprint

## 概要

このドキュメントは、ElysiaAI を Web アプリや通常のデスクトップアプリに閉じ込めず、ローカル環境で動作する組み込みシステム型 AI-native OS へ拡張するための未来設計書です。

テーマは、アイアンマンのナノスーツのように、センサー、電源、通信、診断、ローカル AI を統合する個人用制御基盤です。ただし、現実の実装では安全性、倫理、法令遵守を前提とし、危険な武装化や身体危害につながる機能は扱いません。

ElysiaAI は、Mac Studio、Mac mini、Windows ゲーミング PC、自宅サーバー、Raspberry Pi 系デバイス、ESP32 系センサーノードを統合する、個人用ローカル司令塔を目指します。

---

## 目的

- 自宅で動くローカルファースト AI 制御基盤を作る
- PC、サーバー、組み込みデバイスを横断して監視する
- センサー情報、ログ、電源状態、ネットワーク状態を統合する
- 外部クラウドに依存しない個人用 AI オペレーション環境を作る
- 研究、創作、セキュリティ分析、ホームラボ運用を支援する

---

## コンセプト

### 1. Room-as-a-Suit

スーツを着るのではなく、部屋全体をひとつの知的外骨格として扱う。

机、PC、サーバー、照明、センサー、NAS、UPS、通知システムを ElysiaAI が統合し、ユーザーの作業環境そのものを拡張する。

### 2. Local Command Core

Ollama、FastAPI Kernel、Bun / Elysia API、Tauri UI を中心に、ローカル環境で推論、記憶、監視、通知を完結させる。

### 3. Embedded Nervous System

Raspberry Pi や ESP32 をセンサーノードとして扱い、温度、湿度、電力、ネットワーク、PC 状態、ストレージ容量などを収集する。

---

## 対象読者

- ソロ開発者
- ホームラボ運用者
- ホワイトハッカー、セキュリティ研究者
- ローカル LLM 利用者
- Raspberry Pi / ESP32 / Jetson などの組み込み開発者
- 自分専用の AI-native OS を育てたい人

---

## システム構成

```text
User
 │
 ▼
Tauri Desktop Shell / Local Dashboard
 │
 ▼
Bun / Elysia API Layer
 │
 ├─ FastAPI AI Kernel
 │   ├─ Ollama Local LLM
 │   ├─ RAG / Memory
 │   ├─ Log Analyzer
 │   └─ Decision Tree Engine
 │
 ├─ Device Control Gateway
 │   ├─ Raspberry Pi Node
 │   ├─ ESP32 Sensor Node
 │   ├─ Windows Gaming PC Agent
 │   ├─ Mac Studio / Mac mini Agent
 │   └─ Home Server Agent
 │
 └─ Notification Layer
     ├─ Discord Webhook
     ├─ Slack Webhook
     └─ Local Desktop Alert
```

---

## 主要モジュール

| Module | Role |
| :--- | :--- |
| Local AI Core | ローカル LLM、RAG、ログ解析、判断支援 |
| Device Gateway | PC、Mac、サーバー、組み込みノードとの接続 |
| Sensor Mesh | 温度、湿度、電源、ネットワーク、ストレージ状態の収集 |
| Security Monitor | 不審プロセス、ポート、依存関係、秘密情報の監視 |
| Power Watcher | UPS、消費電力、バッテリー、温度の監視 |
| Notification Hub | Discord、Slack、ローカル通知への配信 |
| Blueprint UI | アイアンマン研究室風の可視化 UI |

---

## MVP

最初の実装は、危険な制御ではなく、観測と通知に限定する。

### Phase 1: Observe

- Windows PC の CPU / GPU 温度監視
- SSD 容量監視
- メモリ使用率監視
- ネットワーク疎通監視
- ローカルログ収集

### Phase 2: Analyze

- FastAPI Kernel によるログ要約
- Ollama による異常原因の自然言語説明
- RAG による過去トラブル検索
- セキュリティチェック結果の整理

### Phase 3: Notify

- Discord Webhook 通知
- Slack Webhook 通知
- Tauri Desktop 通知
- 日次ヘルスレポート生成

### Phase 4: Assist

- 修復手順の提案
- セーフモードでの自動チェック
- 依存関係更新の注意喚起
- バックアップ推奨タイミングの通知

---

## GPIO / Sensor Node 方針

Raspberry Pi や ESP32 ノードは、制御よりも安全な観測を優先する。

推奨センサー:

- 温度センサー
- 湿度センサー
- 電力計測センサー
- CO2 センサー
- 開閉センサー
- ファン回転数取得
- UPS 状態取得

避けるべき領域:

- 高電圧の直接制御
- 人体に危険を及ぼすアクチュエータ制御
- 武装化、攻撃用途、危険な自動作動
- 法令や安全基準を満たさない電源改造

---

## セキュリティ原則

- デフォルトはローカルのみ
- 外部公開 API は明示的に無効
- JWT / RBAC / Secret hygiene を必須化
- デバイスごとに最小権限を適用
- 監査ログを保存する
- 自動実行より、人間承認を優先する

---

## 将来構想

### Elysia Lab Mode

部屋全体を研究室 UI として可視化するモード。

- PC 状態
- サーバー状態
- ネットワーク状態
- センサー状態
- AI Kernel 状態
- GitHub Actions / CI 状態

### Personal SOC Mode

個人用 Security Operation Center。

- ローカル端末の状態監視
- 依存関係の脆弱性チェック
- 不審な通信の検出
- GitHub secret hygiene
- ログの自然言語要約

### Blueprint Dashboard

ダークネイビー背景、シアン線画、グリッド、引き出し線を使った設計図風 UI。

実用情報を美しく表示し、単なる監視画面ではなく、作業意欲を高めるコックピットとして設計する。

---

## 実装メモ

候補ディレクトリ:

```text
packages/server/src/routes/devices.ts
python/app/routers/device_monitor.py
src-tauri/src/commands/device_status.rs
public/blueprint-dashboard.html
scripts/collect-system-health.ps1
scripts/collect-system-health.sh
```

候補 API:

```http
GET /api/devices
GET /api/devices/:id/status
POST /api/devices/:id/check
GET /api/health/report
POST /api/notify/test
```

候補データモデル:

```ts
type DeviceStatus = {
  id: string;
  name: string;
  kind: 'windows-pc' | 'mac' | 'server' | 'raspberry-pi' | 'esp32' | 'ups';
  online: boolean;
  cpuTemp?: number;
  gpuTemp?: number;
  diskFreeGb?: number;
  memoryUsagePercent?: number;
  networkLatencyMs?: number;
  lastSeenAt: string;
};
```

---

## 結論

ElysiaAI の次の姿は、単なるチャットアプリでも、単なるデスクトップツールでもない。

それは、自宅のローカル環境を静かに観測し、考え、知らせ、守るための個人用 AI-native embedded OS である。

アイアンマンのスーツを現実に作るのではなく、作業机と部屋そのものを知的な外骨格に変えていく。
