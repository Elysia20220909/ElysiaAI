# E.L.I.S.I.A.向けWindows / macOS本体サーバ化設計書

Windows PCやMac本体を、E.L.I.S.I.A.のローカルサーバとして使うための設計書です。

Proxmoxで分離されたサーバを組む前に、手元のWindowsやMacを「机上の小さな炉心」として使います。大きなラックを組まなくても、静かなPC、短いケーブル、UPS、ローカルDNSが揃えば、E.L.I.S.I.A.は十分に目を覚まします。

## 要約

Windows / macOS本体サーバ化は、最速でE.L.I.S.I.A. Coreを生活空間へ置く方法です。

- 推奨用途: 個人開発、机上AI、ローカルダッシュボード、軽量LLM、Home Assistant連携前の検証。
- 非推奨用途: 厳密なVM分離、大量のLab VM、公開サービス、家族/複数ユーザー向け本番基盤。
- 安全な既定値: `127.0.0.1` bind。LAN公開は `--bind-ip` を明示したときだけ。
- 自動セットアップ入口: `bun run local-server:host`。
- 本格運用へ育ったら、[E.L.I.S.I.A. Core Home Server Blueprint](./ELYSIA_HOME_SERVER_BLUEPRINT.md) のProxmox構成へ移行します。
- Iron Man Mark LXXXV の設計言語を必須にする場合は、[Mark LXXXV Windows / macOS Host Server](./ELISIA_MARK85_WINDOWS_MACOS_HOST_SERVER.md) を使います。これはHUD、美観、分散構造、安全境界のための文書であり、実在する兵器、推進装置、危険な人体拡張装置の手順は含みません。

## 価格前提

価格は 2026-05-10 時点の計画用概算です。税、送料、為替、輸入費、セール差は含みません。

計画レート:

```text
1 USD ~= 157 JPY
```

| 構成 | 向き先 | 概算 |
| --- | --- | ---: |
| 既存Windows/Mac流用 | 最小検証。Docker Desktopと外付けSSD/UPSだけ追加 | USD 0-500 / JPY 0-79,000 |
| Mac mini host | 静音・美観・机上常設 | USD 1,200-2,700 / JPY 188,000-424,000 |
| Windows mini workstation | RAM/SSDを増やしやすい小型本体 | USD 900-2,800 / JPY 141,000-440,000 |
| Mac Studio / high-end compact PC | 重いローカルAI、制作、常時稼働 | USD 2,500-6,500+ / JPY 393,000-1,021,000+ |
| NAS + UPS + network追加 | 本体サーバを支える外部基盤 | USD 1,200-2,500 / JPY 188,000-393,000 |

## どちらを選ぶか

| 観点 | Windows本体サーバ | macOS本体サーバ |
| --- | --- | --- |
| 得意 | RAM/SSD拡張、GPU、Windows開発、WSL2 | 静音、省電力、Mac mini/Mac Studioの美観、日常機との親和性 |
| Docker | Docker Desktop + WSL2 | Docker Desktop / Colima / OrbStackなど |
| ローカルAI | NVIDIA GPUが使える構成なら強い | Ollama、MLX系、小型LLMに向く |
| 常時稼働 | Windows Updateと再起動方針に注意 | スリープ解除、FileVault、電源復帰に注意 |
| 美観 | 小型PC、縦置きスタンド、黒/白の統一 | Mac mini + Studio Display風の統一感 |

## おしゃれ機材

| 役割 | Windows候補 | macOS候補 | 目安 |
| --- | --- | --- | ---: |
| Host | 既存PC / ASUS NUC / Minisforum / Beelink / Framework Desktop | Mac mini / Mac Studio | USD 0-6,500+ |
| Storage | 2TB-4TB NVMe / Thunderbolt SSD | 2TB-4TB Thunderbolt SSD | USD 150-700 |
| NAS | UGREEN / Synology 4-bay | UGREEN / Synology 4-bay | USD 600-1,200+ |
| UPS | 1000-1500VA sine-wave UPS | 1000-1500VA sine-wave UPS | USD 180-350 |
| Network | 2.5GbE adapter, UniFi gateway/switch/AP | Thunderbolt/USB-C 2.5GbE, UniFi | USD 300-900 |
| Appearance | vertical stand, cable tray, labels | aluminum stand, short cables, wood shelf | USD 80-300 |

美観の方針:

- 机上に置くなら、白/黒/アルミ/木目のうち2-3要素に絞る。
- 外付けSSDは短いケーブルで背面へ逃がす。
- UPSは足元か棚下へ置き、熱がこもらないようにする。
- LANケーブルは短く、同色、両端ラベル付きにする。
- 本体のスリープ設定は「美しい省電力」より「落ちない基盤」を優先する。

## 推奨アーキテクチャ

```text
Windows PC / Mac
  |
  +-- Docker Desktop / host Docker runtime
  |     |
  |     +-- Caddy
  |     +-- Ollama
  |     +-- Open WebUI
  |     +-- Uptime Kuma
  |     +-- Homepage
  |     +-- Gitea
  |     +-- n8n
  |     +-- MQTT
  |     +-- Prometheus / Grafana
  |
  +-- External SSD or internal NVMe
  +-- NAS backup target
  +-- UPS
  +-- MAIN / SERVER VLAN
```

