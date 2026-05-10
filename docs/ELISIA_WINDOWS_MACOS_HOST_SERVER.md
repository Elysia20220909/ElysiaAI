# E.L.I.S.I.A. Windows / macOS Host Server / 本体サーバ化設計

This is the bilingual entry point for turning a Windows PC or Mac into the E.L.I.S.I.A. host server.

この文書は、Windows PC / Mac本体をE.L.I.S.I.A.のローカルサーバとして使うための入口です。

## Full Documents

| Language | File |
| --- | --- |
| 日本語 | [ELISIA_WINDOWS_MACOS_HOST_SERVER.ja.md](./ELISIA_WINDOWS_MACOS_HOST_SERVER.ja.md) |
| English | [ELISIA_WINDOWS_MACOS_HOST_SERVER.en.md](./ELISIA_WINDOWS_MACOS_HOST_SERVER.en.md) |

## Summary / 要約

Windows / macOS本体サーバ化は、Proxmox VMを用意せず、手元のPCやMacにDocker Desktop等を入れてE.L.I.S.I.A. Coreを動かす構成です。

- Best for: quiet personal labs, desk-side AI, compact stylish setups.
- Not best for: strict VM isolation, heavy multi-tenant labs, public services.
- Safe default: bind to `127.0.0.1`, then intentionally move to LAN with `--bind-ip`.
- Setup script: `bun run local-server:host`.

Windows / macOS host mode is beautiful and fast to start, but less isolated than the Proxmox design. Use it as a calm desk-side E.L.I.S.I.A. core, then graduate to Proxmox when the house grows.

## Source Links / 参考リンク

- [Docker Personal](https://www.docker.com/products/personal/)
- [Docker Desktop license agreement](https://docs.docker.com/subscription/desktop-license/)
- [Apple Mac mini](https://www.apple.com/shop/buy-mac/mac-mini)
- [Apple Mac Studio](https://www.apple.com/mac-studio/)
- [MacRumors Mac mini pricing note](https://www.macrumors.com/2026/05/02/apple-just-raised-mac-mini-starting-price/)
- [Microsoft Windows 11 Pro](https://www.microsoft.com/en-us/d/windows-11-pro/dg7gmgf0d8h4)
- [Microsoft OpenSSH for Windows](https://learn.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse)
- [Tailscale downloads](https://tailscale.com/download)
- [Homebrew](https://brew.sh/)
