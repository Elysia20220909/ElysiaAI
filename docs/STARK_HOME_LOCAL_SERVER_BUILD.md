# Stark Home Local Server Build

E.L.I.S.I.A.向けローカルサーバ設計書。実機へ落とす前提の正本。

前提:

- VLAN対応ルータ/FirewallはOPNsense想定。pfSenseでも同じ考え方。
- 将来WAN回線を2本契約する。初期はWAN1だけでも動く。
- VLAN対応スイッチ + VLAN対応Wi-Fi AP。
- Proxmox物理NICは1本trunk。管理VLANは分離。
- Proxmox物理NIC名は仮に `eno1`。
- Proxmox VMストレージ名は仮に `local-lvm`。
- Docker Core VMは `10.10.20.30`。
- 公開サービスではなく、自宅LAN内サービス。外部管理はTailscale推奨。

実ファイル:

- Docker Core: `deploy/elisia-core/compose.yaml`
- Docker Core automated setup: `deploy/elisia-core/setup.sh`
- Caddy: `deploy/elisia-core/caddy/Caddyfile`
- Prometheus: `deploy/elisia-core/prometheus/prometheus.yml`
- Homepage: `deploy/elisia-core/homepage/config/*.yaml`
- 自動セットアップ手順: `docs/STARK_HOME_AUTOMATED_SETUP.md`
- Proxmox/OPNsense手順: `docs/STARK_HOME_PROXMOX_OPNSENSE_CHECKLIST.md`

## Topology

```text
Internet WAN1
  |
ISP1 ONU / modem
  |
        +------------------+
Internet WAN2             |
  |                       |
ISP2 ONU / modem          |
  |                       |
  +---- [OPNsense Router / Firewall]
              |
        LAN trunk port
              |
        [Managed Switch]
          |       |        |
          |       |        +-- Wi-Fi AP trunk: MAIN / IOT / GUEST SSID
          |       +----------- NAS access VLAN20: 10.10.20.20
          +------------------- Proxmox trunk
                                  MGMT: 10.10.60.10
                                  VM VLAN tags: 20, 50
```

WAN方針:

- `WAN1`: 主回線。SERVER/MGMTは通常こちらを使う。
- `WAN2`: 副回線。WAN1障害時のfailover。必要ならGUEST/MAINの一部だけload balance。
- `SERVER` と `MGMT` はload balanceしない。送信元IPが揺れると管理セッション、API、通知連携が壊れやすい。
- 外部からのport forwardは作らない。必要な管理はTailscaleかVPN。

## VLAN / IP Plan

| VLAN | Name | Network | Purpose |
| ---: | --- | --- | --- |
| 10 | `MAIN` | `10.10.10.0/24` | PC、スマホ、普段使い端末 |
| 20 | `SERVER` | `10.10.20.0/24` | Docker、NAS、AI、監視 |
| 30 | `IOT` | `10.10.30.0/24` | 家電、センサー、カメラ |
| 40 | `GUEST` | `10.10.40.0/24` | 来客Wi-Fi |
| 50 | `LAB` | `10.10.50.0/24` | CTF、検証、脆弱VM |
| 60 | `MGMT` | `10.10.60.0/24` | Proxmox、ルータ、スイッチ管理 |
| 999 | `BLACKHOLE` | none | 未使用ポート隔離 |

固定IP:

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

## Switch Port Plan

| Port | Target | Mode | VLAN |
| --- | --- | --- | --- |
| Port 1 | OPNsense LAN | Trunk | tagged `10,20,30,40,50,60` |
| Port 2 | Proxmox | Trunk | tagged `10,20,30,40,50,60` |
| Port 3 | NAS | Access | untagged `20` |
| Port 4 | Wi-Fi AP | Trunk | tagged `10,30,40`; AP管理VLANは機種依存 |
| Port 5 | Admin PC | Access | untagged `10` |
| Port 6 | IoT Hub | Access | untagged `30` |
| Port 7 | Lab端末 | Access | untagged `50` |
| unused | none | Access | untagged `999` |

VLAN 1は本番/管理用途に使わない。native VLANは機器都合で必要な場合だけ明示する。

## OPNsense Multi-WAN

Interface:

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

Gateway groups:

| Group | WAN1 | WAN2 | Use |
| --- | --- | --- | --- |
| `GWG_FAILOVER` | Tier 1 | Tier 2 | SERVER/MGMT/critical traffic |
| `GWG_BALANCE_CLIENTS` | Tier 1 | Tier 1 | optional MAIN/GUEST web traffic |
| `GWG_WAN2_TEST` | never | Tier 1 | testing WAN2 before production |

Gateway group trigger:

- Start with `Member Down`.
- After a week of baseline logs, consider `Packet Loss or High Latency`.
- Use gateway monitor IPs that are reachable through each ISP. Do not use the same monitor if one ISP filters it.

Outbound NAT:

- Use Hybrid or Manual outbound NAT.
- Add NAT rules for every internal VLAN via `WAN1 address`.
- Add matching NAT rules for every internal VLAN via `WAN2 address`.
- Do not NAT traffic between internal VLANs.

Firewall rule ordering for every VLAN:

1. Allow DNS/NTP to router.
2. Allow explicit internal destinations.
3. Block forbidden RFC1918/internal networks.
4. Allow internet with gateway group.
5. Default block.

Do not put the gateway group on local DNS/NTP rules. Policy routing local router traffic can create strange failures.

## DHCP Plan

| VLAN | Range |
| --- | --- |
| MAIN | `10.10.10.100 - 10.10.10.199` |
| SERVER | fixed first; optional `10.10.20.100 - 10.10.20.149` |
| IOT | `10.10.30.100 - 10.10.30.249` |
| GUEST | `10.10.40.100 - 10.10.40.249` |
| LAB | `10.10.50.100 - 10.10.50.199` |
| MGMT | fixed only |

## Local DNS

Register these records on OPNsense Unbound or local DNS:

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

`home.arpa` is for local home networks. Keep split-horizon DNS local. Do not publish these names to public DNS.

## Proxmox Bridge

Back up first:

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

Apply:

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

## VM Plan

| VM ID | Name | VLAN | IP | vCPU | RAM | Disk | Purpose |
| ---: | --- | ---: | --- | ---: | ---: | ---: | --- |
| 101 | `haos` | 20 | `10.10.20.50` | 2 | 4GB | 64GB | Home Assistant |
| 102 | `docker-core` | 20 | `10.10.20.30` | 4 | 16GB | 200GB | Docker services |
| 103 | `ai-gpu` | 20 | `10.10.20.40` | 8 | 32GB+ | 300GB+ | optional GPU AI |
| 150 | `lab-kali` | 50 | DHCP or `10.10.50.10` | 4 | 8GB | 80GB | validation |
| 151 | `lab-targets` | 50 | DHCP | as needed | as needed | as needed | vulnerable targets |

Critical VM NIC tags:

```bash
qm config 101 | grep net0  # tag=20
qm config 102 | grep net0  # tag=20
qm config 150 | grep net0  # tag=50
```

## Docker Core VM

Ubuntu Server 24.04 LTS or Debian 12.

VM creation sketch:

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

Use cloud-init:

```bash
qm set 102 \
  --ide2 local-lvm:cloudinit \
  --ciuser elisia \
  --ipconfig0 ip=10.10.20.30/24,gw=10.10.20.1 \
  --nameserver 10.10.20.1
```

## Docker Deployment

Copy `deploy/elisia-core` to `/opt/elisia-core` on Docker Core VM.

```bash
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
rsync -av ./deploy/elisia-core/ elisia@10.10.20.30:/opt/elisia-core/
ssh elisia@10.10.20.30
cd /opt/elisia-core
```

Automated setup:

```bash
chmod +x setup.sh backup-volumes.sh
sudo ./setup.sh --install-docker --bind-ip 10.10.20.30 --pull-model llama3.2
```

Prepare without starting containers:

```bash
sudo ./setup.sh --install-docker --bind-ip 10.10.20.30 --no-start
```

Create `.env` from `.env.example`.

Generate secrets:

```bash
openssl rand -hex 32
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32
```

Generate Caddy basic auth hash:

```bash
docker run --rm caddy:2 caddy hash-password --plaintext 'strong-password-here'
```

Start:

```bash
docker compose -f compose.yaml pull
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
```

Pull a model:

```bash
docker compose -f compose.yaml exec ollama ollama pull llama3.2
```

## Security Review Fixes Applied

| Risk | Fix |
| --- | --- |
| Dual WAN load balance breaks admin/server sessions | `SERVER` and `MGMT` use `GWG_FAILOVER`, not balance |
| Management exposed by port forward | no WAN port forwards; use Tailscale/VPN |
| Homepage Docker socket direct mount | `docker-socket-proxy` exposes read-only limited Docker API |
| Prometheus unauthenticated | no host port; Caddy basic auth required |
| Internal service ports scattered on LAN | only Caddy `80/443`, Gitea SSH `2222`, MQTT `1883` bind to `10.10.20.30` |
| IoT/Lab lateral movement | RFC1918/internal blocks before internet allow |
| Public DNS for private services | all `home.arpa` records stay local |
| Secrets in backups | backup script uses `umask 077`; NAS backup path must be restricted |
| App signups open by default | Open WebUI signup disabled; Gitea registration disabled |
| `latest` surprise upgrades | critical image tags are configurable in `.env`; pin digests after first stable build |

## Firewall Summary

MAIN:

