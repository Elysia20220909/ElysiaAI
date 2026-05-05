# E.L.I.S.I.A. Core Deploy

Docker Core VM用の配置ファイル。

Copy to the VM:

```bash
sudo mkdir -p /opt/elisia-core
sudo chown -R "$USER:$USER" /opt/elisia-core
rsync -av ./deploy/elisia-core/ elisia@10.10.20.30:/opt/elisia-core/
```

Create secrets:

```bash
cd /opt/elisia-core
cp .env.example .env
openssl rand -hex 32
openssl rand -base64 32
docker run --rm caddy:2 caddy hash-password --plaintext 'strong-password-here'
```

Edit `.env`, then start:

```bash
chmod +x backup-volumes.sh
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml pull
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
```

Create MQTT password file:

```bash
docker run --rm -it \
  -v /opt/elisia-core/mosquitto/config:/mosquitto/config \
  eclipse-mosquitto:2 \
  mosquitto_passwd -c /mosquitto/config/passwords homeassistant
```

Copy Caddy local CA root:

```bash
docker cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy/root.crt
```

Security notes:

- Do not expose these services with WAN port forwards.
- Use OPNsense local DNS for `*.home.arpa`.
- Homepage uses `docker-socket-proxy`; do not mount Docker socket directly into Homepage.
- Prometheus has no LAN port; access through Caddy basic auth.
- Pin image digests in `.env` after the first stable build.
