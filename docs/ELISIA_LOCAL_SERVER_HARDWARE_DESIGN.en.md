# E.L.I.S.I.A. Local Server Hardware and Cost Design

This document turns E.L.I.S.I.A. into a practical local-first server plan: what to buy, how much to budget, how to keep it quiet and beautiful, and how to leave room for serious AI later.

It complements the existing implementation documents. `ELYSIA_HOME_SERVER_BLUEPRINT.md` covers service roles and operating intent. `STARK_HOME_LOCAL_SERVER_BUILD.md` covers Proxmox, OPNsense, VLANs, and Docker Core. This file focuses on hardware, cost, purchasing order, and the visual design language of the build.

## Summary

The best first E.L.I.S.I.A. build is not a dramatic GPU rack. It is a quiet, recoverable, local foundation that earns trust before it grows powerful.

- Recommended tier: **Sovereign AI Studio**.
- Planning budget: **USD 3,800-5,500 / JPY 600,000-865,000**.
- Build network, UPS, NAS, and backups before GPU acceleration.
- Add GPU, 10GbE, second WAN, and complex automation later.
- Treat visual presence as part of the specification, not decoration.

## Price Basis

Prices are planning estimates checked on 2026-05-10.

- Tax, shipping, import duties, and installation work are excluded.
- JPY conversion uses a planning rate of `1 USD ~= 157 JPY`.
- Sale pricing, exchange rates, inventory, and GPU street prices can move sharply.
- Recheck the source links before purchase.

## Design Philosophy

An E.L.I.S.I.A. local server should feel like a small lighthouse in the home: quiet, watchful, and dependable. The goal is not spectacle first. The goal is a system that can be backed up, repaired, isolated, and trusted.

- **Local first**: keep private files, logs, home state, and operational evidence on the LAN where possible.
- **Manual supervision**: do not automate home devices or desktop input before monitoring and recovery paths exist.
- **UPS before GPU**: protect data before chasing performance.
- **VLAN before smart-home control**: separate IoT, Guest, Lab, Server, and Management networks early.
- **Aesthetics as a requirement**: choose hardware that looks intentional in the room.
- **Phased growth**: buy foundation, memory, compute, and acceleration in that order.

## Relationship to Existing Docs

| Document | Role |
| --- | --- |
| [E.L.I.S.I.A. Core Home Server Blueprint](./ELYSIA_HOME_SERVER_BLUEPRINT.md) | Service layout, VMs, and Local Ops integration |
| [Stark Home Local Server Build](./STARK_HOME_LOCAL_SERVER_BUILD.md) | Proxmox, OPNsense, VLANs, and Docker Core steps |
| [Local Home Server Ops](./LOCAL_HOME_SERVER_OPS.md) | Operational checks surfaced inside ElysiaAI |
| This document | Hardware candidates, costs, buying order, and aesthetic guidance |

## Build Tiers

| Tier | Purpose | Estimated Cost |
| --- | --- | ---: |
| Glass Library Minimal | Quiet, compact NAS, monitoring, light local AI, Home Assistant | USD 2,700-3,500 / JPY 425,000-550,000 |
| Sovereign AI Studio | Recommended balanced build with strong local services and GPU path | USD 3,800-5,500 / JPY 600,000-865,000 |
| Sanctum GPU Rack | High-end local LLM, creative workloads, and heavy VM use | USD 6,500-9,500+ / JPY 1,020,000-1,490,000+ |

## Tier 1: Glass Library Minimal

This is the quiet, elegant starting point. It suits a white shelf, a wood top, a small rack, and low-brightness status lights.

| Role | Example | Purpose | Estimate |
| --- | --- | --- | ---: |
| Core host | Apple Mac mini M4 class / Intel or AMD mini PC | Docker, light local AI, admin UIs | USD 799-1,200 |
| NAS | UGREEN NASync DXP4800 Plus / Synology 4-bay class | Files, backups, snapshots | USD 600-800 |
| NAS drives | 2-4x NAS HDD or SSD | Data storage; two drives are enough to start | USD 300-800 |
| Router | Ubiquiti Cloud Gateway Ultra | Routing, VLANs, management | USD 129 class |
| Switch | Ubiquiti Switch Lite 8 PoE | AP power and VLAN-aware switching | USD 109 class |
| Wi-Fi AP | Ubiquiti U7 Pro | MAIN/IOT/GUEST SSIDs | USD 189 class |
| UPS | CyberPower CP1500PFCLCD / APC 1500VA class | Safe shutdown during power loss | USD 220-330 |
| Appearance | cable tray, labels, short cables, shelf | Looks and maintainability | USD 100-300 |

Best fit:

- You want E.L.I.S.I.A. stable before it becomes large.
- The server will sit near a desk or living space.
- A large GPU is not required yet.
- NAS and backups are the priority.

Notes:

- A Mac mini is better treated as a Docker or application host than as a Proxmox host.
- If Proxmox is the center of the build, choose an x86 mini PC or workstation.
- Large local LLMs will require smaller models or later GPU expansion.

