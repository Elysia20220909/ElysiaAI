# E.L.I.S.I.A. Mark LXXXV Windows / macOS Host Server / 本体サーバ化・費用・美観仕様

This is the bilingual entry point for the Mark LXXXV-inspired Windows / macOS E.L.I.S.I.A. host server plan.

この文書は、Iron Man Mark LXXXV を安全なデザイン思想として取り入れた、E.L.I.S.I.A. Windows / macOS 本体サーバ化・自動セットアップ・美観・費用計算の入口です。

## Full Documents

| Language | File |
| --- | --- |
| 日本語 | [ELISIA_MARK85_WINDOWS_MACOS_HOST_SERVER.ja.md](./ELISIA_MARK85_WINDOWS_MACOS_HOST_SERVER.ja.md) |
| English | [ELISIA_MARK85_WINDOWS_MACOS_HOST_SERVER.en-US.md](./ELISIA_MARK85_WINDOWS_MACOS_HOST_SERVER.en-US.md) |

## Summary / 要約

Mark LXXXV is required here as a **design language**, not as a real suit, weapon, propulsion system, or hazardous hardware project.

ここで必要な Mark LXXXV は、実在スーツや兵器ではなく、E.L.I.S.I.A. を美しく、安全に、分散型ローカルAI基盤として組むための設計言語です。

- Arc Core: Windows PC / Mac host running E.L.I.S.I.A. Core.
- Nanotech Fabric: Docker services that can be composed, replaced, and restored.
- HUD: Homepage, Grafana, Uptime Kuma, Open WebUI, and local dashboards.
- F.R.I.D.A.Y.: local assistant surfaces and Codex / Antigravity workbench.
- Safety Governor: LAN-only exposure, secrets discipline, UPS, backups, and no WAN port-forwarding.

Recommended starting point:

- Reuse existing Windows / Mac if budget matters.
- Choose Mac mini for quiet desk-side beauty.
- Choose Windows mini workstation if RAM, SSD, or NVIDIA GPU expansion matters.
- Move to Proxmox later when isolation becomes more important than desk simplicity.

## Cost Snapshot / 費用スナップショット

Planning estimates use:

```text
1 USD ~= 157 JPY
```

| Tier | Use | Estimate |
| --- | --- | ---: |
| Arc Reactor Minimal | Existing Windows/Mac + SSD + UPS | USD 250-900 / JPY 39,000-141,000 |
| Mark LXXXV Desk Core | Mac mini or compact Windows host + SSD + UPS + tidy accessories | USD 1,300-3,400 / JPY 204,000-534,000 |
| Hall of Armor Studio | Host + NAS + UniFi-class network + UPS + small rack | USD 3,800-5,800 / JPY 597,000-911,000 |
| Stark Lab Expansion | High-end compact host or GPU PC + NAS + stronger UPS/network | USD 6,500-10,000+ / JPY 1,021,000-1,570,000+ |

Monthly electricity estimate:

```text
monthly_kWh = watts * 24 * 30 / 1000
monthly_cost = monthly_kWh * electricity_rate
```

Example:

```text
60W average host stack ~= 43.2 kWh/month
At JPY 35/kWh ~= JPY 1,512/month
At USD 0.18/kWh ~= USD 7.78/month
```

## Related Documents / 関連文書

- [Windows / macOS Host Server](./ELISIA_WINDOWS_MACOS_HOST_SERVER.md)
- [Local Server Automated Setup](./ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.md)
- [Local Server Hardware Design](./ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.md)
- [Mark LXXXV Distributed Wearable Computing Spec](./fictional/MARK85_DISTRIBUTED_WEARABLE_COMPUTING_SPEC.md)
- [Mark LXXXV Fantasy Suit System](./fictional/MARK85_FANTASY_SUIT_SYSTEM.md)

## Safety Boundary / 安全境界

- No real weapon, flight, propulsion, exoskeleton, or dangerous device instructions.
- No WAN port-forward by default.
- No secrets in Git.
- No automated destructive setup.
- Mark LXXXV references are used for UI, architecture, resilience, and visual style only.
