# E.L.I.S.I.A. Windows and macOS Admin Client Setup

This document prepares Windows and macOS as admin workstations for the E.L.I.S.I.A. local server.

The main character here is not the server itself. It is the **Admin Workstation**: the calm control surface used to SSH in, copy files, trust local certificates, and verify the local dashboards.

## Summary

Windows and macOS are entry points for bringing E.L.I.S.I.A. Core online.

- Windows path: **PowerShell + OpenSSH Client + scp**.
- macOS path: **Terminal + SSH + rsync + Keychain Access**.
- `setup.sh` runs on the Debian/Ubuntu Docker Core VM, not directly on Windows or macOS.
- Windows launcher: `scripts/local-server/Invoke-ElisiaLocalServerSetup.ps1`.
- macOS/Linux/WSL launcher: `scripts/local-server/setup-elisia-local-server.sh`.
- Do not leave `.env`, `setup-secrets.txt`, or private key copies scattered on admin clients.
- Trust the Caddy internal CA manually in each operating system's trust store.

## Responsibilities

| Layer | Windows / macOS role | Server-side role |
| --- | --- | --- |
| Preparation | Design docs, purchase notes, SSH keys, browser checks | Proxmox, NAS, UPS, network |
| Transfer | Copy `deploy/elisia-core` to the Docker Core VM | Receive files under `/opt/elisia-core` |
| Startup | Run commands over SSH | `setup.sh` builds Docker Core |
| Certificates | Trust `root.crt` | Caddy owns the internal CA |
| Validation | `curl`, browser, DNS checks | Caddy, Ollama, Open WebUI, Grafana, and friends |

## Common Assumptions

E.L.I.S.I.A. Core:

```text
Docker Core VM: 10.10.20.30
Admin PC:       10.10.10.10
Domain suffix:  home.arpa
AI URL:         https://ai.home.arpa
Dashboard URL:  https://dash.home.arpa
Grafana URL:    https://grafana.home.arpa
```

Admin workstation policy:

- Place the admin workstation on the MAIN VLAN.
- Create a dedicated admin SSH key.
- Do not use WAN port forwards.
- Use Tailscale or WireGuard for remote access.
- Move `setup-secrets.txt` into a password manager, then delete it.

## Windows Admin Workstation

Windows uses PowerShell as the main control surface: quiet terminal, short commands, and only the access that is needed.

### Setup Launcher

The default is safe: copy files and run `setup.sh --no-start`. Containers start only when `-Start` is passed.

```powershell
bun run local-server:setup:windows
```

To start containers:

```powershell
bun run local-server:setup:windows -- -Start
```

Direct execution:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-server/Invoke-ElisiaLocalServerSetup.ps1 -HostName 10.10.20.30 -Start
```

### 1. Check OpenSSH Client

```powershell
Get-Command ssh
Get-Command scp
```

If missing:

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

Do not enable OpenSSH Server on the admin PC unless there is a clear reason. The admin workstation should be a place you connect from, not another exposed management target.

### 2. Create an SSH Key

```powershell
ssh-keygen -t ed25519 -C "elisia-admin-windows"
```

Show the public key.

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

Add it to `~/.ssh/authorized_keys` on the Docker Core VM. Use password login only for the first bootstrap if needed, then move toward key authentication.

### 3. Copy Deploy Files

From PowerShell:

```powershell
scp -r .\deploy\elisia-core elisia@10.10.20.30:/tmp/elisia-core-upload
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo cp -a /tmp/elisia-core-upload/. /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
```

With WSL:

```bash
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
rsync -av ./deploy/elisia-core/ elisia@10.10.20.30:/opt/elisia-core/
```

Notes:

- Keep `setup.sh` with LF line endings.
- Avoid saving it through Notepad if that changes line endings.
- In VS Code, confirm the lower-right line ending indicator says `LF`.

### 4. Start Docker Core

```powershell
ssh elisia@10.10.20.30
```

Inside the VM:

```bash
cd /opt/elisia-core
chmod +x setup.sh backup-volumes.sh
sudo ./setup.sh --install-docker --bind-ip 10.10.20.30 --timezone Asia/Tokyo --domain-suffix home.arpa --pull-model llama3.2
```

### 5. Check DNS

```powershell
Resolve-DnsName ai.home.arpa
Resolve-DnsName dash.home.arpa
Resolve-DnsName grafana.home.arpa
```

HTTP checks:

```powershell
curl.exe -k https://ai.home.arpa
curl.exe -k https://dash.home.arpa
```

### 6. Trust the Caddy Root CA

Copy `root.crt` from the VM.

```powershell
scp elisia@10.10.20.30:/opt/elisia-core/caddy/root.crt .\root.crt
```

Trust it from an elevated PowerShell.

```powershell
Import-Certificate -FilePath .\root.crt -CertStoreLocation Cert:\LocalMachine\Root
```

For current-user trust only, use `certmgr.msc` and import it into Trusted Root Certification Authorities.

## macOS Admin Workstation

macOS uses Terminal as the main control surface. Browse in Finder, enter quietly through Terminal, and keep the local AI home calm.

### Setup Launcher

The default is safe: copy files and run `setup.sh --no-start`. Containers start only when `--start` is passed.

```bash
bun run local-server:setup:unix
```

To start containers:

```bash
bun run local-server:setup:unix -- --start
```

Direct execution:

```bash
bash scripts/local-server/setup-elisia-local-server.sh --host 10.10.20.30 --start
```

### 1. Check Terminal Tools

```bash
which ssh
which scp
which rsync
```

If using Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git rsync
```

