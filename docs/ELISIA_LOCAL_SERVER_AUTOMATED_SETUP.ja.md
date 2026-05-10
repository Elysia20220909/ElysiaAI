# E.L.I.S.I.A.向けローカルサーバ自動セットアップ設計書

E.L.I.S.I.A.を、美しい機材構成のまま、できるだけ少ない手順で安全に立ち上げるための設計書です。

この文書は、機材選定と費用を扱う [E.L.I.S.I.A. Local Server Hardware Design](./ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.md) と、実作業チェックリストである [Stark Home Proxmox / OPNsense Checklist](./STARK_HOME_PROXMOX_OPNSENSE_CHECKLIST.md) の間をつなぎます。

Windows / macOSから準備・転送・証明書信頼を行う場合は、[E.L.I.S.I.A. Windows / macOS Admin Client Setup](./ELISIA_LOCAL_SERVER_CLIENT_SETUP.md) を先に整えます。

## 要約

自動化の役目は、Docker Core VMにE.L.I.S.I.A.の炉心を灯すことです。家全体の配線や境界線を勝手に変えることではありません。

- 推奨構成は **Sovereign AI Studio**。
- 自動セットアップ対象は **Docker Core VM / Debian 12 / Ubuntu Server 24.04 LTS**。
- 実行スクリプトは `deploy/elisia-core/setup.sh`。
- Windows/macOSからの起動入口は `scripts/local-server/Invoke-ElisiaLocalServerSetup.ps1` と `scripts/local-server/setup-elisia-local-server.sh`。
- VLAN、OPNsense、Proxmox bridge、スイッチport、NAS poolは手動チェックリストで進めます。
- 価格・機材の最新確認は、購入前に必ず機材設計書のソースリンクで行います。

## 全体像

```text
Stylish Hardware
  |
  +-- Router / Firewall      : manual, checklist
  +-- Managed Switch / AP    : manual, checklist
  +-- NAS / UPS              : manual, vendor UI
  +-- Proxmox Host           : manual bridge and VM creation
        |
        +-- Docker Core VM   : automated by deploy/elisia-core/setup.sh
              |
              +-- Caddy
              +-- Ollama
              +-- Open WebUI
              +-- Home Assistant proxy path
              +-- Uptime Kuma
              +-- Gitea
              +-- n8n
              +-- MQTT
              +-- Prometheus / Grafana
```

## おしゃれ機材の配置方針

美しさは、あとから貼る飾りではなく、保守性そのものです。短いケーブル、見えるラベル、熱が逃げる余白があるだけで、夜中の復旧作業はずっと穏やかになります。

| 層 | 推奨 | 自動セットアップとの関係 |
| --- | --- | --- |
| Minimal | Mac mini class / x86 mini PC + NAS + UniFi class network | Mac miniはDocker/アプリホスト寄り。`setup.sh` はLinux VMまたはx86 Linux host向け |
| Recommended | Framework Desktop / compact x86 Proxmox host + NAS + UniFi / OPNsense | Docker Core VMを作り、`setup.sh` をそのまま実行しやすい |
| GPU Rack | quiet ATX GPU workstation + NAS + stronger UPS | GPU passthroughやAI VMは手動で整え、Docker Coreの基盤は同じ流れで起動 |

外観の推奨:

- 小型ラック、白または黒の短いLANケーブル、両端ラベル。
- NASとUPSは密閉家具に入れない。
- APは天井または高い棚に置き、LEDは低輝度にする。
- 机上ならMac mini/mini PC、棚ならUbiquiti Toolless Mini Rackや小型6U rackが扱いやすい。

## 自動化する範囲

`deploy/elisia-core/setup.sh` が自動化するもの:

- Debian/Ubuntu上のDocker EngineとCompose plugin導入。
- `/opt/elisia-core/.env` を `.env.example` から作成。
- WebUI、Gitea、n8n、Grafana、MQTTの秘密値生成。
- Caddy basic auth hash生成。
- Mosquitto password file作成。
- `docker compose config --quiet` による構文検証。
- container image pull。
- E.L.I.S.I.A. Core stack起動。
- 任意のOllama model pull。

自動化しないもの:

