# Stark Home Local Server Build / スターク邸ローカルサーバ構築

Bilingual build document for E.L.I.S.I.A. Core.

E.L.I.S.I.A. Core向けの日本語/英語併記ドキュメントです。

Canonical detailed spec:

正本の詳細設計:

- `docs/STARK_HOME_LOCAL_SERVER_BUILD.md`
- `docs/STARK_HOME_AUTOMATED_SETUP.md`
- `docs/STARK_HOME_PROXMOX_OPNSENSE_CHECKLIST.md`
- `deploy/elisia-core/compose.yaml`

## 1. Purpose / 目的

| JP | EN |
| --- | --- |
| 自宅またはマンション内に、VLAN分離、Docker基盤、Home Assistant、監視、ローカルAIを持つ小型中枢を作る。 | Build a compact home core with VLAN isolation, Docker services, Home Assistant, monitoring, and local AI. |
| 管理VLANを分け、Lab/IoT/Guestを閉じ込める。 | Separate the management VLAN and contain Lab, IoT, and Guest networks. |
| 将来の二回線契約に備えて、OPNsense Multi-WANを前提にする。 | Design for future dual-WAN using OPNsense Multi-WAN. |
| 外部公開ではなく、LAN内とTailscale/VPN管理を基本にする。 | Default to LAN-only access plus Tailscale/VPN management instead of public exposure. |

## 2. Assumptions / 前提

| Item | JP | EN |
| --- | --- | --- |
| Router / Firewall | OPNsense想定。pfSenseでも考え方は同じ。 | OPNsense is assumed. pfSense can follow the same model. |
| WAN | 初期はWAN1のみ。将来WAN2を追加。 | Start with WAN1. Add WAN2 later. |
| Switch | VLAN対応スイッチ必須。 | VLAN-capable managed switch required. |
| Wi-Fi | SSIDごとにVLANを割り当てられるAPを使う。 | Use an AP that can map SSIDs to VLANs. |
| Proxmox NIC | 物理NIC 1本をtrunkとして使う。例: `eno1`。 | Use one physical NIC as a trunk. Example: `eno1`. |
| Proxmox storage | 例: `local-lvm`。 | Example: `local-lvm`. |
| Docker Core VM | `10.10.20.30`。 | `10.10.20.30`. |
| Public access | WAN port forwardは作らない。 | Do not create WAN port forwards. |

## 3. Topology / 全体構成

```text
WAN1 Internet
  |
ISP1 ONU / modem
  |
        +-------------------------+
WAN2 Internet                     |
  |                               |
ISP2 ONU / modem                  |
  |                               |
  +---- [OPNsense Router / Firewall]
                    |
              LAN trunk port
                    |
              [Managed Switch]
          |           |            |
          |           |            +-- Wi-Fi AP trunk: MAIN / IOT / GUEST
          |           +--------------- NAS access VLAN20: 10.10.20.20
          +--------------------------- Proxmox trunk
                                          MGMT: 10.10.60.10
                                          VM VLAN tags: 20, 50
```

JP:

- WAN1は主回線。
- WAN2は副回線。最初はfailover用途で十分。
- Proxmoxは管理VLAN 60に置く。
- Docker、NAS、AI、監視はSERVER VLAN 20に置く。
- LabはVLAN 50に閉じ込める。

EN:

- WAN1 is the primary internet link.
- WAN2 is the secondary link. Failover is enough at first.
- Proxmox lives on Management VLAN 60.
- Docker, NAS, AI, and monitoring live on Server VLAN 20.
- Lab systems are contained in VLAN 50.

## 4. VLAN / IP Plan / VLANとIP設計

| VLAN | Name | Network | JP Purpose | EN Purpose |
| ---: | --- | --- | --- | --- |
| 10 | `MAIN` | `10.10.10.0/24` | PC、スマホ、普段使い端末 | PCs, phones, daily devices |
| 20 | `SERVER` | `10.10.20.0/24` | Docker、NAS、AI、監視 | Docker, NAS, AI, monitoring |
| 30 | `IOT` | `10.10.30.0/24` | 家電、センサー、カメラ | Appliances, sensors, cameras |
| 40 | `GUEST` | `10.10.40.0/24` | 来客Wi-Fi | Guest Wi-Fi |
| 50 | `LAB` | `10.10.50.0/24` | CTF、検証、脆弱VM | CTF, validation, vulnerable VMs |
| 60 | `MGMT` | `10.10.60.0/24` | Proxmox、ルータ、スイッチ管理 | Proxmox, router, switch management |
| 999 | `BLACKHOLE` | none | 未使用ポート隔離 | Unused port isolation |

