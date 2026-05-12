# E.L.I.S.I.A. Local Server Client Setup / Windows・macOS管理端末設計

This is the bilingual entry point for preparing Windows and macOS admin clients for the E.L.I.S.I.A. local server.

この文書は、Windows / macOS からE.L.I.S.I.A.ローカルサーバを安全に準備・転送・検証するための管理端末セットアップ入口です。

## Full Documents

| Language | File |
| --- | --- |
| 日本語 | [ELISIA_LOCAL_SERVER_CLIENT_SETUP.ja.md](./ELISIA_LOCAL_SERVER_CLIENT_SETUP.ja.md) |
| English | [ELISIA_LOCAL_SERVER_CLIENT_SETUP.en.md](./ELISIA_LOCAL_SERVER_CLIENT_SETUP.en.md) |

## Summary / 要約

Windows and macOS are treated as **Admin Workstations**: elegant control surfaces for copying `deploy/elisia-core`, opening local dashboards, trusting the local Caddy CA, and checking DNS/VLAN behavior.

Windows / macOS は **Admin Workstation** として扱います。`deploy/elisia-core` の転送、ローカルダッシュボード確認、Caddy内部CAの信頼、DNS/VLAN検証を担う、静かで美しい操作卓です。

- Server automation remains in [E.L.I.S.I.A. Local Server Automated Setup](./ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.md).
- Hardware planning remains in [E.L.I.S.I.A. Local Server Hardware Design](./ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.md).
- Windows path: PowerShell, OpenSSH Client, `scp`, optional WSL for `rsync`.
- macOS path: Terminal, SSH, `rsync`, Keychain Access.
- Setup launchers: `scripts/local-server/Invoke-ElisiaLocalServerSetup.ps1` and `scripts/local-server/setup-elisia-local-server.sh`.

## Source Links / 参考リンク

- [Microsoft OpenSSH for Windows](https://learn.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse)
- [Apple Terminal User Guide](https://support.apple.com/guide/terminal/welcome/mac)
- [Tailscale downloads](https://tailscale.com/download)
- [Homebrew](https://brew.sh/)
- [E.L.I.S.I.A. automated setup](./ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.md)
