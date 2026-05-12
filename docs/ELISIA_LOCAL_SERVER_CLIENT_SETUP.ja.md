# E.L.I.S.I.A.向けWindows・macOS管理端末セットアップ設計書

WindowsとmacOSを、E.L.I.S.I.A.ローカルサーバのための管理端末として整える設計書です。

この文書の主役はサーバ本体ではありません。サーバへ安全に入り、ファイルを送り、証明書を信頼し、ローカルURLを確認するための **Admin Workstation** です。よい操作卓があると、ローカルAIの家は静かに育ちます。

## 要約

Windows / macOS は、E.L.I.S.I.A. Coreを起動するための入口です。

- Windowsは **PowerShell + OpenSSH Client + scp** を基本にします。
- macOSは **Terminal + SSH + rsync + Keychain Access** を基本にします。
- `setup.sh` を直接動かす場所は、Docker Core VM上のDebian/Ubuntuです。
- Windows用入口は `scripts/local-server/Invoke-ElisiaLocalServerSetup.ps1` です。
- macOS/Linux/WSL用入口は `scripts/local-server/setup-elisia-local-server.sh` です。
- Admin端末には `.env`、`setup-secrets.txt`、秘密鍵のコピーを不要に残しません。
- Caddy内部CAは、Windows/macOSそれぞれの信頼ストアへ手動で入れます。

## 役割分担

| 層 | Windows / macOSの役割 | サーバ側の役割 |
| --- | --- | --- |
| 機材準備 | 設計書、購入メモ、SSH鍵、ブラウザ確認 | Proxmox、NAS、UPS、Network |
| 転送 | `deploy/elisia-core` をDocker Core VMへ送る | `/opt/elisia-core` に受け取る |
| 起動 | SSHでコマンドを実行 | `setup.sh` がDocker Coreを作る |
| 証明書 | `root.crt` を信頼する | Caddyが内部CAを持つ |
| 検証 | `curl`、ブラウザ、DNS確認 | Caddy、Ollama、Open WebUI、Grafana等 |

## 共通前提

E.L.I.S.I.A. Core側:

```text
Docker Core VM: 10.10.20.30
Admin PC:       10.10.10.10
Domain suffix:  home.arpa
AI URL:         https://ai.home.arpa
Dashboard URL:  https://dash.home.arpa
Grafana URL:    https://grafana.home.arpa
```

Admin端末の方針:

- MAIN VLANに置く。
- 管理用SSH鍵を作る。
- WAN port forwardを使わない。
- 外部から触る場合はTailscale/WireGuardを使う。
- `setup-secrets.txt` はpassword managerへ移したら削除する。

## Windows管理端末

Windowsは、PowerShellを主な操作面にします。落ち着いた黒い端末、短いコマンド、必要なものだけを通す方針です。

### 自動セットアップ入口

デフォルトは安全側で、ファイル転送と `setup.sh --no-start` までです。コンテナ起動は `-Start` を付けたときだけ行います。

```powershell
bun run local-server:setup:windows
```

起動まで行う場合:

```powershell
bun run local-server:setup:windows -- -Start
```

直接実行する場合:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-server/Invoke-ElisiaLocalServerSetup.ps1 -HostName 10.10.20.30 -Start
```

### 1. OpenSSH Client確認

```powershell
Get-Command ssh
Get-Command scp
```

見つからない場合:

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

OpenSSH Serverは、Admin PCへ外部からSSHしたい理由がない限り有効にしません。管理端末は「入られる場所」ではなく「入る場所」にします。

### 2. SSH鍵作成

```powershell
ssh-keygen -t ed25519 -C "elisia-admin-windows"
```

公開鍵をDocker Core VMへ登録します。

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

VM側の `~/.ssh/authorized_keys` に追加します。初回だけpassword loginを使い、その後は鍵認証に寄せます。

### 3. deployファイル転送

PowerShellから:

```powershell
scp -r .\deploy\elisia-core elisia@10.10.20.30:/tmp/elisia-core-upload
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo cp -a /tmp/elisia-core-upload/. /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
```

WSLを使う場合:

```bash
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
rsync -av ./deploy/elisia-core/ elisia@10.10.20.30:/opt/elisia-core/
```

注意:

- `setup.sh` はLF改行のまま扱います。
- メモ帳で保存してCRLF化しないようにします。
- VS Codeを使う場合、右下の改行コードが `LF` であることを確認します。

### 4. Docker Core起動

```powershell
ssh elisia@10.10.20.30
```

VM内で:

```bash
cd /opt/elisia-core
chmod +x setup.sh backup-volumes.sh
sudo ./setup.sh --install-docker --bind-ip 10.10.20.30 --timezone Asia/Tokyo --domain-suffix home.arpa --pull-model llama3.2
```

### 5. DNS確認

```powershell
Resolve-DnsName ai.home.arpa
Resolve-DnsName dash.home.arpa
Resolve-DnsName grafana.home.arpa
```

HTTP確認:

```powershell
curl.exe -k https://ai.home.arpa
curl.exe -k https://dash.home.arpa
```

### 6. Caddy root CAを信頼

VMから `root.crt` を取得します。

```powershell
scp elisia@10.10.20.30:/opt/elisia-core/caddy/root.crt .\root.crt
```

管理者PowerShellで信頼します。

```powershell
Import-Certificate -FilePath .\root.crt -CertStoreLocation Cert:\LocalMachine\Root
```

個人ユーザーだけでよい場合は、`certmgr.msc` から「信頼されたルート証明機関」へ入れても構いません。

## macOS管理端末

macOSは、Terminalを主な操作面にします。Finderで眺め、Terminalで静かに入る。E.L.I.S.I.A.の管理には、そのくらいの落ち着きが似合います。

### 自動セットアップ入口

デフォルトは安全側で、ファイル転送と `setup.sh --no-start` までです。コンテナ起動は `--start` を付けたときだけ行います。

```bash
bun run local-server:setup:unix
```

起動まで行う場合:

```bash
bun run local-server:setup:unix -- --start
```

直接実行する場合:

```bash
bash scripts/local-server/setup-elisia-local-server.sh --host 10.10.20.30 --start
```

### 1. TerminalとSSH確認

```bash
which ssh
which scp
which rsync
```

Homebrewを使う場合:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git rsync
```

