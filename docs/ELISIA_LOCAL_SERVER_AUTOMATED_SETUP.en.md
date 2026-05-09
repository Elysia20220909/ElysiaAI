# E.L.I.S.I.A. Local Server Automated Setup Design

This document describes how to bring an E.L.I.S.I.A. local server from beautiful hardware to a running Docker Core stack with as little fragile manual work as possible.

It bridges the hardware and cost plan in [E.L.I.S.I.A. Local Server Hardware Design](./ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.md) with the practical network checklist in [Stark Home Proxmox / OPNsense Checklist](./STARK_HOME_PROXMOX_OPNSENSE_CHECKLIST.md).

## Summary

The automated setup should light the Docker Core hearth. It should not silently rewire the house.

- Recommended build tier: **Sovereign AI Studio**.
- Automation target: **Docker Core VM / Debian 12 / Ubuntu Server 24.04 LTS**.
- Main script: `deploy/elisia-core/setup.sh`.
- VLANs, OPNsense, Proxmox bridges, switch ports, and NAS pools stay manual checklist work.
- Recheck hardware sources in the hardware design document before purchase.

## Architecture

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

## Stylish Hardware Placement

Beauty is not decoration here. It is maintainability. Short cables, clear labels, and airflow make late-night recovery work calmer.

| Layer | Recommendation | Relationship to automated setup |
| --- | --- | --- |
| Minimal | Mac mini class / x86 mini PC + NAS + UniFi class network | Mac mini is better as a Docker/app host; `setup.sh` targets a Linux VM or x86 Linux host |
| Recommended | Framework Desktop / compact x86 Proxmox host + NAS + UniFi / OPNsense | Create Docker Core VM, then run `setup.sh` directly |
| GPU Rack | quiet ATX GPU workstation + NAS + stronger UPS | Configure GPU passthrough or AI VM manually; Docker Core still starts the same way |

Appearance guidance:

- Use a compact rack, short black or white Ethernet cables, and labels on both ends.
- Do not seal NAS or UPS units inside closed furniture.
- Place the AP on a ceiling or high shelf and dim its LEDs.
- Use Mac mini or mini PC hardware on a desk; use a compact rack on a shelf.

## Automated Scope

`deploy/elisia-core/setup.sh` automates:

- Docker Engine and Compose plugin installation on Debian/Ubuntu.
- `/opt/elisia-core/.env` creation from `.env.example`.
- Secret generation for WebUI, Gitea, n8n, Grafana, and MQTT.
- Caddy basic auth hash generation.
- Mosquitto password file creation.
- `docker compose config --quiet` validation.
- Container image pulls.
- E.L.I.S.I.A. Core stack startup.
- Optional Ollama model pull.

It does not automate:

- OPNsense WAN, VLAN, or firewall changes.
- Proxmox `vmbr0` or VLAN-aware bridge changes.
- Switch trunk or access port changes.
- NAS pools, snapshots, or backup jobs.
- Local DNS host overrides.
- Trusting the Caddy root CA on admin devices.
- WAN port forwards. The design intentionally avoids them.

## Prerequisites

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

Suggested static IPs:

| Device / VM | VLAN | IP |
| --- | ---: | --- |
| Router | each VLAN | `10.10.x.1` |
| Proxmox | MGMT 60 | `10.10.60.10` |
| NAS | SERVER 20 | `10.10.20.20` |
| Docker Core VM | SERVER 20 | `10.10.20.30` |
| Home Assistant VM | SERVER 20 | `10.10.20.50` |
| Admin PC | MAIN 10 | `10.10.10.10` |

## Step 0: Safety Check

- [ ] Local console access is available for OPNsense, Proxmox, and the switch.
- [ ] Current router, switch, and Proxmox configs are exported or backed up.
- [ ] NAS and host are connected to UPS.
- [ ] Admin UIs will not be exposed through WAN port forwards.
- [ ] `deploy/elisia-core/.env.example` stays in Git; real `.env` stays only on the VM.

## Step 1: Build the Network Foundation Manually

Use [Stark Home Proxmox / OPNsense Checklist](./STARK_HOME_PROXMOX_OPNSENSE_CHECKLIST.md) to configure:

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

Why this stays manual:

- A wrong router or switch change can lock you out of the LAN.
- Each device family uses different UI/API/config formats.
- Firewall rules are boundaries humans should read before applying.

## Step 2: Prepare the Docker Core VM