- OPNsenseのWAN、VLAN、Firewall変更。
- Proxmoxの `vmbr0` / VLAN-aware bridge変更。
- スイッチのtrunk/access port変更。
- NASのpool、snapshot、backup job作成。
- ローカルDNS host override登録。
- Caddy root CAを管理端末へ信頼させる作業。
- WAN port forward作成。これは作らない方針です。

## 前提構成

Docker Core VM:

```text
OS: Ubuntu Server 24.04 LTS or Debian 12
VLAN: SERVER VLAN 20
IP: 10.10.20.30/24
Gateway: 10.10.20.1
DNS: 10.10.20.1
Disk: 200GB+
RAM: 16GB minimum, 32GB preferred
vCPU: 4 minimum
```

推奨固定IP:

| Device / VM | VLAN | IP |
| --- | ---: | --- |
| Router | each VLAN | `10.10.x.1` |
| Proxmox | MGMT 60 | `10.10.60.10` |
| NAS | SERVER 20 | `10.10.20.20` |
| Docker Core VM | SERVER 20 | `10.10.20.30` |
| Home Assistant VM | SERVER 20 | `10.10.20.50` |
| Admin PC | MAIN 10 | `10.10.10.10` |

## 手順 0: 作業前の安全確認

- [ ] OPNsense、Proxmox、スイッチのローカルコンソールを確保した。
- [ ] 既存設定をexportまたはbackupした。
- [ ] UPSにNASとホストを接続した。
- [ ] WANから管理画面へport forwardしない方針を確認した。
- [ ] `deploy/elisia-core/.env.example` をGit管理から外さず、`.env` はVM内だけに置く方針を確認した。

## 手順 1: ネットワーク土台を手動で作る

まず [Stark Home Proxmox / OPNsense Checklist](./STARK_HOME_PROXMOX_OPNSENSE_CHECKLIST.md) に従い、次を手動で整えます。

- VLAN 10 `MAIN`
- VLAN 20 `SERVER`
- VLAN 30 `IOT`
- VLAN 40 `GUEST`
- VLAN 50 `LAB`
- VLAN 60 `MGMT`
- Router port trunk
- Proxmox port trunk
- NAS access port
- AP trunk
- Admin PC access port

ここを自動化しない理由:

- ルータやスイッチ設定を誤ると、自分自身をLANから締め出すことがあります。
- 機種ごとにUI/API/設定形式が異なります。
- Firewallは「何を許可するか」を人間が読んで決めるべき境界です。

## 手順 2: Docker Core VMを用意する

Proxmox上でDocker Core VMを作ります。

```bash
qm create 102 \
  --name docker-core \
  --memory 16384 \
  --cores 4 \
  --cpu host \
  --scsihw virtio-scsi-single \
  --net0 virtio,bridge=vmbr0,tag=20 \
  --ostype l26 \
  --agent enabled=1 \
  --onboot 1
```

cloud-init例:

```bash
qm set 102 \
  --ide2 local-lvm:cloudinit \
  --ciuser elisia \
  --ipconfig0 ip=10.10.20.30/24,gw=10.10.20.1 \
  --nameserver 10.10.20.1
```

Admin PCからSSHできることを確認します。

```bash
ssh elisia@10.10.20.30
```

## 手順 3: deployファイルをVMへ送る

WSL / Git Bash / Linux/macOS:

```bash
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
rsync -av ./deploy/elisia-core/ elisia@10.10.20.30:/opt/elisia-core/
```

PowerShell:

```powershell
scp -r .\deploy\elisia-core elisia@10.10.20.30:/tmp/elisia-core-upload
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo cp -a /tmp/elisia-core-upload/. /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
```

## 手順 4: 安全なdry run

まず起動せず、Docker導入、`.env` 生成、秘密値生成、Compose検証まで行います。

```bash
ssh elisia@10.10.20.30
cd /opt/elisia-core
chmod +x setup.sh backup-volumes.sh
sudo ./setup.sh \
  --install-docker \
  --bind-ip 10.10.20.30 \
  --timezone Asia/Tokyo \
  --domain-suffix home.arpa \
  --no-start
```

生成された秘密値を確認します。

```bash
sudo cat /opt/elisia-core/setup-secrets.txt
```

確認後、password managerへ移します。このファイルはGitへ入れません。

## 手順 5: 起動

dry run後、同じVMで起動します。

