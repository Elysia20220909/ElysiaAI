# E.L.I.S.I.A. Mark LXXXV Windows / macOS Host Server, Automated Setup, Style, and Cost Plan

## Summary

This document defines the Mark LXXXV-required version of the E.L.I.S.I.A. Windows / macOS host server plan.

Mark LXXXV is used here as a safe design language. It is not a real suit, weapon, propulsion system, exoskeleton, or hazardous hardware project.

The goal is a local-first AI host that feels like a calm desk-side armor system:

- **Arc Core**: the Windows PC or Mac running E.L.I.S.I.A. Core.
- **Nanotech Fabric**: Docker Compose services that can be swapped, restored, and upgraded.
- **HUD**: Homepage, Grafana, Uptime Kuma, Open WebUI, and local dashboards.
- **F.R.I.D.A.Y.**: AEGIS-FRIDAY, Codex, and Antigravity Workbench surfaces.
- **Safety Governor**: LAN-only exposure, secrets discipline, UPS, backups, and no WAN port-forwarding.

The recommended first build is the **Mark LXXXV Desk Core**: a quiet Mac mini or compact Windows host, external SSD or internal NVMe, UPS, short cables, low-brightness status lights, and local DNS.

## Why Mark LXXXV Is Required

The useful engineering metaphor in Mark LXXXV is not power. It is coordination.

Many small subsystems form one visible, responsive, safety-aware platform. E.L.I.S.I.A. should follow that pattern:

- Docker services act like modular armor segments.
- Dashboards act like the helmet HUD.
- Backups and UPS behave like armor integrity and life support.
- Local policy keeps automation bounded.
- Human review remains the final safety layer.

## Safety Boundary

This document does not provide:

- weapon construction instructions
- flight or propulsion construction instructions
- exoskeleton or hazardous wearable hardware instructions
- dangerous automation steps
- public-exposure guidance for admin surfaces

It does provide:

- Windows / macOS local server architecture
- Docker / Compose setup flow
- dashboard and HUD design
- cost planning
- monthly electricity formulas
- safe local-first operations

## Recommended Architecture

```text
Mark LXXXV Desk Core
  |
  +-- Windows PC / Mac
  |     |
  |     +-- Docker Desktop / Colima / OrbStack
  |     +-- E.L.I.S.I.A. Core
  |     +-- Open WebUI / Ollama
  |     +-- Homepage HUD
  |     +-- Uptime Kuma
  |     +-- Grafana / Prometheus
  |     +-- Gitea / n8n / MQTT
  |
  +-- External SSD or internal NVMe
  +-- UPS
  +-- Optional NAS
  +-- Local DNS / hosts
  +-- MAIN or SERVER VLAN
```

Mark LXXXV mapping:

| Mark LXXXV Concept | E.L.I.S.I.A. Implementation | Purpose |
| --- | --- | --- |
| Arc Core | Windows / Mac host | Local AI core |
| Nanotech Fabric | Docker Compose services | Replace, restore, expand |
| Helmet HUD | Homepage / Grafana / Uptime Kuma | System visibility |
| F.R.I.D.A.Y. | AEGIS-FRIDAY / Codex / Antigravity | Assistant and implementation support |
| Safety Governor | Firewall / bind IP / backups / UPS | Bound automation and recover safely |
| Armor Integrity | backup, disk health, service health | Detect failure early |
| Power Envelope | UPS, watt budget, thermal margin | Manage heat and power |

## Cost Tiers

These are planning estimates. Tax, shipping, import duties, exchange-rate movement, installation work, and sales are excluded.

Planning rate:

```text
1 USD ~= 157 JPY
```