Create the Docker Core VM on Proxmox.

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

Cloud-init example:

```bash
qm set 102 \
  --ide2 local-lvm:cloudinit \
  --ciuser elisia \
  --ipconfig0 ip=10.10.20.30/24,gw=10.10.20.1 \
  --nameserver 10.10.20.1
```

Confirm SSH from the Admin PC.

```bash
ssh elisia@10.10.20.30
```

## Step 3: Copy Deploy Files

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

## Step 4: Safe Dry Run

Prepare Docker, `.env`, secrets, and Compose validation without starting containers.

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

Read generated bootstrap secrets.

```bash
sudo cat /opt/elisia-core/setup-secrets.txt
```

Move them to a password manager. Do not commit this file.

## Step 5: Start the Stack

After the dry run, start the stack on the same VM.

```bash
cd /opt/elisia-core
sudo ./setup.sh \
  --install-docker \
  --bind-ip 10.10.20.30 \
  --timezone Asia/Tokyo \
  --domain-suffix home.arpa \
  --pull-model llama3.2
```

Verify startup:

```bash
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs caddy --tail=50
docker compose -f compose.yaml exec -T ollama ollama list
```

## Step 6: DNS and Certificates

Register local DNS records in OPNsense Unbound or equivalent.

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

Copy the Caddy internal CA root certificate.

```bash
cd /opt/elisia-core
docker cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy/root.crt
```

Trust `root.crt` manually on admin devices and phones. This is not automated because each device has its own trust store and approval model.

## Step 7: Home Assistant Integration

If Home Assistant is accessed behind Caddy, add this to Home Assistant `configuration.yaml`.

```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 10.10.20.30
```

Restart Home Assistant afterwards.

## Step 8: Validation

From the Admin PC:

```bash
curl -k https://ai.home.arpa
curl -k https://dash.home.arpa
curl -k https://grafana.home.arpa
```

Inside the Docker Core VM:

```bash
cd /opt/elisia-core
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml ps
docker compose -f compose.yaml exec -T ollama ollama list
```

Isolation checks:

- Guest VLAN cannot reach RFC1918 networks.
- IoT VLAN cannot reach MAIN or MGMT.
- Lab VLAN cannot reach MAIN, SERVER, MGMT, or NAS.
- WAN port forwards are empty.

## Step 9: Backups

Use the Docker Core volume backup script.

```bash
cd /opt/elisia-core
chmod +x backup-volumes.sh
./backup-volumes.sh
```

Cron example:

```cron
30 3 * * * /opt/elisia-core/backup-volumes.sh >> /opt/elisia-core/backups/backup.log 2>&1
```

If backups are copied to the NAS, keep NAS permissions minimal. A backup only matters if it has been restored at least once.

## First Done Criteria

- [ ] `https://ai.home.arpa` opens.
- [ ] `https://dash.home.arpa` opens.
- [ ] `https://grafana.home.arpa` opens.
- [ ] `docker compose ps` looks correct.
- [ ] `setup-secrets.txt` was moved to a password manager and deleted from the VM.
- [ ] `.env` exists only on the VM and is not in Git.
- [ ] NAS backup target is chosen.
- [ ] Uptime Kuma monitors key services.
- [ ] No WAN port forwards exist.
- [ ] IoT, Guest, and Lab isolation was tested.

## Operating Rhythm

Daily:

- Look only at failed monitors.
- Check NAS capacity and UPS state.

Weekly:

- Review Docker image updates manually.
- Confirm Home Assistant and Docker Core backups.
- Snapshot before important changes.

Monthly:

- Restore-test one backup.
- Review VLAN and firewall rules.
- Remove unused models, containers, and stale logs.

## Security Boundaries

- Do not create WAN port forwards.
- Keep administration on LAN, Tailscale, or WireGuard.
- Do not commit `.env`, `setup-secrets.txt`, or backup archives.
- Homepage reads Docker data through `docker-socket-proxy`.
- Prometheus is viewed only behind Caddy basic auth.
- After initial account creation, do not leave n8n, Gitea, or Open WebUI registration open.
- Expand automation only where recovery is clear.

## Conclusion

E.L.I.S.I.A.'s automated setup is not a single spell.

Place good hardware beautifully, draw VLAN boundaries deliberately, let the UPS guard sleep, and use `setup.sh` to light Docker Core. That order is quiet, sturdy, and ready to grow.