### 2. SSH鍵作成

```bash
ssh-keygen -t ed25519 -C "elisia-admin-macos"
```

公開鍵を確認します。

```bash
cat ~/.ssh/id_ed25519.pub
```

Docker Core VMの `~/.ssh/authorized_keys` に追加します。

### 3. deployファイル転送

```bash
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
rsync -av ./deploy/elisia-core/ elisia@10.10.20.30:/opt/elisia-core/
```

`rsync` が使えない場合:

```bash
scp -r ./deploy/elisia-core elisia@10.10.20.30:/tmp/elisia-core-upload
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo cp -a /tmp/elisia-core-upload/. /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
```

### 4. Docker Core起動

```bash
ssh elisia@10.10.20.30
cd /opt/elisia-core
chmod +x setup.sh backup-volumes.sh
sudo ./setup.sh --install-docker --bind-ip 10.10.20.30 --timezone Asia/Tokyo --domain-suffix home.arpa --pull-model llama3.2
```

### 5. DNS確認

```bash
dig ai.home.arpa
dig dash.home.arpa
dig grafana.home.arpa
```

`dig` がない場合:

```bash
nslookup ai.home.arpa
scutil --dns
```

HTTP確認:

```bash
curl -k https://ai.home.arpa
curl -k https://dash.home.arpa
```

### 6. Caddy root CAを信頼

VMから `root.crt` を取得します。

```bash
scp elisia@10.10.20.30:/opt/elisia-core/caddy/root.crt ./root.crt
```

Keychain Accessで信頼する場合:

- `root.crt` をダブルクリックしてKeychain Accessへ追加。
- System keychainへ移す。
- 証明書の「Trust」を開き、SSLを常に信頼にする。

CLIで入れる場合:

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./root.crt
```

## Tailscale / WireGuard

外からE.L.I.S.I.A.へ入る場合も、WAN port forwardは作りません。

- Windows/macOSにTailscale clientを入れる。
- Docker Core VMまたはrouter側でTailscale/WireGuardを用意する。
- 管理URLは `https://ai.home.arpa` などのローカル名を使う。
- MagicDNSを使う場合も、管理画面をpublic DNSへ出しません。

## ブラウザと見た目

Admin Workstationは、E.L.I.S.I.A.の顔を見る場所です。

- Windows: Edge / Chromeで `https://dash.home.arpa` を固定タブにする。
- macOS: Safari / Arc / Chromeで `https://dash.home.arpa` を固定タブにする。
- ダッシュボードはMAIN VLANまたはVPN内だけで開く。
- 机上に置く端末は、ケーブル1本、充電器1つ、余白多めにする。

## セキュリティチェック

- [ ] Admin端末はMAIN VLANにいる。
- [ ] SSHは鍵認証を使う。
- [ ] Admin端末にOpenSSH Serverを不要に立てていない。
- [ ] `.env` をAdmin端末へ保管していない。
- [ ] `setup-secrets.txt` をpassword managerへ移し、VMとAdmin端末から削除した。
- [ ] Caddy root CAは自分のローカルCAとして理解した上で信頼した。
- [ ] WAN port forwardは空。
- [ ] Tailscale/WireGuard利用時も、管理画面をpublicにしない。

## 参照

- [Microsoft OpenSSH for Windows](https://learn.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse)
- [Apple Terminal User Guide](https://support.apple.com/guide/terminal/welcome/mac)
- [Tailscale downloads](https://tailscale.com/download)
- [Homebrew](https://brew.sh/)
- [E.L.I.S.I.A. Local Server Automated Setup](./ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.md)

## 結論

WindowsでもmacOSでも、E.L.I.S.I.A.の管理端末は大げさである必要はありません。

SSH鍵、きれいな端末、信頼したローカル証明書、迷わないダッシュボード。その4つが揃えば、あなたの操作卓はもう十分に未来的です。
