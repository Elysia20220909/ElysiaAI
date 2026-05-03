# E.L.I.S.I.A. Core Home Server Blueprint

ElysiaAIを「トニー・スタークの家のようなローカル環境サーバ」へ育てるための実装設計です。

最初のゴールは派手な自動化ではなく、落ちない、漏れない、戻せるローカル基盤を作ることです。ElysiaAI側は、外部機器を直接操作する前に、状態監視、復旧導線、バックアップ確認、ネットワーク分離の可視化を担当します。

## Target Architecture

```text
Internet
  |
[Router / Firewall]
  |
  +-- VLAN10 Main      : PC / phone / admin clients
  +-- VLAN20 Servers   : Proxmox / NAS / monitoring
  +-- VLAN30 IoT       : home devices / sensors / cameras
  +-- VLAN40 Guest     : guest Wi-Fi
  +-- VLAN50 Lab       : CTF / sandbox / vulnerable VMs
        |
     [Proxmox VE]
        |
        +-- VM101 haos
        +-- VM102 docker-core
        |     +-- Ollama
        |     +-- Open WebUI
        |     +-- Uptime Kuma
        |     +-- Gitea / wiki / n8n
        |
        +-- VM103 monitor-sec
        +-- VM104 lab-net
        +-- VM105 ai-core
        |
     [NAS / TrueNAS]
     [UPS]
```

## Service Roles

| Role | Recommended surface | Purpose |
| --- | --- | --- |
| Virtualization mothership | Proxmox VE | Separate VMs and containers cleanly |
| Local AI | Ollama + Open WebUI | Local LLM, document search, operator support |
| Home nervous system | Home Assistant OS | Sensors, lights, notifications, future automation |
| Memory vault | TrueNAS / NAS / ZFS | Files, snapshots, restore points |
| Monitoring room | Uptime Kuma, then Grafana / Prometheus / Loki | Health, logs, metrics |
| Defense layer | VLAN + Tailscale + firewall | IoT isolation and protected management access |
| Lab sandbox | Lab VLAN | CTF and security experiments without lateral movement |

## Minimum Hardware Target

| Use | Baseline |
| --- | --- |
| Host | x86-64 mini PC or small server |
| CPU | 6 to 12 cores |
| RAM | 32GB minimum, 64GB preferred for AI and multiple VMs |
| SSD | 1TB NVMe, mirrored if possible |
| NIC | 1GbE minimum, 2.5GbE preferred |
| GPU | Optional at first, 12GB VRAM class when local AI grows |
| NAS | 2 to 4 bays, ZFS-friendly layout |
| UPS | Strongly recommended before always-on services |

## First VM Layout

| VM | Name | vCPU | RAM | Role |
| --- | ---: | ---: | ---: | --- |
| VM101 | `haos` | 2 | 4GB | Home Assistant OS |
| VM102 | `docker-core` | 4 | 8-16GB | Docker service host |
| VM103 | `monitor-sec` | 2-4 | 4-8GB | Monitoring and security logs |
| VM104 | `lab-net` | as needed | as needed | Isolated security lab |
| VM105 | `ai-core` | 6+ | 16GB+ | Dedicated AI host when GPU is added |

## Docker Core MVP

`docker-core` starts with Ollama, Open WebUI, and Uptime Kuma. Bind public service ports to localhost or an internal reverse proxy first; do not expose management UIs directly to the internet.

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    volumes:
      - ollama:/root/.ollama
    ports:
      - "127.0.0.1:11434:11434"
    restart: unless-stopped

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    depends_on:
      - ollama
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - WEBUI_AUTH=true
    volumes:
      - open-webui:/app/backend/data
    ports:
      - "127.0.0.1:3000:8080"
    restart: unless-stopped

  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    volumes:
      - uptime-kuma:/app/data
    ports:
      - "127.0.0.1:3001:3001"
    restart: unless-stopped

volumes:
  ollama:
  open-webui:
  uptime-kuma:
```

## Network Rules

| From | To | Allow | Notes |
| --- | --- | --- | --- |
| Main | Servers | HTTPS and SSH only | Admin devices only |
| Main | IoT | Deny by default | Operate through Home Assistant |
| IoT | Home Assistant | Required device ports only | Sensors and home devices |
| IoT | Internet | Minimal | Prefer DNS and NTP only when possible |
| Guest | Internet | Allow | No LAN access |
| Lab | Internet | Limited | Depends on experiment |
| Lab | Main / Servers | Deny | Prevent lateral movement |

## ElysiaAI Integration Gates

ElysiaAI must treat the home lab as manual-supervised infrastructure until these gates are visible in Local Ops:

- Backup status: latest VM/NAS backup time and restore-test marker.
- Disk status: NAS capacity, snapshot age, and critical free-space warnings.
- VPN status: Tailscale reachability and whether services are exposed only to expected networks.
- Model status: Ollama health, available models, and configured default model.
- Monitor status: Uptime Kuma heartbeat and alert channel readiness.
- Network status: VLAN intent documented before Home Assistant automation is enabled.
- Lab isolation: Lab VLAN cannot reach Main, Servers, or NAS.

## Operating Rhythm

Daily:

- Check only failed monitors and storage warnings.
- Keep optional services stopped unless needed.

Weekly:

- Confirm VM and Home Assistant backups.
- Review Docker update candidates manually.
- Check ElysiaAI Local Ops improvement queue.

Monthly:

- Patch Proxmox, VMs, Docker images, and Home Assistant after snapshots.
- Run one restore drill.
- Review VLAN and firewall rules.

Before any risky update:

```text
1. Read the change notes.
2. Take a snapshot.
3. Confirm backup completion.
4. Apply the update.
5. Verify services.
6. Roll back quickly if health checks fail.
```

## ElysiaAI Next Implementation

The next code improvement should extend Local Ops and Native Lite with a `home-server-readiness` model:

- `backup`: latest backup age, last restore drill, warning state.
- `storage`: disk usage, snapshot age, NAS reachability.
- `secureAccess`: Tailscale/VPN visibility and exposed ports.
- `models`: Ollama model inventory and selected default.
- `monitoring`: Uptime Kuma or future Prometheus readiness.
- `networkPlan`: documented VLAN intent and lab isolation checklist.

This keeps the system useful before it controls anything. The house can understand itself first; automation comes only after safety and recovery are boringly reliable.