```bash
cd /opt/elisia-core
sudo ./setup.sh \
  --install-docker \
  --bind-ip 10.10.20.30 \
  --timezone Asia/Tokyo \
  --domain-suffix home.arpa \
  --pull-model llama3.2
```

起動確認:

```bash
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs caddy --tail=50
docker compose -f compose.yaml exec -T ollama ollama list
```

## 手順 6: DNSと証明書

OPNsense Unboundなどのlocal DNSへ登録します。

```text
ai.home.arpa          -> 10.10.20.30
ha.home.arpa          -> 10.10.20.30
status.home.arpa      -> 10.10.20.30
dash.home.arpa        -> 10.10.20.30
git.home.arpa         -> 10.10.20.30
n8n.home.arpa         -> 10.10.20.30
grafana.home.arpa     -> 10.10.20.30
prometheus.home.arpa  -> 10.10.20.30
```

Caddy内部CAのroot証明書を取り出します。

```bash
cd /opt/elisia-core
docker cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy/root.crt
```

`root.crt` はAdmin PCやスマートフォンに手動で信頼させます。ここは端末ごとの信頼ストアに関わるため、自動化しません。

## 手順 7: Home Assistant連携

Home AssistantをCaddy配下で使う場合、Home Assistant側の `configuration.yaml` に追加します。

```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 10.10.20.30
```

その後、Home Assistantを再起動します。

## 手順 8: 動作確認

Admin PCから:

```bash
curl -k https://ai.home.arpa
curl -k https://dash.home.arpa
curl -k https://grafana.home.arpa
```

Docker Core VM内で:

```bash
cd /opt/elisia-core
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml ps
docker compose -f compose.yaml exec -T ollama ollama list
```

分離確認:

- Guest VLANからRFC1918へ到達しない。
- IoT VLANからMAIN/MGMTへ到達しない。
- Lab VLANからMAIN/SERVER/MGMT/NASへ到達しない。
- WAN port forwardが空である。

## 手順 9: バックアップ

Docker Coreのvolume backup scriptを使います。

```bash
cd /opt/elisia-core
chmod +x backup-volumes.sh
./backup-volumes.sh
```

cron例:

```cron
30 3 * * * /opt/elisia-core/backup-volumes.sh >> /opt/elisia-core/backups/backup.log 2>&1
```

NASへ転送する場合は、NAS側の権限を最小にします。バックアップは「ある」だけでなく、戻せることを月1回確認します。

## 初回完成条件

- [ ] `https://ai.home.arpa` が開く。
- [ ] `https://dash.home.arpa` が開く。
- [ ] `https://grafana.home.arpa` が開く。
- [ ] `docker compose ps` が期待通り。
- [ ] `setup-secrets.txt` をpassword managerへ移し、VMから削除した。
- [ ] `.env` はVM内だけにあり、Gitへ入っていない。
- [ ] NAS backup先が決まっている。
- [ ] Uptime Kumaで主要サービスを監視している。
- [ ] WAN port forwardがない。
- [ ] IoT/Guest/Labの分離が確認済み。

## 運用リズム

Daily:

- 失敗している監視だけを見る。
- NAS容量とUPS状態を確認する。

Weekly:

- Docker image更新候補を手動確認する。
- Home AssistantとDocker Coreのバックアップを確認する。
- 重要な変更前にsnapshotを取る。

Monthly:

- 1つのbackupを実際にrestore testする。
- VLAN/Firewall rulesを見直す。
- 古いモデル、使っていないcontainer、不要ログを整理する。

## セキュリティ境界

- WAN port forwardは作りません。
- 管理はLANまたはTailscale/WireGuardに限定します。
- `.env`、`setup-secrets.txt`、backup archiveはGitへ入れません。
- Homepageは `docker-socket-proxy` 経由でDocker情報を読みます。
- PrometheusはCaddy basic auth配下でのみ見ます。
- n8n、Gitea、Open WebUIの初期アカウント作成後、登録を開けっぱなしにしません。
- 自動化は「復旧できる範囲」から広げます。

## 結論

E.L.I.S.I.A.の自動セットアップは、魔法の一撃ではありません。

よい機材を美しく置き、VLANで境界を引き、UPSで眠りを守り、`setup.sh` でDocker Coreに火を入れる。その順番が、いちばん静かで強いです。