| Tier | Contents | Estimate |
| --- | --- | ---: |
| Arc Reactor Minimal | Existing Windows/Mac, external SSD, UPS, Docker runtime | USD 250-900 / JPY 39,000-141,000 |
| Mark LXXXV Desk Core | Mac mini or compact Windows host, SSD, UPS, tidy cabling | USD 1,300-3,400 / JPY 204,000-534,000 |
| Hall of Armor Studio | Host, NAS, UniFi-class network, UPS, small rack | USD 3,800-5,800 / JPY 597,000-911,000 |
| Stark Lab Expansion | High-end host or GPU PC, NAS, stronger UPS/network | USD 6,500-10,000+ / JPY 1,021,000-1,570,000+ |

## Cost Breakdown

### Arc Reactor Minimal

| Item | Estimate |
| --- | ---: |
| Existing Windows/Mac reuse | USD 0 |
| External SSD 2TB | USD 120-250 |
| UPS 1000-1500VA | USD 180-350 |
| Cables, labels, stand | USD 50-150 |
| Total | USD 250-900 |

Best for:

- validating E.L.I.S.I.A. quickly
- using hardware you already own
- delaying NAS and rack decisions

### Mark LXXXV Desk Core

| Item | Estimate |
| --- | ---: |
| Mac mini / Windows mini workstation | USD 800-2,400 |
| 2TB-4TB SSD | USD 150-500 |
| UPS | USD 180-350 |
| 2.5GbE adapter / small switch | USD 50-250 |
| Cable, stand, lighting cleanup | USD 120-300 |
| Total | USD 1,300-3,400 |

Best for:

- quiet always-on operation
- a stylish desk-side host
- local AI, dashboards, and light automation

### Hall of Armor Studio

| Item | Estimate |
| --- | ---: |
| Host | USD 1,400-2,800 |
| NAS + drives | USD 1,200-2,200 |
| Router / switch / AP | USD 500-900 |
| UPS + rack + cables | USD 500-900 |
| Extra SSD / backup media | USD 200-600 |
| Total | USD 3,800-5,800 |

Best for:

- growing E.L.I.S.I.A. into a home foundation
- prioritizing NAS, backup, monitoring, and network segmentation
- preparing for a later Proxmox migration

### Stark Lab Expansion

| Item | Estimate |
| --- | ---: |
| High-end host / GPU PC | USD 2,500-5,500 |
| Additional GPU | USD 1,300-3,800+ |
| NAS expansion | USD 1,500-3,000 |
| 10GbE / stronger UPS / rack cooling | USD 1,000-2,500 |
| Total | USD 6,500-10,000+ |

Best for:

- heavy local LLMs
- generative AI workloads
- multiple VMs and high-speed NAS traffic

## Monthly Electricity Calculation

Formula:

```text
monthly_kWh = average_watts * 24 * 30 / 1000
monthly_cost = monthly_kWh * electricity_rate
```

Examples:

| Average Draw | kWh/month | JPY 35/kWh | USD 0.18/kWh |
| ---: | ---: | ---: | ---: |
| 25W | 18.0 | JPY 630 | USD 3.24 |
| 60W | 43.2 | JPY 1,512 | USD 7.78 |
| 120W | 86.4 | JPY 3,024 | USD 15.55 |
| 300W | 216.0 | JPY 7,560 | USD 38.88 |

Guidance:

- Mac mini-style hosts are strong for quiet, low-power Desk Core builds.
- Windows mini workstations offer expansion, but power varies widely by CPU/GPU.
- GPU PCs should be evaluated for heat, noise, UPS capacity, and room comfort before electricity cost.

## Windows Automated Setup

Prerequisites:

- Windows 11
- Docker Desktop with WSL2 backend
- Bun
- static IP or DHCP reservation when publishing on LAN

Check:

```powershell
docker version
docker compose version
bun --version
```

Prepare safely:

```powershell
bun run local-server:host
```

Start local-only:

```powershell
bun run local-server:host -- --domain-suffix localhost --start
```

Start on LAN:

```powershell
bun run local-server:host -- --bind-ip 10.10.20.30 --domain-suffix home.arpa --start
```

Mark LXXXV HUD checks:

- `https://dash.localhost` or `https://dash.home.arpa`
- `https://ai.localhost` or `https://ai.home.arpa`
- `https://grafana.localhost` or `https://grafana.home.arpa`
- `https://status.localhost` or `https://status.home.arpa`

