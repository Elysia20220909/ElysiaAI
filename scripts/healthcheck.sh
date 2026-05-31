#!/usr/bin/env bash
set -Eeuo pipefail

app_name="${APP_NAME:-service}"
healthcheck_url="${HEALTHCHECK_URL:-http://127.0.0.1:3000/health}"
curl_timeout="${CURL_TIMEOUT_SECONDS:-5}"
post_restart_sleep="${POST_RESTART_SLEEP_SECONDS:-10}"
service_name="${SERVICE_NAME:-}"
compose_service="${COMPOSE_SERVICE:-}"
restart_command="${RESTART_COMMAND:-}"
alert_email="${ALERT_EMAIL:-}"
mail_subject="${MAIL_SUBJECT:-${app_name} DOWN}"
log_tag="${LOG_TAG:-healthcheck}"

if ! command -v curl >/dev/null 2>&1; then
  printf 'error: curl is required for health checks\n' >&2
  exit 1
fi

log() {
  local message="$1"
  printf '%s %s\n' "$(date -Is)" "$message" >&2
  if command -v logger >/dev/null 2>&1; then
    logger -t "$log_tag" "$message" || true
  fi
}

notify() {
  local message="$1"
  log "$message"
  if [[ -n "$alert_email" ]]; then
    if command -v mail >/dev/null 2>&1; then
      printf '%s\n' "$message" | mail -s "$mail_subject" "$alert_email"
    else
      log "mail command not found; could not send alert to $alert_email"
    fi
  fi
}

probe() {
  curl -fsS --max-time "$curl_timeout" "$healthcheck_url" >/dev/null
}

restart_service() {
  if [[ -n "$restart_command" ]]; then
    bash -lc "$restart_command"
    return
  fi

  if [[ -n "$service_name" ]]; then
    command -v systemctl >/dev/null 2>&1 || return 1
    systemctl restart "$service_name"
    return
  fi

  if [[ -n "$compose_service" ]]; then
    if command -v docker >/dev/null 2>&1; then
      if [[ -n "${COMPOSE_FILE:-}" ]]; then
        docker compose -f "$COMPOSE_FILE" restart "$compose_service"
      else
        docker compose restart "$compose_service"
      fi
      return
    fi

    if command -v docker-compose >/dev/null 2>&1; then
      if [[ -n "${COMPOSE_FILE:-}" ]]; then
        docker-compose -f "$COMPOSE_FILE" restart "$compose_service"
      else
        docker-compose restart "$compose_service"
      fi
      return
    fi
  fi

  return 1
}

if probe; then
  exit 0
fi

log "health check failed for $healthcheck_url; attempting restart"

if ! restart_service; then
  notify "health check failed for $healthcheck_url and no restart target succeeded"
  exit 1
fi

sleep "$post_restart_sleep"

if probe; then
  log "service recovered after restart"
  exit 0
fi

notify "health check still failing after restart: $healthcheck_url"
exit 1
