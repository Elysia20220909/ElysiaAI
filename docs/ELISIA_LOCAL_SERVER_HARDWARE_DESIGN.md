# E.L.I.S.I.A. Local Server Hardware Design / ローカルサーバ機材・費用設計

This is the bilingual entry point for E.L.I.S.I.A. local server hardware planning.

この文書は、E.L.I.S.I.A.向けローカルサーバの「機材選定・費用感・美観」をまとめる入口です。

## Full Documents

| Language | File |
| --- | --- |
| 日本語 | [ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.ja.md](./ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.ja.md) |
| English | [ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.en.md](./ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.en.md) |

## Summary / 要約

E.L.I.S.I.A.のローカルサーバは、最初から大きなGPUラックを組むよりも、静かで美しい基盤を先に作る方が長く強いです。

- まず守るもの: UPS、バックアップ、VLAN、管理画面の非公開化。
- まず育てるもの: NAS、ローカルAI、監視、復旧手順。
- 後から足すもの: 高性能GPU、10GbE、二重WAN、複雑な自動化。
- 美観の軸: 机上や棚に置いても意図が伝わる、白・黒・木目・ガラス・小型ラックの静かな構成。

For E.L.I.S.I.A., the strongest first build is not the loudest GPU rack. It is a quiet, beautiful local foundation that can be backed up, repaired, isolated, and trusted.

- Protect first: UPS, backups, VLANs, and private-only admin surfaces.
- Grow first: NAS, local AI, monitoring, and restore routines.
- Add later: large GPUs, 10GbE, second WAN, and advanced automation.
- Design language: intentional hardware that can live in a room, using clean lines, small racks, restrained lighting, wood, glass, black, or white.

## Price Basis / 価格前提

Prices are planning estimates checked on 2026-05-10. They exclude tax, shipping, import duties, installation work, and local sale fluctuations.

価格は 2026-05-10 時点の計画用概算です。税、送料、輸入費、施工費、セール変動は含めません。

Planning exchange rate:

```text
1 USD ~= 157 JPY
```

## Recommended Build / 推奨構成

The practical recommendation is **Sovereign AI Studio**: a small but serious compute host, NAS, UniFi-class network, UPS, and room-friendly rack. It leaves room for a GPU later without forcing the first purchase to become noisy or fragile.

実用上の推奨は **Sovereign AI Studio** です。小型でも本気の計算機、NAS、UniFi級ネットワーク、UPS、部屋に置けるラックを先に整えます。GPUは後から足せる形にして、最初の購入を重くしすぎません。

| Tier | Use | Estimated Cost |
| --- | --- | ---: |
| Glass Library Minimal | Quiet local AI, NAS, monitoring, home services | USD 2,700-3,500 / JPY 425,000-550,000 |
| Sovereign AI Studio | Recommended balanced build | USD 3,800-5,500 / JPY 600,000-865,000 |
| Sanctum GPU Rack | High-end local LLM and creative workloads | USD 6,500-9,500+ / JPY 1,020,000-1,490,000+ |

## Related Documents / 関連文書

- [E.L.I.S.I.A. Core Home Server Blueprint](./ELYSIA_HOME_SERVER_BLUEPRINT.md)
- [E.L.I.S.I.A. Local Server Automated Setup](./ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.md)
- [Stark Home Local Server Build](./STARK_HOME_LOCAL_SERVER_BUILD.md)
- [Local Home Server Ops](./LOCAL_HOME_SERVER_OPS.md)
- [Stark Home Proxmox / OPNsense Checklist](./STARK_HOME_PROXMOX_OPNSENSE_CHECKLIST.md)

## Source Links / 価格・機材ソース

Use these links before purchase, because prices and availability move often.

購入直前に必ず再確認してください。価格と在庫はよく動きます。

- [Apple Mac mini buy page](https://www.apple.com/shop/buy-mac/mac-mini)
- [MacRumors: Apple raised Mac mini starting price in 2026](https://www.macrumors.com/2026/05/02/apple-just-raised-mac-mini-starting-price/)
- [Framework Desktop](https://frame.work/desktop)
- [Tom's Hardware: Framework Desktop pricing update](https://www.tomshardware.com/desktops/gaming-pcs/diy-pc-maker-framework-finally-succumbs-to-ram-apocalypse-is-raising-prices-on-its-desktops-now-starts-at-usd1-139-with-32gb-128gb-up-usd450)
- [Ubiquiti Cloud Gateway Ultra](https://store.ui.com/us/en/products/ucg-ultra)
- [Ubiquiti Cloud Gateway Max](https://store.ui.com/us/en/products/ucg-max)
- [Ubiquiti Switch Lite 8 PoE](https://store.ui.com/us/en/products/usw-lite-8-poe)
- [Ubiquiti Flex 2.5G PoE](https://store.ui.com/us/en/products/usw-flex-2-5g-8-poe)
- [Ubiquiti U7 Pro](https://store.ui.com/us/en/products/u7-pro)
- [Ubiquiti Toolless Mini Rack](https://store.ui.com/us/en/products/toolless-mini-rack)
- [UGREEN NASync DXP4800 Plus](https://www.ugreen.com/products/ugreen-nasync-dxp4800-plus-nas-storage)
- [NVIDIA GeForce RTX 5080](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/)
- [NVIDIA GeForce RTX 5090](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/)
- [CyberPower CP1500PFCLCD UPS](https://www.cyberpowersystems.com/product/ups/pfc-sinewave/cp1500pfclcd/)
