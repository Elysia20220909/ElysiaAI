# Stark Home Automated Setup

E.L.I.S.I.A. CoreのDocker Core VM向け自動セットアップ手順です。

この自動化は、LAN内サーバのDocker層を素早く起動するためのものです。OPNsense、Proxmox、スイッチのVLAN設定は機器差とロックアウトリスクがあるため、手動チェックリストで実施します。

関連ファイル:

- `deploy/elisia-core/setup.sh`
- `deploy/elisia-core/compose.yaml`
- `deploy/elisia-core/.env.example`
- `docs/STARK_HOME_LOCAL_SERVER_BUILD.md`
- `docs/STARK_HOME_PROXMOX_OPNSENSE_CHECKLIST.md`

## What It Automates

`setup.sh` が行うこと:

- Debian/Ubuntu上でDocker EngineとCompose pluginを導入
- `/opt/elisia-core/.env` を `.env.example` から作成
- WebUI、Gitea、n8n、Grafana、MQTT用の秘密値を生成
- Caddy basic auth hashを生成
- Mosquittoのpassword fileを作成
- `docker compose config --quiet` で構文検証
- container imageをpull
- E.L.I.S.I.A. Core stackを起動
- 任意でOllama modelをpull

自動化しないこと:

- OPNsenseのWAN/VLAN/Firewall変更
- Proxmoxのbridge変更
- スイッチのtrunk/access port変更
- ローカルDNSのhost override登録
- Home Assistantの `configuration.yaml` 変更

## VM Prerequisites

Docker Core VM:

```text
OS: Ubuntu Server 24.04 LTS or Debian 12
VLAN: SERVER VLAN 20
IP: 10.10.20.30/24
Gateway: 10.10.20.1
DNS: 10.10.20.1
Disk: 200GB
RAM: 16GB
vCPU: 4
```

事前にMAIN/Admin PCからSSHできる状態にします。

```bash
ssh elisia@10.10.20.30
```

## Quick Start

管理PCからDocker Core VMへ配置ファイルを送ります。

```bash
ssh elisia@10.10.20.30 'sudo mkdir -p /opt/elisia-core && sudo chown -R "$USER:$USER" /opt/elisia-core'
rsync -av ./deploy/elisia-core/ elisia@10.10.20.30:/opt/elisia-core/
```

Docker Core VMへ入り、自動セットアップを実行します。

```bash
ssh elisia@10.10.20.30
cd /opt/elisia-core
chmod +x setup.sh backup-volumes.sh
sudo ./setup.sh --install-docker --bind-ip 10.10.20.30 --pull-model llama3.2
```

初回起動後、生成されたbootstrap passwordを回収します。

```bash
sudo cat /opt/elisia-core/setup-secrets.txt
```

内容をpassword managerへ移したら削除します。

```bash
sudo shred -u /opt/elisia-core/setup-secrets.txt
```

`shred` がない環境では以下で削除します。

```bash
sudo rm -f /opt/elisia-core/setup-secrets.txt
```

## Safe Dry Run

起動せずに `.env` 生成、MQTT password file作成、Compose構文検証まで行います。

```bash
cd /opt/elisia-core
sudo ./setup.sh --install-docker --bind-ip 10.10.20.30 --no-start
```

既存設定の検証だけ行います。

```bash
cd /opt/elisia-core
./setup.sh --validate-only
```

`--validate-only` は既存の `.env` を使います。初回準備も含めて検証したい場合は `--no-start` を使います。

## Useful Options

| Option | Use |
| --- | --- |
| `--bind-ip 10.10.20.30` | Caddy/Gitea SSH/MQTTのbind先IPを指定 |
| `--timezone Asia/Tokyo` | `TZ` を指定 |
| `--domain-suffix home.arpa` | `ai.home.arpa` などのdomainを再生成 |
| `--grafana-password PASS` | Grafana admin passwordを指定 |
| `--basic-auth-password PASS` | Prometheus用basic auth passwordを指定 |
| `--mqtt-user USER` | MQTT userを指定 |
| `--mqtt-password PASS` | MQTT passwordを指定 |
| `--pull-model llama3.2` | 起動後にOllama modelをpull |
| `--no-start` | containerを起動しない |
| `--validate-only` | Compose検証だけ行う |

## After Setup

DNSに以下を登録します。

```text
ai.home.arpa          -> 10.10.20.30
ha.home.arpa          -> 10.10.20.30
status.home.arpa      -> 10.10.20.30
dash.home.arpa        -> 10.10.20.30
git.home.arpa         -> 10.10.20.30
n8n.home.arpa         -> 10.10.20.30
grafana.home.arpa     -> 10.10.20.30
prometheus.home.arpa  -> 10.10.20.30
```

起動状態を確認します。

```bash
cd /opt/elisia-core
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs caddy --tail=50
```

Caddy内部CAのroot証明書を取り出します。

```bash
cd /opt/elisia-core
docker cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy/root.crt
```

Home AssistantをCaddy配下で使う場合、Home Assistant側の `configuration.yaml` に追加します。

```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 10.10.20.30
```

## Validation

MAIN/Admin PCから確認します。

```bash
curl -k https://ai.home.arpa
curl -k https://dash.home.arpa
curl -k https://grafana.home.arpa
```

Docker Core VM内で確認します。

```bash
cd /opt/elisia-core
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml ps
docker compose -f compose.yaml exec -T ollama ollama list
```

IoT VLANからMQTTだけ通るか確認します。

```bash
nc -vz 10.10.20.30 1883
```

## Security Notes

- WAN port forwardは作りません。
- 生成された `setup-secrets.txt` はGit管理しません。
- `.env` は本番VMにのみ置きます。
- PrometheusはCaddy basic auth配下だけで見ます。
- Homepageは `docker-socket-proxy` 経由でDocker情報を読みます。
- OPNsense/Proxmoxの管理面はAdmin PCまたはMGMT VLANからだけ許可します。

自動化の役目は、炉心に火を入れるところまでです。壁、扉、認証、避難経路はチェックリストで一つずつ締めます。