## Tier 2: Sovereign AI Studio

This is the recommended tier. It keeps the system small and elegant while giving E.L.I.S.I.A. enough memory, storage, and network reliability to become a real local command center.

| Role | Example | Purpose | Estimate |
| --- | --- | --- | ---: |
| Compute host | Framework Desktop / compact Ryzen AI Max class / x86 Proxmox host | VMs, Docker, local AI, development | USD 1,400-2,800 |
| Memory | 64-128GB RAM class | Headroom for VMs and inference | included or USD 250-700 |
| System SSD | 2TB NVMe, mirrored if possible | VMs, containers, models | USD 150-350 |
| NAS | UGREEN/Synology 4-bay NAS | Backups, media, documents | USD 600-900 |
| NAS drives | 4x NAS HDD, RAID/ZFS policy | Recoverable storage | USD 600-1,200 |
| Router | Ubiquiti Cloud Gateway Max / OPNsense box | VLANs, VPN, future 2.5GbE | USD 199-300 |
| Switch | Ubiquiti Flex 2.5G PoE / Lite 8 PoE | 2.5GbE, PoE, AP uplink | USD 109-199 |
| Wi-Fi AP | Ubiquiti U7 Pro | MAIN/IOT/GUEST | USD 189 class |
| Rack | Ubiquiti Toolless Mini Rack / compact 6U rack | Looks, airflow, cabling | USD 150-300 |
| UPS | 1500VA sine-wave UPS | Protect host and NAS | USD 220-350 |

Why this tier is recommended:

- It can run Proxmox, Docker Core, Home Assistant, monitoring, and NAS integrations comfortably.
- 128GB-class memory leaves room for several VMs.
- It lets the network and recovery story mature before a GPU enters the system.
- It fits in a compact rack and can live in a room without looking like industrial leftovers.

Initial services:

- Proxmox VE or Docker host
- Ollama
- Open WebUI
- Home Assistant OS
- Uptime Kuma
- Gitea
- n8n
- Local DNS
- NAS backup target
- Tailscale or private VPN

## Tier 3: Sanctum GPU Rack

This is the high-end local AI tier. It places a GPU workstation, NAS, UniFi-class network, and stronger UPS into a quieter rack layout.

| Role | Example | Purpose | Estimate |
| --- | --- | --- | ---: |
| GPU workstation | Fractal North / compact ATX quiet build | GPU inference, generative AI, heavy VMs | USD 2,000-3,500 before GPU |
| GPU | NVIDIA RTX 5080/5090 class | High-VRAM inference and image/video generation | USD 1,300-3,800+ market-dependent |
| RAM | 128-256GB | Large VMs, models, development | USD 400-1,300 |
| SSD | 4TB+ NVMe | Models, datasets, VMs | USD 250-700 |
| NAS | 4-8 bay NAS | Backups and snapshots | USD 900-2,000 |
| Drives | 4-8x NAS HDD | Long-term storage | USD 1,000-2,500 |
| Network | 2.5GbE/10GbE switch and gateway | NAS transfer, Lab, multiple clients | USD 500-1,500 |
| UPS | 1500-2200VA class | Headroom under GPU load | USD 350-900 |
| Rack and cooling | 6U-12U rack, fans, cable management | Heat, noise, appearance | USD 300-1,000 |

Best fit:

- You use local LLMs heavily.
- You want image generation, video generation, voice processing, or retrieval-augmented workflows on the LAN.
- You use AI Lab VLANs and validation VMs frequently.
- You value autonomy and speed more than minimizing the first purchase.

Notes:

- GPUs are the most volatile line item.
- Power draw, heat, noise, and UPS capacity must be planned together.
- Tier 2 first, then GPU later, is usually the calmer path.

## Recommended Purchase Order

1. Foundation: router, VLAN-aware switch, Wi-Fi AP, UPS.
2. Memory: NAS, NAS drives, backup target.
3. Compute: Mac mini, Framework Desktop, or x86 Proxmox host.
4. Operations: Uptime Kuma, backup notifications, restore procedures.
5. AI acceleration: GPU, additional RAM, additional SSD.
6. Beauty pass: small rack, short cables, labels, wood top, low-brightness LEDs.

This order keeps the system recoverable at every stage. The more hardware you add, the more value you get from clean cabling and boringly reliable restore procedures.

## Recommended Network

```text
Internet
  |
[Router / Firewall]
  |
[Managed PoE Switch]
  |
  +-- VLAN10 MAIN   : PC / phone / admin clients
  +-- VLAN20 SERVER : E.L.I.S.I.A. host / NAS / monitoring
  +-- VLAN30 IOT    : sensors / cameras / home devices
  +-- VLAN40 GUEST  : guest Wi-Fi
  +-- VLAN50 LAB    : CTF / sandbox / test VMs
  +-- VLAN60 MGMT   : router / switch / Proxmox management
```

Minimum guardrails:

- Do not port-forward admin UIs from WAN.
- Use Tailscale, WireGuard, or LAN-only access for administration.
- Do not allow IoT to reach MAIN or MGMT directly.
- Do not allow Lab to reach SERVER, MGMT, or NAS.
- Keep NAS in the SERVER VLAN and isolated from Guest and IoT.

## Visual Design

Stylish server hardware is not about loud RGB. It is about quiet consistency.

- Limit the palette to two or three of: black, white, natural wood, glass.
- Use a tidy compact rack if the equipment will be visible.
- Choose short same-color cables and label both ends.
- Prefer hardware with dimmable or disableable LEDs.
- Do not trap NAS or UPS units inside sealed furniture.
- Use Mac mini or mini PC hardware on a desk; use a compact rack on a shelf.

## Cost Guardrails

- Buy the UPS before the GPU.
- Start with 2.5GbE before wiring everything for 10GbE.
- Decide the backup policy before buying the largest possible NAS drives.
- Keeping router, switch, and AP in one ecosystem reduces operational friction.
- Choose OPNsense if firewall control matters more than a unified UI.
- Before buying a GPU only for generative AI, confirm the model, VRAM, power, and noise requirements.

## Recommended First Build

| Category | Recommendation |
| --- | --- |
| Host | Framework Desktop / x86 mini workstation class, 64-128GB RAM |
| NAS | UGREEN NASync DXP4800 Plus or Synology 4-bay class |
| Router | Ubiquiti Cloud Gateway Max or OPNsense mini appliance |
| Switch | Ubiquiti Flex 2.5G PoE or Switch Lite 8 PoE |
| AP | Ubiquiti U7 Pro |
| UPS | 1500VA sine-wave UPS |
| Rack | Ubiquiti Toolless Mini Rack or compact 6U rack |

Budget sketch:

```text
Base compute        USD 1,400-2,800
NAS + drives        USD 1,200-2,100
Network + Wi-Fi     USD   500-900
UPS + rack + cables USD   500-900
-----------------------------------
Total               USD 3,800-5,500
JPY                 JPY 600,000-865,000
```

## Excluded Costs

- Tax, shipping, duties, import fees.
- Installation labor, wall cabling, shelves, furniture.
- Display, keyboard, KVM.
- A second internet connection.
- Cloud backup subscriptions.
- Spare drives and replacement UPS batteries.

## Pre-Purchase Checklist

- [ ] Measure shelf depth, width, and height.
- [ ] Confirm airflow for NAS and UPS.
- [ ] Confirm router, switch, and AP support VLANs.
- [ ] Confirm the UPS can power both NAS and host long enough for safe shutdown.
- [ ] Decide that admin UIs will not be exposed to WAN.
- [ ] Choose a backup target separate from the main NAS volume.
- [ ] Confirm model and VRAM needs before buying a GPU.
- [ ] Budget for cable labels and short Ethernet cables.

## Price and Product Sources

Recheck these before purchase. Mac mini, Framework Desktop, GPUs, and NAS units can move quickly in price and availability.

| Item | Source |
| --- | --- |
| Apple Mac mini | [Apple Mac mini buy page](https://www.apple.com/shop/buy-mac/mac-mini), [MacRumors price note](https://www.macrumors.com/2026/05/02/apple-just-raised-mac-mini-starting-price/) |
| Framework Desktop | [Framework Desktop](https://frame.work/desktop), [Tom's Hardware pricing update](https://www.tomshardware.com/desktops/gaming-pcs/diy-pc-maker-framework-finally-succumbs-to-ram-apocalypse-is-raising-prices-on-its-desktops-now-starts-at-usd1-139-with-32gb-128gb-up-usd450) |
| Ubiquiti gateway / switch / AP / rack | [Cloud Gateway Ultra](https://store.ui.com/us/en/products/ucg-ultra), [Cloud Gateway Max](https://store.ui.com/us/en/products/ucg-max), [Switch Lite 8 PoE](https://store.ui.com/us/en/products/usw-lite-8-poe), [Flex 2.5G PoE](https://store.ui.com/us/en/products/usw-flex-2-5g-8-poe), [U7 Pro](https://store.ui.com/us/en/products/u7-pro), [Toolless Mini Rack](https://store.ui.com/us/en/products/toolless-mini-rack) |
| NAS | [UGREEN NASync DXP4800 Plus](https://www.ugreen.com/products/ugreen-nasync-dxp4800-plus-nas-storage) |
| GPU | [NVIDIA GeForce RTX 5080](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/), [NVIDIA GeForce RTX 5090](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/) |
| UPS | [CyberPower CP1500PFCLCD](https://www.cyberpowersystems.com/product/ups/pfc-sinewave/cp1500pfclcd/) |

## Conclusion

E.L.I.S.I.A.'s first server does not need to be enormous.

It should wake quietly, survive power trouble, keep private data inside the home, and return from failure without drama. It should also carry a little future in the corner of the room. For the first serious build, **Sovereign AI Studio** is the strongest balance.
