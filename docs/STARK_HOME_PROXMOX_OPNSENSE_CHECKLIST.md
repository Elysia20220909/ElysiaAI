# Stark Home Proxmox / OPNsense Checklist

実機作業用チェックリスト。正本は `docs/STARK_HOME_LOCAL_SERVER_BUILD.md`。

## 0. Before Touching Network

- [ ] Proxmoxローカルコンソールを確保
- [ ] OPNsenseローカルコンソールを確保
- [ ] スイッチへ直結できるPCを確保
- [ ] 現在のOPNsense設定をexport
- [ ] 現在のスイッチ設定をexport
- [ ] Proxmox `/etc/network/interfaces` をbackup
- [ ] Proxmox NIC名を確認: `ip link`
- [ ] Proxmox storage名を確認: `pvesm status`

## 1. OPNsense WAN1 Initial

- [ ] `WAN1` を設定
- [ ] OPNsense自身からinternetへ疎通
- [ ] DNS resolverを有効化
- [ ] NTPを有効化
- [ ] WANから管理GUI/SSHが閉じていることを確認
- [ ] port forwardが空であることを確認

## 2. VLAN Interfaces

- [ ] Parent interfaceを確認: internal LAN trunk port
- [ ] VLAN 10 `MAIN` 作成
- [ ] VLAN 20 `SERVER` 作成
- [ ] VLAN 30 `IOT` 作成
- [ ] VLAN 40 `GUEST` 作成
- [ ] VLAN 50 `LAB` 作成
- [ ] VLAN 60 `MGMT` 作成
- [ ] Interfacesへassign
- [ ] 各interfaceをenable
- [ ] IP設定:

```text
MAIN    10.10.10.1/24
SERVER  10.10.20.1/24
IOT     10.10.30.1/24
GUEST   10.10.40.1/24
LAB     10.10.50.1/24
MGMT    10.10.60.1/24
```

## 3. DHCP

- [ ] MAIN DHCP: `10.10.10.100 - 10.10.10.199`
- [ ] SERVER DHCP optional: `10.10.20.100 - 10.10.20.149`
- [ ] IOT DHCP: `10.10.30.100 - 10.10.30.249`
- [ ] GUEST DHCP: `10.10.40.100 - 10.10.40.249`
- [ ] LAB DHCP: `10.10.50.100 - 10.10.50.199`
- [ ] MGMT DHCP disabled or reservations only

## 4. Switch

- [ ] Router port: trunk tagged `10,20,30,40,50,60`
- [ ] Proxmox port: trunk tagged `10,20,30,40,50,60`
- [ ] NAS port: access untagged `20`
- [ ] Wi-Fi AP port: trunk tagged `10,30,40`
- [ ] Admin PC port: access untagged `10`
- [ ] IoT hub port: access untagged `30`
- [ ] Lab port: access untagged `50`
- [ ] Unused ports: access untagged `999`, disabled if possible
- [ ] VLAN 1 not used for management

## 5. Proxmox Bridge

- [ ] Backup:

```bash
cp /etc/network/interfaces /root/interfaces.backup.$(date +%F-%H%M)
```

- [ ] Set `/etc/network/interfaces`:

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

- [ ] Apply: `ifreload -a`
- [ ] Confirm: `ip addr show vmbr0.60`
- [ ] Confirm: `bridge vlan show`
- [ ] Confirm: `ping -c 3 10.10.60.1`
- [ ] Confirm GUI: `https://10.10.60.10:8006`

## 6. VM Creation

- [ ] HAOS VM 101: VLAN tag `20`, IP `10.10.20.50`
- [ ] Docker Core VM 102: VLAN tag `20`, IP `10.10.20.30`
- [ ] Optional AI GPU VM 103: VLAN tag `20`, IP `10.10.20.40`
- [ ] Lab Kali VM 150: VLAN tag `50`
- [ ] Confirm:

```bash
qm config 101 | grep net0
qm config 102 | grep net0
qm config 150 | grep net0
```

## 7. OPNsense Aliases

- [ ] `ADMIN_HOSTS`: `10.10.10.10`
- [ ] `RFC1918`: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- [ ] `MAIN_NET`: `10.10.10.0/24`
- [ ] `SERVER_NET`: `10.10.20.0/24`
- [ ] `IOT_NET`: `10.10.30.0/24`
- [ ] `GUEST_NET`: `10.10.40.0/24`
- [ ] `LAB_NET`: `10.10.50.0/24`
- [ ] `MGMT_NET`: `10.10.60.0/24`
- [ ] `PROXMOX`: `10.10.60.10`
- [ ] `DOCKER_CORE`: `10.10.20.30`
- [ ] `HOME_ASSISTANT`: `10.10.20.50`
- [ ] `NAS`: `10.10.20.20`

## 8. Firewall Before WAN2

