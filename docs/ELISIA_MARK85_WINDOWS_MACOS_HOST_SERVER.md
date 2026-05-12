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

## Allowed Safe Scope / 許可する安全範囲

These Mark LXXXV-inspired features are allowed and encouraged:

- Software simulation: robotics and control-algorithm learning inside a safe virtual environment with no physical device actuation.
- SF HUD design: cinematic, advanced HUD-style web application screens for local dashboards and demos.
- Secure system administration: authenticated, encrypted, LAN-only dashboards that follow `docs/CUSTOMIZATION_SECURITY_GUIDE.md`.

許可する範囲:

- ソフトウェアシミュレーション: 物理デバイスを動かさない仮想環境で、ロボティクス制御アルゴリズムを学習・可視化する。
- SF的なUIデザイン: 映画的なHUD風Webアプリケーション画面を、安全なローカルUIとして作る。
- セキュアなシステム管理: `docs/CUSTOMIZATION_SECURITY_GUIDE.md` に従い、認証、暗号化、入力検証、レート制限、セキュリティヘッダーを備えたLAN内完結のダッシュボードを構築する。

## Safe Physical Prop Alternatives / 安全な現実プロップ代替

These are allowed when they remain costume, display, or education props:

- Cosplay / prop nanotech suit: front-opening chest, shoulder, or forearm panels using magnets, hinges, zippers, or low-power decorative motion.
- Low-output electric prop: small servo or DC motor motion for light panels only, controlled by Arduino or ESP32, with no lifting, no load-bearing, and no flight.
- Helmet-focused build: front-opening visor, small internal display, LED accents, and local voice lines inspired by a fictional assistant.

Required limits:

- Low voltage only, with accessible power cutoff.
- No sharp edges, pinch hazards, heat buildup, or body-load-bearing structure.
- No weapons, projectiles, propulsion, high-power output, or autonomous physical action.
- Public demonstrations should have a manual disable switch and a handler nearby.

Recommended first build:

1. Helmet visor + HUD audio.
2. Front-opening chest and shoulder display prop.
3. Low-output forearm panel motion.
4. Full visual suit shell after the single modules are comfortable and safe.