## 自動セットアップ

Windows/macOS本体サーバ化では、次のクロスプラットフォーム入口を使います。

```bash
bun run local-server:host
```

既定では以下だけ行います。

- `deploy/elisia-core` を `~/elisia-core-host` へコピー。
- `.env` を生成。
- 秘密値を生成。
- Caddy basic auth hashを生成。
- Mosquitto password fileを生成。
- `docker compose config --quiet` を実行。
- containerは起動しない。

起動まで行う場合:

```bash
bun run local-server:host -- --start
```

LAN内サーバとして公開する場合:

```bash
bun run local-server:host -- --bind-ip 10.10.20.30 --domain-suffix home.arpa --start
```

ローカルPC内だけで試す場合:

```bash
bun run local-server:host -- --domain-suffix localhost --start
```

注意:

- Docker DesktopなどのDocker runtimeが起動している必要があります。
- Docker Desktopは個人利用、小規模事業、教育、非商用OSSでは無償枠がありますが、条件外の商用利用はライセンス確認が必要です。
- 生成された `.env` と `setup-secrets.txt` はGitへ入れません。
- `127.0.0.1` bindなら他端末から見えません。LAN公開する場合だけ `--bind-ip` を指定します。

## Windows本体サーバ手順

1. Windows 11 ProまたはWindows 11 Home + Docker Desktopを用意。
2. BIOS/UEFIで仮想化支援を有効化。
3. Docker Desktopを入れ、WSL2 backendを有効にする。
4. PowerShellで確認。

```powershell
docker version
docker compose version
bun --version
```

5. 安全な準備。

```powershell
bun run local-server:host
```

6. LAN公開して起動。

```powershell
bun run local-server:host -- --bind-ip 10.10.20.30 --start
```

7. DNSまたはhostsで `ai.home.arpa` などを本体IPへ向ける。
8. Caddy root CAをWindowsの信頼ストアへ入れる。

## macOS本体サーバ手順

1. Mac mini、Mac Studio、または常時稼働できるMacを用意。
2. Docker Desktop、Colima、またはOrbStack相当のDocker runtimeを用意。
3. Homebrew/Bunを確認。

```bash
docker version
docker compose version
bun --version
```

4. 安全な準備。

```bash
bun run local-server:host
```

5. LAN公開して起動。

```bash
bun run local-server:host -- --bind-ip 10.10.20.30 --start
```

6. DNSまたはhostsで `ai.home.arpa` などを本体IPへ向ける。
7. Caddy root CAをKeychain Accessへ入れる。
8. Energy Settingsでスリープを抑制し、停電時はUPSに任せる。

## セキュリティ境界

- WAN port forwardは作らない。
- LAN公開前に `127.0.0.1` で検証する。
- Docker Desktopの共有フォルダを必要最小限にする。
- `.env`、`setup-secrets.txt`、backup archiveをGitへ入れない。
- 管理はMAIN VLANまたはTailscale/WireGuardだけにする。
- Windows/macOSは日常利用も混ざりやすいため、ブラウザ拡張、同期フォルダ、Downloadsに秘密を置かない。

## Proxmox構成との違い

| 項目 | Windows/macOS本体サーバ | Proxmox構成 |
| --- | --- | --- |
| 導入速度 | 速い | 遅い |
| 美観 | 机上に置きやすい | ラック/棚向き |
| 分離 | 弱め | 強い |
| 復旧性 | ホストOS依存 | VM snapshotで戻しやすい |
| GPU | Windowsは強い。MacはApple Silicon向き | GPU passthrough設計が必要 |
| 長期運用 | 個人ラボ向き | 家の基盤向き |

## 完了条件

- [ ] `docker compose config --quiet` が通る。
- [ ] `https://ai.home.arpa` または `https://ai.localhost` が開く。
- [ ] `https://dash.home.arpa` または `https://dash.localhost` が開く。
- [ ] `.env` と `setup-secrets.txt` がGit管理外で保管されている。
- [ ] UPSまたは安全なシャットダウン方針がある。
- [ ] NASまたは外部ディスクへbackup方針がある。
- [ ] WAN port forwardがない。

## 参照

- [Docker Personal](https://www.docker.com/products/personal/)
- [Docker Desktop license agreement](https://docs.docker.com/subscription/desktop-license/)
- [Apple Mac mini](https://www.apple.com/shop/buy-mac/mac-mini)
- [Apple Mac Studio](https://www.apple.com/mac-studio/)
- [MacRumors Mac mini pricing note](https://www.macrumors.com/2026/05/02/apple-just-raised-mac-mini-starting-price/)
- [Microsoft Windows 11 Pro](https://www.microsoft.com/en-us/d/windows-11-pro/dg7gmgf0d8h4)
- [Microsoft OpenSSH for Windows](https://learn.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse)
- [Tailscale downloads](https://tailscale.com/download)
- [Homebrew](https://brew.sh/)

## 結論

WindowsやMac本体をサーバ化する構成は、最初のE.L.I.S.I.A.に向いています。

大切なのは、最初から城を建てることではありません。机の上に静かな炉心を置き、秘密を外へ出さず、UPSとバックアップで眠りを守ることです。その小さな灯りが十分に育ったら、Proxmoxの家へ移していけばいいのです。
