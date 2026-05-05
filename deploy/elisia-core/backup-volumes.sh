#!/usr/bin/env bash
set -euo pipefail

umask 077

DATE="$(date +%F)"
BACKUP_BASE="${BACKUP_BASE:-/mnt/nas/backups/docker-core}"
BACKUP_ROOT="${BACKUP_BASE}/${DATE}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "${BACKUP_ROOT}"

cd /opt/elisia-core

tar -czf "${BACKUP_ROOT}/elisia-core-configs.tar.gz" \
  compose.yaml \
  .env \
  caddy \
  homepage \
  prometheus \
  grafana \
  mosquitto

VOLUMES="$(
  docker volume ls \
    --format '{{.Name}}' \
    | grep '^elisia-core_' || true
)"

for volume in ${VOLUMES}; do
  docker run --rm \
    -v "${volume}:/data:ro" \
    -v "${BACKUP_ROOT}:/backup" \
    alpine:latest \
    tar -czf "/backup/${volume}.tar.gz" -C /data .
done

echo "Expired backup candidates:"
find "${BACKUP_BASE}" -mindepth 1 -maxdepth 1 -type d -mtime +"${RETENTION_DAYS}" -print

if [[ "${PRUNE_OLD_BACKUPS:-false}" == "true" ]]; then
  find "${BACKUP_BASE}" -mindepth 1 -maxdepth 1 -type d -mtime +"${RETENTION_DAYS}" -exec rm -rf -- {} +
fi