| Action | Source | Destination | Port | Gateway |
| --- | --- | --- | --- | --- |
| Pass | `ADMIN_HOSTS` | `PROXMOX` | `TCP 8006,22` | default |
| Pass | `MAIN_NET` | `DOCKER_CORE` | `TCP 80,443,2222` | default |
| Pass | `MAIN_NET` | `NAS` | `TCP 445,2049` | default |
| Block | `MAIN_NET` | `MGMT_NET` | any | default |
| Block | `MAIN_NET` | `IOT_NET` | any | default |
| Pass | `MAIN_NET` | any | `TCP 80,443` | `GWG_FAILOVER`; optional `GWG_BALANCE_CLIENTS` |

SERVER:

| Action | Source | Destination | Port | Gateway |
| --- | --- | --- | --- | --- |
| Pass | `SERVER_NET` | router | DNS/NTP | default |
| Pass | `DOCKER_CORE` | `HOME_ASSISTANT` | `TCP 8123` | default |
| Block | `SERVER_NET` | `MGMT_NET` | any | default |
| Block | `SERVER_NET` | `MAIN_NET` | any | default |
| Pass | `SERVER_NET` | any | `TCP 80,443` | `GWG_FAILOVER` |

IOT:

| Action | Source | Destination | Port | Gateway |
| --- | --- | --- | --- | --- |
| Pass | `IOT_NET` | router | DNS/NTP | default |
| Pass | `IOT_NET` | `DOCKER_CORE` | `TCP 1883,8883` | default |
| Pass | `IOT_NET` | `HOME_ASSISTANT` | required only | default |
| Block | `IOT_NET` | `RFC1918` | any | default |
| Pass | `IOT_NET` | any | `TCP 80,443` | `GWG_FAILOVER` |

GUEST:

| Action | Source | Destination | Port | Gateway |
| --- | --- | --- | --- | --- |
| Pass | `GUEST_NET` | router | DNS/NTP | default |
| Block | `GUEST_NET` | `RFC1918` | any | default |
| Pass | `GUEST_NET` | any | `TCP 80,443` | `GWG_FAILOVER` or `GWG_BALANCE_CLIENTS` |

LAB:

| Action | Source | Destination | Port | Gateway |
| --- | --- | --- | --- | --- |
| Pass | `LAB_NET` | router | DNS/NTP | default |
| Block | `LAB_NET` | `RFC1918` | any | default |
| Pass | `LAB_NET` | any | `TCP 80,443` | `GWG_FAILOVER` |

MGMT:

| Action | Source | Destination | Port | Gateway |
| --- | --- | --- | --- | --- |
| Pass | `ADMIN_HOSTS` | `MGMT_NET` | `TCP 22,80,443,8006` | default |
| Pass | `MGMT_NET` | router | DNS/NTP | default |
| Pass | `MGMT_NET` | any | `TCP 80,443` | `GWG_FAILOVER` |
| Block | any | `MGMT_NET` | any | default |

## Proxmox Firewall

Datacenter:

```text
Firewall: Yes
Input Policy: DROP
Output Policy: ACCEPT
Forward Policy: ACCEPT
```

Node rules:

| Action | Direction | Source | Destination Port | Comment |
| --- | --- | --- | --- | --- |
| ACCEPT | IN | `10.10.10.10` | `8006` | Admin PC to Proxmox GUI |
| ACCEPT | IN | `10.10.10.10` | `22` | Admin PC SSH |
| ACCEPT | IN | `10.10.20.30` | ICMP | Monitor ping |
| ACCEPT | IN | `10.10.60.0/24` | any | MGMT subnet |

Enable only with console access ready.

## Caddy Internal CA

Copy root certificate:

```bash
cd /opt/elisia-core
docker cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy/root.crt
```

Install `root.crt` on admin devices to remove local HTTPS warnings.

## Home Assistant Behind Caddy

Add to Home Assistant `configuration.yaml`:

```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 10.10.20.30
```

Then restart Home Assistant.

## Backup

Use `deploy/elisia-core/backup-volumes.sh` on Docker Core.

Cron:

```cron
30 3 * * * /opt/elisia-core/backup-volumes.sh >> /opt/elisia-core/backups/backup.log 2>&1
```

Old backup pruning is safe by default: script only prints expired directories unless `PRUNE_OLD_BACKUPS=true` is set.

## Validation

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

## Build Order

```text
1. OPNsense WAN1 onlyで初期疎通
2. VLAN作成
3. Switch trunk/access設定
4. Proxmox vmbr0 VLAN-aware化
5. MGMT VLAN 60からProxmox GUI確認
6. HAOS VM作成
7. docker-core VM作成
8. Docker Compose起動
9. Caddy / DNS確認
10. Firewallを段階的に締める
11. Uptime Kuma監視
12. Backup
13. Lab VLAN投入
14. WAN2追加
15. Gateway group failover検証
16. 必要ならMAIN/GUESTだけload balance検証
```

## Access

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

This completes E.L.I.S.I.A. Core: VLAN isolation, local TLS, local AI, automation, monitoring, backups, Lab containment, and future dual-WAN resilience.