## macOS Automated Setup

Prerequisites:

- Mac mini, Mac Studio, or an always-on Mac
- Docker Desktop, Colima, or OrbStack
- Bun
- sleep disabled or reduced for server operation

Check:

```bash
docker version
docker compose version
bun --version
```

Prepare safely:

```bash
bun run local-server:host
```

Start local-only:

```bash
bun run local-server:host -- --domain-suffix localhost --start
```

Start on LAN:

```bash
bun run local-server:host -- --bind-ip 10.10.20.30 --domain-suffix home.arpa --start
```

macOS notes:

- Decide how FileVault and restart behavior should work.
- Confirm Docker runtime starts after reboot.
- Trust the Caddy root CA in Keychain Access.
- Use a desktop setup that can remain powered and ventilated.

## Style Requirements

Mark LXXXV styling is not just red and gold. It is clean lines, visible state, quiet readiness, and light that appears only when useful.

Recommended:

- Choose two or three from **black / warm gold / deep red / aluminum / natural wood**.
- Keep RGB low or off.
- Use short same-color Ethernet cables with labels on both ends.
- Hide SSD cabling behind the host.
- Put UPS where it has airflow but does not dominate the desk.
- Use dashboards as the visible HUD, not decorative clutter.

Desk layout:

```text
[Display / HUD]
      |
[Mac mini or compact PC] -- short cable -- [External SSD]
      |
  hidden cable tray
      |
    [UPS under desk]
```

Shelf layout:

```text
Top:     AP or low-light status panel
Middle:  Host + switch
Middle:  NAS
Bottom:  UPS
```

## Security Checklist

- [ ] Validate on `127.0.0.1` first.
- [ ] Publish on LAN only with explicit `--bind-ip`.
- [ ] No WAN port-forward exists.
- [ ] `.env` and `setup-secrets.txt` are outside Git.
- [ ] Docker Desktop shared folders are minimal.
- [ ] Backup to NAS or external SSD exists.
- [ ] UPS can support safe shutdown.
- [ ] Admin surfaces are on MAIN/SERVER VLAN or private VPN only.

## Done Criteria

- [ ] `docker compose config --quiet` passes.
- [ ] `https://ai.localhost` or `https://ai.home.arpa` opens.
- [ ] `https://dash.localhost` or `https://dash.home.arpa` opens.
- [ ] `https://status.localhost` or `https://status.home.arpa` opens.
- [ ] Main services are visible in Uptime Kuma.
- [ ] Weekly backup destination is defined.
- [ ] Cable layout is maintainable.
- [ ] The Mark LXXXV requirements can be explained as HUD, Safety Governor, Nanotech Fabric, and Arc Core.

## References

- [Windows / macOS Host Server](./ELISIA_WINDOWS_MACOS_HOST_SERVER.md)
- [Local Server Automated Setup](./ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.md)
- [Local Server Hardware Design](./ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.md)
- [Mark LXXXV Distributed Wearable Computing Spec](./fictional/MARK85_DISTRIBUTED_WEARABLE_COMPUTING_SPEC.md)
- [Mark LXXXV Fantasy Suit System](./fictional/MARK85_FANTASY_SUIT_SYSTEM.md)
- [Apple Mac mini](https://www.apple.com/shop/buy-mac/mac-mini)
- [Apple Mac Studio](https://www.apple.com/mac-studio/)
- [Docker Desktop license agreement](https://docs.docker.com/subscription/desktop-license/)
- [Microsoft Windows 11 Pro](https://www.microsoft.com/en-us/d/windows-11-pro/dg7gmgf0d8h4)

## Conclusion

The Mark LXXXV version of E.L.I.S.I.A. is not about showing force.

It is a quiet local core, a clean HUD, replaceable service modules, and a safety governor that keeps the system recoverable. For a first build, a Windows / macOS host server is the most graceful way to put that small future on the desk.
