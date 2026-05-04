# Stark Home Local Server Build

ElysiaAIを、トニー・スタークの家のようなローカル環境サーバへ育てるための構築まとめです。
派手な自動制御より先に、落ちない、漏れない、戻せる、見える、手動で止められることを優先します。

## Goal

家の中に小さな司令室を作ります。

- Local Ops: ElysiaAIの状態、未来段階、Secure Mesh、端末面を見える化する司令盤。
- AI Core: Ollama、FastAPI Kernel、将来のRAGと人格プロンプト。
- Home Core: Home Assistant、センサー、通知、読取専用の家ステータス。
- Memory Vault: NAS、バックアップ、復旧演習、設定履歴。
- Secure Mesh: Windows、macOS、Linux、Android、iOSからVPNまたはローカルLANで入る安全経路。
- Lab Zone: AbyssRTOS、検証VM、セキュリティ実験を家庭LANから隔離。

## Current ElysiaAI Build

すでにリポジトリ側へ入っているものです。

- `Local Ops`: `http://127.0.0.1:3000/stark-ops.html`
- `homeServer`: backup、storage、secure access、monitoring、network、lab isolationのゲート。
- `secureMesh`: 5端末ルートと5ガードの安全スコア。
- `future`: 10段階ロードマップ。
- `clients`: Windows、macOS、Linux、Android、iOS。
- `PWA`: Android/iOS向け `manifest.webmanifest` と `service-worker.js`。
- `manual-only`: 自動実行なし。起動も確認も手動。

## Manual Startup

```powershell
bun scripts/boot.ts --lite
```

確認URL:

- App: `http://127.0.0.1:3000`
- Local Ops: `http://127.0.0.1:3000/stark-ops.html`
- API: `http://127.0.0.1:3000/api/local-ops`
- FastAPI: `http://127.0.0.1:8000/health`

CLI確認:

```powershell
bun run ops
bun run ops -- --json
```

## Target Architecture

```text
Internet
  |
[Router / Firewall]
  |
  +-- Main VLAN      : Windows / macOS / Linux / phone admin clients
  +-- Servers VLAN   : ElysiaAI / Proxmox / NAS / monitoring
  +-- IoT VLAN       : Home Assistant devices, sensors, cameras
  +-- Guest VLAN     : guest Wi-Fi only
  +-- Lab VLAN       : AbyssRTOS, sandbox, security test nodes
        |
     [ElysiaAI Local Ops]
        |
        +-- FastAPI Kernel
        +-- Ollama / local models
        +-- Secure Mesh Matrix
        +-- Future Roadmap
        +-- Home Server Readiness
```

## MVP Build Order

1. Local Ops司令盤を毎日起動して、現在の家脳ステータスを見る。
2. バックアップ置き場と復旧手順を作る。
3. TailscaleなどのPrivate VPNを入れて、管理UIを公開ポートから守る。
4. Uptime KumaでElysiaAI、FastAPI、Ollama、NASを監視する。
5. Home Assistantは読取専用ステータスから接続する。
6. Android/iOSはPWAとして追加し、外出先はVPN経由だけにする。
7. Lab VLANにAbyssRTOSや検証環境を隔離する。

## Future Roadmap

| Stage | Track | Purpose |
| --- | --- | --- |
| House Telemetry Foundation | core | Local Opsを単一の司令盤にする |
| Recovery Memory Vault | core | バックアップと復旧演習を運用化 |
| Private Secure Mesh | core | VPNと公開ポート制御 |
| Predictive Monitoring Room | core | Uptime Kuma、Grafana、ログ監視 |
| Local Intelligence Core | core | Ollama、RAG、ローカルAI補助 |
| Ambient Home Interface | planned | Home Assistant読取専用連携 |
| Multi-User Support | planned | UIレベルの複数ユーザー切替と管理 |
| Advanced CI/CD | experimental | ZAPスキャンと自動結合テストカバレッジ |
| AbyssRTOS Integration | experimental | 完全隔離された実行環境 |
| Sovereign Mesh | frontier | 分散型AI OSネットワーク |

## Security Rules

- 管理画面をインターネットへ直接公開しない。
- 端末からのアクセスはlocalhost、LAN、Private VPNだけ。
- IoT、Server、Lab、Guestを分離する。
- Dockerや開発サーバの公開ポートを定期確認する。
- Home Assistant連携は読取専用から始める。
- 自動実行、ゲーム操作、デバイス制御は明示操作なしで動かさない。
- バックアップと復旧テストがない機能は本番扱いしない。

## Weekly Ops

- `bun run ops` でSecure Mesh、Home Server Gates、Future Stageを見る。
- 監視のdown/degradedを確認する。
- バックアップの最新日付と復旧メモを見る。
- 公開ポートとVPN状態を見る。
- 未来段階のnextを1つだけ進める。

## Next Build

最優先は `Private Secure Mesh` と `Recovery Memory Vault` です。
この2つが固まると、家の中のAI司令室を安全に外へ持ち出せます。