- [ ] MAIN: admin host to Proxmox `TCP 8006,22`
- [ ] MAIN: MAIN to Docker Core `TCP 80,443,2222`
- [ ] MAIN: block MAIN to MGMT except admin allow
- [ ] MAIN: block MAIN to IOT
- [ ] SERVER: allow DNS/NTP to router
- [ ] SERVER: allow Docker Core to Home Assistant `TCP 8123`
- [ ] SERVER: block SERVER to MGMT
- [ ] SERVER: block SERVER to MAIN
- [ ] IOT: allow DNS/NTP to router
- [ ] IOT: allow MQTT to Docker Core `TCP 1883,8883`
- [ ] IOT: block IOT to RFC1918 after required HA/MQTT allows
- [ ] GUEST: allow DNS/NTP to router
- [ ] GUEST: block GUEST to RFC1918
- [ ] LAB: allow DNS/NTP to router
- [ ] LAB: block LAB to RFC1918
- [ ] MGMT: allow `ADMIN_HOSTS` to MGMT `TCP 22,80,443,8006`
- [ ] MGMT: block any to MGMT after explicit allows

## 9. Docker Core

- [ ] Install Docker Engine and Compose plugin
- [ ] Copy `deploy/elisia-core` to `/opt/elisia-core`
- [ ] `cp .env.example .env`
- [ ] Replace all secrets in `.env`
- [ ] Create Caddy basic auth hash
- [ ] Create Mosquitto password file
- [ ] Validate compose:

```bash
docker compose -f compose.yaml config --quiet
```

- [ ] Start:

```bash
docker compose -f compose.yaml up -d
```

- [ ] Pull Ollama model
- [ ] Copy Caddy root CA and trust it on admin devices

## 10. Local DNS

- [ ] `ai.home.arpa -> 10.10.20.30`
- [ ] `ha.home.arpa -> 10.10.20.30`
- [ ] `status.home.arpa -> 10.10.20.30`
- [ ] `dash.home.arpa -> 10.10.20.30`
- [ ] `git.home.arpa -> 10.10.20.30`
- [ ] `n8n.home.arpa -> 10.10.20.30`
- [ ] `grafana.home.arpa -> 10.10.20.30`
- [ ] `prometheus.home.arpa -> 10.10.20.30`
- [ ] `proxmox.home.arpa -> 10.10.60.10`
- [ ] `nas.home.arpa -> 10.10.20.20`

## 11. WAN2 Add

- [ ] Connect ISP2 to `WAN2`
- [ ] Configure WAN2 address/DHCP/PPPoE as required
- [ ] Confirm OPNsense can ping through WAN2
- [ ] Set WAN2 gateway monitor IP
- [ ] Create `GWG_FAILOVER`: WAN1 Tier 1, WAN2 Tier 2
- [ ] Create `GWG_BALANCE_CLIENTS`: WAN1 Tier 1, WAN2 Tier 1
- [ ] Create `GWG_WAN2_TEST`: WAN2 Tier 1
- [ ] Add outbound NAT rules for all VLANs on WAN2
- [ ] Set SERVER/MGMT internet rules to `GWG_FAILOVER`
- [ ] Set MAIN/GUEST internet rules to `GWG_FAILOVER`
- [ ] Optional later: move MAIN/GUEST web rules to `GWG_BALANCE_CLIENTS`
- [ ] Do not set gateway group on DNS/NTP-to-router rules

## 12. WAN2 Failover Test

- [ ] From MAIN: open `https://ai.home.arpa`
- [ ] From SERVER: `curl https://example.com`
- [ ] Disconnect WAN1
- [ ] Confirm `GWG_FAILOVER` sends traffic via WAN2
- [ ] Confirm local services still resolve
- [ ] Confirm Proxmox GUI is reachable from Admin PC
- [ ] Reconnect WAN1
- [ ] Confirm failback
- [ ] Check firewall logs for blocked IOT/LAB/MGMT attempts

## 13. Proxmox Firewall

- [ ] Datacenter Firewall enabled
- [ ] Datacenter Input Policy `DROP`
- [ ] Datacenter Output Policy `ACCEPT`
- [ ] Datacenter Forward Policy `ACCEPT`
- [ ] Node allow Admin PC to `8006`
- [ ] Node allow Admin PC to `22`
- [ ] Node allow Docker Core ICMP
- [ ] Node allow MGMT subnet
- [ ] Enable only with console access

## 14. Backups

- [ ] Proxmox scheduled backups enabled
- [ ] Home Assistant backups enabled
- [ ] `/opt/elisia-core` config backup tested
- [ ] Docker volume backup script executable
- [ ] NAS backup path restricted
- [ ] Router config export archived
- [ ] Restore test performed once

## 15. Done Criteria

- [ ] Admin PC can reach Proxmox, Dashboard, AI, HA, Grafana
- [ ] Guest cannot reach RFC1918
- [ ] IoT cannot reach MAIN/MGMT
- [ ] Lab cannot reach MAIN/SERVER/MGMT
- [ ] Docker services only expose expected LAN ports
- [ ] Prometheus requires Caddy basic auth
- [ ] Homepage has no direct Docker socket mount
- [ ] WAN1 failover to WAN2 works
- [ ] No WAN port forwards exist