Static IPs / 固定IP:

| Device / VM | VLAN | IP |
| --- | ---: | --- |
| Router | each VLAN | `10.10.x.1` |
| Proxmox | MGMT | `10.10.60.10` |
| NAS | SERVER | `10.10.20.20` |
| Docker Core VM | SERVER | `10.10.20.30` |
| AI GPU VM, optional | SERVER | `10.10.20.40` |
| Home Assistant VM | SERVER | `10.10.20.50` |
| Kali / Lab VM | LAB | `10.10.50.10` |
| Admin PC | MAIN | `10.10.10.10` |

## 5. Switch Port Plan / スイッチポート設計

| Port | Target | Mode | VLAN |
| --- | --- | --- | --- |
| Port 1 | OPNsense LAN | Trunk | tagged `10,20,30,40,50,60` |
| Port 2 | Proxmox | Trunk | tagged `10,20,30,40,50,60` |
| Port 3 | NAS | Access | untagged `20` |
| Port 4 | Wi-Fi AP | Trunk | tagged `10,30,40` |
| Port 5 | Admin PC | Access | untagged `10` |
| Port 6 | IoT Hub | Access | untagged `30` |
| Port 7 | Lab device | Access | untagged `50` |
| unused | none | Access | untagged `999` |

JP:

- VLAN 1は管理にも本番にも使わない。
- 未使用ポートはBLACKHOLE VLANへ送る。
- AP管理VLANは機種に合わせて決める。

EN:

- Do not use VLAN 1 for management or production.
- Put unused ports into the BLACKHOLE VLAN.
- Choose the AP management VLAN based on the AP model.

## 6. OPNsense Multi-WAN / OPNsense二回線設計

Interfaces / インターフェース:

| Interface | Role | Notes |
| --- | --- | --- |
| `WAN1` | primary internet | ISP1 |
| `WAN2` | secondary internet | ISP2 |
| `LAN_TRUNK` | internal VLAN trunk | switch Port 1 |
| `MAIN` | VLAN 10 | `10.10.10.1/24` |
| `SERVER` | VLAN 20 | `10.10.20.1/24` |
| `IOT` | VLAN 30 | `10.10.30.1/24` |
| `GUEST` | VLAN 40 | `10.10.40.1/24` |
| `LAB` | VLAN 50 | `10.10.50.1/24` |
| `MGMT` | VLAN 60 | `10.10.60.1/24` |

Gateway groups / ゲートウェイグループ:

| Group | WAN1 | WAN2 | JP Use | EN Use |
| --- | --- | --- | --- | --- |
| `GWG_FAILOVER` | Tier 1 | Tier 2 | SERVER/MGMT/重要通信 | SERVER/MGMT/critical traffic |
| `GWG_BALANCE_CLIENTS` | Tier 1 | Tier 1 | MAIN/GUESTの任意load balance | Optional MAIN/GUEST load balancing |
| `GWG_WAN2_TEST` | never | Tier 1 | WAN2単独テスト | WAN2-only testing |

JP:

- SERVERとMGMTはload balanceしない。
- 管理セッションやAPIは送信元IPが揺れると壊れやすい。
- DNS/NTP to routerのルールにはgateway groupを付けない。
- WAN port forwardは作らない。

EN:

- Do not load balance SERVER or MGMT.
- Admin sessions and APIs can break if the source IP changes.
- Do not attach a gateway group to DNS/NTP-to-router rules.
- Do not create WAN port forwards.

## 7. DHCP / DHCP設計

| VLAN | Range |
| --- | --- |
| MAIN | `10.10.10.100 - 10.10.10.199` |
| SERVER | fixed first; optional `10.10.20.100 - 10.10.20.149` |
| IOT | `10.10.30.100 - 10.10.30.249` |
| GUEST | `10.10.40.100 - 10.10.40.249` |
| LAB | `10.10.50.100 - 10.10.50.199` |
| MGMT | fixed only |

## 8. Local DNS / ローカルDNS

Register these records on OPNsense Unbound or local DNS.

OPNsense UnboundまたはローカルDNSに登録します。

