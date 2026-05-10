# E.L.I.S.I.A. Windows / macOS Host Server Design

This document explains how to turn a Windows PC or Mac itself into the E.L.I.S.I.A. local server.

Before building a separated Proxmox server, the current Windows or macOS machine can become a desk-side E.L.I.S.I.A. core. With a quiet host, short cables, UPS, local DNS, and Docker, the system can wake up without a large rack.

## Summary

Windows / macOS host mode is the fastest path to place E.L.I.S.I.A. Core in your living workspace.

- Best for: personal development, desk-side AI, local dashboards, light LLMs, and early Home Assistant validation.
- Not best for: strict VM isolation, many Lab VMs, public services, or multi-user home production.
- Safe default: bind to `127.0.0.1`. Use `--bind-ip` intentionally for LAN service.
- Setup entry point: `bun run local-server:host`.
- When the system grows, migrate toward the Proxmox design in [E.L.I.S.I.A. Core Home Server Blueprint](./ELYSIA_HOME_SERVER_BLUEPRINT.md).

## Price Basis

Prices are planning estimates checked on 2026-05-10. Tax, shipping, exchange-rate movement, import fees, and sales are excluded.

Planning exchange rate:

```text
1 USD ~= 157 JPY
```

| Build | Fit | Estimate |
| --- | --- | ---: |
| Reuse existing Windows/Mac | Minimum validation; add Docker Desktop, external SSD, UPS | USD 0-500 / JPY 0-79,000 |
| Mac mini host | Quiet, beautiful, always-on desk setup | USD 1,200-2,700 / JPY 188,000-424,000 |
| Windows mini workstation | Easier RAM/SSD expansion in a compact body | USD 900-2,800 / JPY 141,000-440,000 |
| Mac Studio / high-end compact PC | Heavier local AI, creative work, always-on services | USD 2,500-6,500+ / JPY 393,000-1,021,000+ |
| NAS + UPS + network add-ons | External foundation around the host server | USD 1,200-2,500 / JPY 188,000-393,000 |

## Which Host

| Topic | Windows host server | macOS host server |
| --- | --- | --- |
| Strength | RAM/SSD upgrades, GPU, Windows development, WSL2 | Quiet operation, low power, Mac mini/Mac Studio aesthetics |
| Docker | Docker Desktop + WSL2 | Docker Desktop / Colima / OrbStack-class runtime |
| Local AI | Strong with NVIDIA GPU builds | Good for Ollama, MLX-class workflows, smaller LLMs |
| Always-on concerns | Windows Update and restart policy | Sleep, FileVault, power recovery |
| Visual style | Mini PC, vertical stand, black/white setup | Mac mini, aluminum stand, clean desk |

## Stylish Hardware

| Role | Windows candidate | macOS candidate | Estimate |
| --- | --- | --- | ---: |
| Host | Existing PC / ASUS NUC / Minisforum / Beelink / Framework Desktop | Mac mini / Mac Studio | USD 0-6,500+ |
| Storage | 2TB-4TB NVMe / Thunderbolt SSD | 2TB-4TB Thunderbolt SSD | USD 150-700 |
| NAS | UGREEN / Synology 4-bay | UGREEN / Synology 4-bay | USD 600-1,200+ |
| UPS | 1000-1500VA sine-wave UPS | 1000-1500VA sine-wave UPS | USD 180-350 |
| Network | 2.5GbE adapter, UniFi gateway/switch/AP | Thunderbolt/USB-C 2.5GbE, UniFi | USD 300-900 |
| Appearance | vertical stand, cable tray, labels | aluminum stand, short cables, wood shelf | USD 80-300 |

Visual guidance:

- For desk placement, limit the palette to two or three of black, white, aluminum, and wood.
- Route external SSD cables behind the host.
- Put the UPS under the desk or shelf with airflow.
- Use short same-color Ethernet cables with labels on both ends.
- Prefer reliable uptime over aggressive sleep settings.

## Recommended Architecture

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

## Automated Setup

Use this cross-platform host-mode setup entry point:

```bash
bun run local-server:host
```

By default it:

- Copies `deploy/elisia-core` into `~/elisia-core-host`.
- Creates `.env`.
- Generates secrets.
- Generates the Caddy basic auth hash.
- Creates the Mosquitto password file.
- Runs `docker compose config --quiet`.
- Does not start containers.

To start containers:

```bash
bun run local-server:host -- --start
```

