# E.L.I.S.I.A. Local Server Automated Setup / 自動セットアップ設計

This is the bilingual entry point for the E.L.I.S.I.A. local server automated setup plan.

この文書は、E.L.I.S.I.A.向けローカルサーバを「機材選定からDocker Core起動まで」つなぐ自動セットアップ設計の入口です。

## Full Documents

| Language | File |
| --- | --- |
| 日本語 | [ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.ja.md](./ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.ja.md) |
| English | [ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.en.md](./ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.en.md) |

## Summary / 要約

E.L.I.S.I.A.の自動セットアップは、LAN内のDocker Core VMを素早く起動するためのものです。ネットワーク機器やProxmoxの危険な変更は、自動化せずチェックリストで進めます。

- 自動化するもの: Docker導入、`.env` 生成、秘密値生成、Compose検証、コンテナ起動、任意のOllama model pull。
- 手動で締めるもの: OPNsense/VLAN、Proxmox bridge、スイッチport、NAS pool、DNS、Caddy root CA trust。
- 推奨機材の入口: [E.L.I.S.I.A. Local Server Hardware Design](./ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.md)。
- 実行ファイル: `deploy/elisia-core/setup.sh`。

The E.L.I.S.I.A. automated setup should light the Docker Core hearth, not rewire the house. Network, firewall, Proxmox, NAS, and certificate trust remain deliberate manual steps.

## Source Links / 参考リンク

- [E.L.I.S.I.A. local server hardware design](./ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.md)
- [Stark Home Automated Setup](./STARK_HOME_AUTOMATED_SETUP.md)
- [Stark Home Proxmox / OPNsense Checklist](./STARK_HOME_PROXMOX_OPNSENSE_CHECKLIST.md)
- [deploy/elisia-core README](../deploy/elisia-core/README.md)
- [Apple Mac mini](https://www.apple.com/shop/buy-mac/mac-mini)
- [Framework Desktop](https://frame.work/desktop)
- [Ubiquiti U7 Pro](https://store.ui.com/us/en/products/u7-pro)
- [UGREEN NASync DXP4800 Plus](https://www.ugreen.com/products/ugreen-nasync-dxp4800-plus-nas-storage)