```text
ai.home.arpa          -> 10.10.20.30
ha.home.arpa          -> 10.10.20.30
status.home.arpa      -> 10.10.20.30
dash.home.arpa        -> 10.10.20.30
git.home.arpa         -> 10.10.20.30
n8n.home.arpa         -> 10.10.20.30
grafana.home.arpa     -> 10.10.20.30
prometheus.home.arpa  -> 10.10.20.30

proxmox.home.arpa     -> 10.10.60.10
nas.home.arpa         -> 10.10.20.20
```

JP:

- `home.arpa` は家庭内ローカル用途。
- public DNSへは登録しない。

EN:

- `home.arpa` is for local home networks.
- Do not publish these names to public DNS.

## 9. Proxmox Bridge / Proxmoxブリッジ

Back up first.

先にバックアップします。

```bash
cp /etc/network/interfaces /root/interfaces.backup.$(date +%F-%H%M)
```

`/etc/network/interfaces`:

```ini
auto lo
iface lo inet loopback

iface eno1 inet manual

auto vmbr0
iface vmbr0 inet manual
    bridge-ports eno1
    bridge-stp off
    bridge-fd 0
    bridge-vlan-aware yes
    bridge-vids 10 20 30 40 50 60

auto vmbr0.60
iface vmbr0.60 inet static
    address 10.10.60.10/24
    gateway 10.10.60.1

source /etc/network/interfaces.d/*
```

Apply and verify.

反映して確認します。

```bash
ifreload -a
ip addr show vmbr0.60
bridge vlan show
ping -c 3 10.10.60.1
```

Proxmox GUI:

```text
https://10.10.60.10:8006
```

## 10. VM Plan / VM設計

| VM ID | Name | VLAN | IP | vCPU | RAM | Disk | Purpose |
| ---: | --- | ---: | --- | ---: | ---: | ---: | --- |
| 101 | `haos` | 20 | `10.10.20.50` | 2 | 4GB | 64GB | Home Assistant |
| 102 | `docker-core` | 20 | `10.10.20.30` | 4 | 16GB | 200GB | Docker services |
| 103 | `ai-gpu` | 20 | `10.10.20.40` | 8 | 32GB+ | 300GB+ | optional GPU AI |
| 150 | `lab-kali` | 50 | DHCP or `10.10.50.10` | 4 | 8GB | 80GB | validation |
| 151 | `lab-targets` | 50 | DHCP | as needed | as needed | as needed | vulnerable targets |

Verify VLAN tags.

VLAN tagを確認します。

```bash
qm config 101 | grep net0  # tag=20
qm config 102 | grep net0  # tag=20
qm config 150 | grep net0  # tag=50
```

## 11. Docker Core VM / Docker Core VM

JP:

- Ubuntu Server 24.04 LTSまたはDebian 12。
- Docker CoreはSERVER VLAN 20へ置く。
- IPは `10.10.20.30/24`。

EN:

- Use Ubuntu Server 24.04 LTS or Debian 12.
- Place Docker Core in SERVER VLAN 20.
- IP is `10.10.20.30/24`.

Create VM sketch.

VM作成例。

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

Cloud-init sketch.

cloud-init例。

```bash
qm set 102 \
  --ide2 local-lvm:cloudinit \
  --ciuser elisia \
  --ipconfig0 ip=10.10.20.30/24,gw=10.10.20.1 \
  --nameserver 10.10.20.1
```

## 12. Docker Deployment / Docker配置

Copy files.

ファイルをコピーします。

```bash
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
rsync -av ./deploy/elisia-core/ elisia@10.10.20.30:/opt/elisia-core/
ssh elisia@10.10.20.30
cd /opt/elisia-core
```

Use these files.

使用ファイル:

| File | Purpose |
| --- | --- |
| `deploy/elisia-core/compose.yaml` | Docker Compose stack |
| `deploy/elisia-core/setup.sh` | Docker Core automated setup |
| `deploy/elisia-core/.env.example` | environment template |
| `deploy/elisia-core/caddy/Caddyfile` | local HTTPS reverse proxy |
| `deploy/elisia-core/prometheus/prometheus.yml` | Prometheus scrape config |
| `deploy/elisia-core/homepage/config/*.yaml` | Homepage dashboard config |
| `deploy/elisia-core/backup-volumes.sh` | Docker volume backup |

Automated setup.

自動セットアップ:

```bash
chmod +x setup.sh backup-volumes.sh
sudo ./setup.sh --install-docker --bind-ip 10.10.20.30 --pull-model llama3.2
```

Dry run.

起動しない事前準備:

```bash
sudo ./setup.sh --install-docker --bind-ip 10.10.20.30 --no-start
```

Generate secrets.

秘密値を作ります。

```bash
openssl rand -hex 32
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32
```

Generate Caddy basic auth hash.

Caddy Basic Auth用hashを作ります。

```bash
docker run --rm caddy:2 caddy hash-password --plaintext 'strong-password-here'
```

Start stack.

起動します。

```bash
docker compose -f compose.yaml pull
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
```

Pull a model.

モデルを取得します。

```bash
docker compose -f compose.yaml exec ollama ollama pull llama3.2
```

## 13. Services / サービス

| Service | JP | EN |
| --- | --- | --- |
| Caddy | ローカルHTTPS reverse proxy | Local HTTPS reverse proxy |
| Ollama | ローカルLLM runtime | Local LLM runtime |
| Open WebUI | AIチャットUI | AI chat UI |
| Uptime Kuma | 死活監視 | Uptime monitoring |
| Homepage | ダッシュボード | Dashboard |
| Gitea | ローカルGit forge | Local Git forge |
| n8n | 自動化workflow | Automation workflows |
| Mosquitto | MQTT broker | MQTT broker |
| Prometheus | Metrics database | Metrics database |
| Grafana | Metrics dashboard | Metrics dashboard |

## 14. Security Decisions / セキュリティ方針

| Risk | JP Fix | EN Fix |
| --- | --- | --- |
| Dual WAN session breakage | SERVER/MGMTはfailoverのみ | SERVER/MGMT use failover only |
| Management exposure | WAN port forwardなし。Tailscale/VPNを使う | No WAN port forwards. Use Tailscale/VPN |
| Docker socket exposure | Homepageは`docker-socket-proxy`経由 | Homepage uses `docker-socket-proxy` |
| Prometheus exposure | Caddy basic auth配下 | Protected by Caddy basic auth |
| Service sprawl | LAN公開portを最小化 | Minimize LAN-exposed ports |
| IoT/Lab lateral movement | RFC1918 blockを先に置く | Put RFC1918 blocks before internet allows |
| Secret leakage | `.env`は本番VMに置き、Git管理しない | Keep `.env` on the production VM, not in Git |

## 15. Firewall Summary / Firewall概要

JP:

- MAINからDocker Coreの `80,443,2222` を許可。
- Admin PCからProxmoxの `8006,22` を許可。
- SERVERからMGMT/MAINへの横移動は原則block。
- IOTからはDNS/NTP/MQTT/Home Assistant必要ポートのみ許可。
- GUESTからRFC1918をblock。
- LABからRFC1918をblock。
- MGMTはAdmin PCとMGMT subnetを中心に限定。

EN:

- Allow MAIN to Docker Core on `80,443,2222`.
- Allow Admin PC to Proxmox on `8006,22`.
- Block SERVER lateral movement to MGMT/MAIN by default.
- Allow IOT only to DNS/NTP/MQTT/Home Assistant required ports.
- Block GUEST to RFC1918.
- Block LAB to RFC1918.
- Restrict MGMT mainly to Admin PC and MGMT subnet.

## 16. Proxmox Firewall / Proxmox Firewall

Datacenter policy.

Datacenter設定:

```text
Firewall: Yes
Input Policy: DROP
Output Policy: ACCEPT
Forward Policy: ACCEPT
```

Node allow rules.

Node許可ルール:

| Action | Direction | Source | Destination Port | Comment |
| --- | --- | --- | --- | --- |
| ACCEPT | IN | `10.10.10.10` | `8006` | Admin PC to Proxmox GUI |
| ACCEPT | IN | `10.10.10.10` | `22` | Admin PC SSH |
| ACCEPT | IN | `10.10.20.30` | ICMP | Monitor ping |
| ACCEPT | IN | `10.10.60.0/24` | any | MGMT subnet |

JP:

- 有効化前に必ずローカルコンソールを確保する。

EN:

- Ensure local console access before enabling it.

## 17. Caddy Internal CA / Caddy内部CA

Copy root certificate.

root証明書を取り出します。

```bash
cd /opt/elisia-core
docker cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy/root.crt
```

JP:

- Admin PC、スマホ、タブレットに `root.crt` を信頼させる。
- LAN内HTTPS警告を減らせる。

EN:

- Trust `root.crt` on admin PCs, phones, and tablets.
- This reduces LAN HTTPS warnings.

## 18. Home Assistant Behind Caddy / Caddy配下のHome Assistant

Add to Home Assistant `configuration.yaml`.

Home Assistantの `configuration.yaml` に追加します。

```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 10.10.20.30
```

Then restart Home Assistant.

その後、Home Assistantを再起動します。

## 19. Backup / バックアップ

Use:

使用:

```text
deploy/elisia-core/backup-volumes.sh
```

Cron:

```cron
30 3 * * * /opt/elisia-core/backup-volumes.sh >> /opt/elisia-core/backups/backup.log 2>&1
```

JP:

- Proxmox VM backup。
- Home Assistant backup。
- Docker volume backup。
- NAS snapshot。
- Router config export。
- 月1回の復旧テスト。

EN:

- Proxmox VM backup.
- Home Assistant backup.
- Docker volume backup.
- NAS snapshot.
- Router config export.
- Monthly restore test.

## 20. Validation / 検証

Proxmox:

```bash
ip addr show vmbr0.60
bridge vlan show
ping -c 3 10.10.60.1
```

Docker:

```bash
cd /opt/elisia-core
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs caddy --tail=50
```

DNS:

```bash
nslookup ai.home.arpa
nslookup ha.home.arpa
nslookup grafana.home.arpa
```

Firewall:

```bash
# MAIN
curl -k https://ai.home.arpa
curl -k https://ha.home.arpa

# IOT should fail toward MAIN/MGMT
ping 10.10.10.10
ping 10.10.60.10

# LAB should fail toward internal VLANs
ping 10.10.10.10
ping 10.10.20.30
ping 10.10.60.10
```

Multi-WAN:

```text
1. Disconnect WAN1.
2. Confirm SERVER/MGMT outbound continues through WAN2.
3. Reconnect WAN1.
4. Confirm sessions return without exposing inbound services.
5. Test optional load balance only on MAIN/GUEST after failover works.
```

## 21. Build Order / 構築順

| Step | JP | EN |
| ---: | --- | --- |
| 1 | OPNsense WAN1のみで初期疎通 | Bring up OPNsense with WAN1 only |
| 2 | VLAN作成 | Create VLANs |
| 3 | Switch trunk/access設定 | Configure switch trunk/access ports |
| 4 | Proxmox `vmbr0`をVLAN-aware化 | Make Proxmox `vmbr0` VLAN-aware |
| 5 | MGMT VLAN 60からProxmox GUI確認 | Confirm Proxmox GUI from MGMT VLAN 60 |
| 6 | HAOS VM作成 | Create HAOS VM |
| 7 | Docker Core VM作成 | Create Docker Core VM |
| 8 | Docker Compose起動 | Start Docker Compose |
| 9 | Caddy / DNS確認 | Verify Caddy / DNS |
| 10 | Firewallを段階的に締める | Tighten firewall rules gradually |
| 11 | Uptime Kuma監視 | Add Uptime Kuma monitoring |
| 12 | Backup | Configure backup |
| 13 | Lab VLAN投入 | Add Lab VLAN |
| 14 | WAN2追加 | Add WAN2 |
| 15 | Gateway group failover検証 | Validate gateway group failover |
| 16 | MAIN/GUESTだけload balance検証 | Test load balancing only for MAIN/GUEST |

## 22. Access / アクセス先

```text
Proxmox:
https://10.10.60.10:8006

Dashboard:
https://dash.home.arpa

Local AI:
https://ai.home.arpa

Home Assistant:
https://ha.home.arpa

Monitoring:
https://status.home.arpa
https://grafana.home.arpa
https://prometheus.home.arpa

Git:
https://git.home.arpa

Automation:
https://n8n.home.arpa

MQTT:
10.10.20.30:1883
```

## 23. Final Notes / 最終メモ

JP:

この構成は、派手な公開サーバではなく、家の内側に置く静かな中枢です。まずは落ちないWAN、分離されたVLAN、戻せるバックアップ、閉じた管理面を優先します。GPUや派手な演出はあとから足せます。

EN:

This build is not a flashy public server. It is a quiet internal core for the home. Prioritize resilient WAN, isolated VLANs, restorable backups, and closed management access first. GPU power and visual polish can be added later.