To serve on the LAN:

```bash
bun run local-server:host -- --bind-ip 10.10.20.30 --domain-suffix home.arpa --start
```

For local-only testing:

```bash
bun run local-server:host -- --domain-suffix localhost --start
```

Notes:

- Docker Desktop or another Docker runtime must be running.
- Docker Desktop has a no-cost tier for personal use, education, non-commercial open source, startups, and qualifying small businesses; check the license for other commercial use.
- Do not commit generated `.env` or `setup-secrets.txt`.
- With `127.0.0.1`, other devices cannot reach the services. Use `--bind-ip` only when you mean to publish on the LAN.

## Windows Host Steps

1. Prepare Windows 11 Pro or Windows 11 Home with Docker Desktop.
2. Enable virtualization support in BIOS/UEFI.
3. Install Docker Desktop and enable the WSL2 backend.
4. Confirm in PowerShell.

```powershell
docker version
docker compose version
bun --version
```

5. Prepare safely.

```powershell
bun run local-server:host
```

6. Start on the LAN.

```powershell
bun run local-server:host -- --bind-ip 10.10.20.30 --start
```

7. Point DNS or hosts entries for `ai.home.arpa` and related names to the host IP.
8. Trust the Caddy root CA in the Windows certificate store.

## macOS Host Steps

1. Prepare a Mac mini, Mac Studio, or always-on Mac.
2. Install Docker Desktop, Colima, OrbStack, or an equivalent Docker runtime.
3. Confirm Homebrew/Bun/Docker.

```bash
docker version
docker compose version
bun --version
```

4. Prepare safely.

```bash
bun run local-server:host
```

5. Start on the LAN.

```bash
bun run local-server:host -- --bind-ip 10.10.20.30 --start
```

6. Point DNS or hosts entries for `ai.home.arpa` and related names to the host IP.
7. Trust the Caddy root CA in Keychain Access.
8. Reduce sleep settings and rely on UPS for power trouble.

## Security Boundaries

- Do not create WAN port forwards.
- Validate on `127.0.0.1` before LAN publishing.
- Keep Docker Desktop shared folders minimal.
- Do not commit `.env`, `setup-secrets.txt`, or backup archives.
- Keep administration on MAIN VLAN, Tailscale, or WireGuard.
- Because Windows/macOS machines often mix daily use with server work, do not place secrets in Downloads, synced folders, or browser extensions.

## Difference From Proxmox

| Topic | Windows/macOS host server | Proxmox design |
| --- | --- | --- |
| Setup speed | Fast | Slower |
| Appearance | Easy to place on a desk | Better on a rack or shelf |
| Isolation | Weaker | Stronger |
| Recovery | Depends on host OS | Easier VM snapshots |
| GPU | Strong on Windows; Apple Silicon path on Mac | Requires passthrough planning |
| Long-term fit | Personal lab | Home foundation |

## Done Criteria

- [ ] `docker compose config --quiet` passes.
- [ ] `https://ai.home.arpa` or `https://ai.localhost` opens.
- [ ] `https://dash.home.arpa` or `https://dash.localhost` opens.
- [ ] `.env` and `setup-secrets.txt` are kept out of Git.
- [ ] UPS or safe shutdown policy exists.
- [ ] NAS or external-disk backup policy exists.
- [ ] No WAN port forwards exist.

## References

- [Docker Personal](https://www.docker.com/products/personal/)
- [Docker Desktop license agreement](https://docs.docker.com/subscription/desktop-license/)
- [Apple Mac mini](https://www.apple.com/shop/buy-mac/mac-mini)
- [Apple Mac Studio](https://www.apple.com/mac-studio/)
- [MacRumors Mac mini pricing note](https://www.macrumors.com/2026/05/02/apple-just-raised-mac-mini-starting-price/)
- [Microsoft Windows 11 Pro](https://www.microsoft.com/en-us/d/windows-11-pro/dg7gmgf0d8h4)
- [Microsoft OpenSSH for Windows](https://learn.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse)
- [Tailscale downloads](https://tailscale.com/download)
- [Homebrew](https://brew.sh/)

## Conclusion

Turning a Windows PC or Mac into the first E.L.I.S.I.A. server is a good beginning.

You do not need to build the whole castle first. Put a quiet core on the desk, keep secrets inside, protect sleep with UPS and backups, and let the small light grow. When it becomes important enough, move it into the Proxmox house.