### 2. Create an SSH Key

```bash
ssh-keygen -t ed25519 -C "elisia-admin-macos"
```

Show the public key.

```bash
cat ~/.ssh/id_ed25519.pub
```

Add it to `~/.ssh/authorized_keys` on the Docker Core VM.

### 3. Copy Deploy Files

```bash
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
rsync -av ./deploy/elisia-core/ elisia@10.10.20.30:/opt/elisia-core/
```

If `rsync` is unavailable:

```bash
scp -r ./deploy/elisia-core elisia@10.10.20.30:/tmp/elisia-core-upload
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo cp -a /tmp/elisia-core-upload/. /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
```

### 4. Start Docker Core

```bash
ssh elisia@10.10.20.30
cd /opt/elisia-core
chmod +x setup.sh backup-volumes.sh
sudo ./setup.sh --install-docker --bind-ip 10.10.20.30 --timezone Asia/Tokyo --domain-suffix home.arpa --pull-model llama3.2
```

### 5. Check DNS

```bash
dig ai.home.arpa
dig dash.home.arpa
dig grafana.home.arpa
```

If `dig` is unavailable:

```bash
nslookup ai.home.arpa
scutil --dns
```

HTTP checks:

```bash
curl -k https://ai.home.arpa
curl -k https://dash.home.arpa
```

### 6. Trust the Caddy Root CA

Copy `root.crt` from the VM.

```bash
scp elisia@10.10.20.30:/opt/elisia-core/caddy/root.crt ./root.crt
```

With Keychain Access:

- Double-click `root.crt` to add it to Keychain Access.
- Move it to the System keychain.
- Open Trust and set SSL to Always Trust.

With CLI:

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./root.crt
```

## Tailscale / WireGuard

Even for remote access, do not create WAN port forwards.

- Install the Tailscale client on Windows or macOS.
- Run Tailscale or WireGuard on the Docker Core VM or router side.
- Keep management URLs local, such as `https://ai.home.arpa`.
- If using MagicDNS, do not publish management UIs through public DNS.

## Browser and Desk Presence

The Admin Workstation is where E.L.I.S.I.A. shows its face.

- Windows: pin `https://dash.home.arpa` in Edge or Chrome.
- macOS: pin `https://dash.home.arpa` in Safari, Arc, or Chrome.
- Open dashboards only from MAIN VLAN or VPN.
- Keep the desk simple: one cable, one charger, generous empty space.

## Security Checklist

- [ ] Admin workstation is on the MAIN VLAN.
- [ ] SSH uses key authentication.
- [ ] OpenSSH Server is not enabled on the admin workstation unless needed.
- [ ] `.env` is not stored on the admin workstation.
- [ ] `setup-secrets.txt` was moved to a password manager and deleted from both VM and admin workstation.
- [ ] Caddy root CA was trusted intentionally as a local CA.
- [ ] WAN port forwards are empty.
- [ ] Tailscale/WireGuard does not expose management UIs publicly.

## References

- [Microsoft OpenSSH for Windows](https://learn.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse)
- [Apple Terminal User Guide](https://support.apple.com/guide/terminal/welcome/mac)
- [Tailscale downloads](https://tailscale.com/download)
- [Homebrew](https://brew.sh/)
- [E.L.I.S.I.A. Local Server Automated Setup](./ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.md)

## Conclusion

An E.L.I.S.I.A. admin workstation does not need to be loud or elaborate.

An SSH key, a clean terminal, a trusted local certificate, and a dashboard you do not have to hunt for: that is already a quietly futuristic control surface.
