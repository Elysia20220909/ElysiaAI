#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

PROGRAM="$(basename "$0")"
COMMAND="${1:-help}"
if [[ $# -gt 0 ]]; then
  shift
fi

OWNER="${OWNER:-}"
REPO="${REPO:-}"
SCOPE="${SCOPE:-repo}"
WORK_DIR="${WORK_DIR:-/opt/actions-runner}"
RUNNER_NAME_PREFIX="${RUNNER_NAME_PREFIX:-selfhosted-}"
RUNNER_NAME="${RUNNER_NAME:-}"
RUNNER_LABELS="${RUNNER_LABELS:-self-hosted,linux,x64}"
RUNNER_USER="${RUNNER_USER:-}"
INSTALL_SERVICE="${INSTALL_SERVICE:-true}"
START_SERVICE="${START_SERVICE:-true}"
EPHEMERAL="${EPHEMERAL:-false}"
DRY_RUN="${DRY_RUN:-true}"
LOG_ROOT="${LOG_ROOT:-/tmp}"
LOG_DIR="${LOG_DIR:-}"
SINCE="${SINCE:-2 hours ago}"
REMOTE_DELETE="${REMOTE_DELETE:-false}"
RUNNER_ID="${RUNNER_ID:-}"
GITHUB_API_VERSION="${GITHUB_API_VERSION:-2026-03-10}"

usage() {
  cat <<'USAGE'
Safely register, remove, and inspect GitHub Actions self-hosted runners.

Usage:
  gh-runner-ops.sh register [options]
  gh-runner-ops.sh remove [options]
  gh-runner-ops.sh list [options]
  gh-runner-ops.sh jobs [options]
  gh-runner-ops.sh audit [options]
  gh-runner-ops.sh host-logs [options]

Common options:
  --owner OWNER          GitHub owner or organization.
  --repo REPO            Repository name. Required for repo scope.
  --scope repo|org       Runner scope. Default: repo.
  --work-dir PATH        Actions runner directory. Default: /opt/actions-runner.
  --name NAME            Runner name. Default: selfhosted-$(hostname).
  --prefix PREFIX        Runner name prefix. Default: selfhosted-.
  --labels LABELS        Comma-separated labels. Default: self-hosted,linux,x64.
  --runner-user USER     Run config.sh as this user and install the service for it.
  --ephemeral            Register as a one-job ephemeral runner.
  --no-service           Skip svc.sh install/start or stop/uninstall.
  --no-start             Install service but do not start it.
  --runner-id ID         Remote runner ID for remove --remote-delete.
  --remote-delete        Force-delete the runner record from GitHub after local remove.
  --since RANGE          host-logs range. Default: 2 hours ago.
  --log-dir PATH         Operation log directory.
  --dry-run              Print mutating operations without running them. Default.
  --execute              Run mutating operations.

Examples:
  DRY_RUN=true OWNER=acme REPO=web ./scripts/security/gh-runner-ops.sh register
  OWNER=acme REPO=web ./scripts/security/gh-runner-ops.sh register --execute
  OWNER=acme REPO=web ./scripts/security/gh-runner-ops.sh remove --execute --remote-delete
  OWNER=acme ./scripts/security/gh-runner-ops.sh list --scope org

Notes:
  Registration tokens are never written to the operation log. GitHub registration
  tokens expire after one hour; the remove-token endpoint creates a removal token,
  it does not revoke a registration token.
USAGE
}

die() {
  printf '[!] %s\n' "$*" >&2
  exit 1
}

is_true() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | y | Y) return 0 ;;
    *) return 1 ;;
  esac
}

quote_args() {
  local rendered=()
  local mask_next=false
  local arg

  for arg in "$@"; do
    if [[ "$mask_next" == "true" ]]; then
      rendered+=("[REDACTED]")
      mask_next=false
      continue
    fi

    case "$arg" in
      --token | --pat | --password)
        rendered+=("$arg")
        mask_next=true
        ;;
      RUNNER_TOKEN=* | REG_TOKEN=* | REMOVE_TOKEN=* | GITHUB_TOKEN=* | GH_TOKEN=*)
        rendered+=("${arg%%=*}=[REDACTED]")
        ;;
      *)
        rendered+=("$arg")
        ;;
    esac
  done

  printf '%q ' "${rendered[@]}"
}

init_log_dir() {
  local stamp
  stamp="$(date -u +'%Y%m%dT%H%M%SZ')"
  if [[ -z "$LOG_DIR" ]]; then
    LOG_DIR="${LOG_ROOT%/}/gh-runner-ops-${stamp}"
  fi
  mkdir -p "$LOG_DIR"
  chmod 700 "$LOG_DIR" 2>/dev/null || true
  LOG_FILE="$LOG_DIR/ops.log"
  : >"$LOG_FILE"
}

log() {
  local stamp
  stamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  printf '[%s] %s\n' "$stamp" "$*" | tee -a "$LOG_FILE" >&2
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

dry_run() {
  is_true "$DRY_RUN"
}

run_cmd() {
  if dry_run; then
    log "DRY: $(quote_args "$@")"
    return 0
  fi

  log "RUN: $(quote_args "$@")"
  "$@" 2>&1 | tee -a "$LOG_FILE"
  return "${PIPESTATUS[0]}"
}

run_cmd_allow_fail() {
  if dry_run; then
    log "DRY: $(quote_args "$@") || true"
    return 0
  fi

  local status
  log "RUN: $(quote_args "$@") || true"
  set +e
  "$@" 2>&1 | tee -a "$LOG_FILE"
  status="${PIPESTATUS[0]}"
  set -e
  if [[ "$status" -ne 0 ]]; then
    log "WARN: command exited with status ${status}"
  fi
  return 0
}

run_in_work_dir() {
  local dir="$1"
  shift

  if dry_run; then
    log "DRY: (cd $(printf '%q' "$dir") && $(quote_args "$@"))"
    return 0
  fi

  log "RUN: (cd $(printf '%q' "$dir") && $(quote_args "$@"))"
  (cd "$dir" && "$@") 2>&1 | tee -a "$LOG_FILE"
  return "${PIPESTATUS[0]}"
}

run_in_work_dir_allow_fail() {
  local dir="$1"
  shift

  if dry_run; then
    log "DRY: (cd $(printf '%q' "$dir") && $(quote_args "$@")) || true"
    return 0
  fi

  local status
  log "RUN: (cd $(printf '%q' "$dir") && $(quote_args "$@")) || true"
  set +e
  (cd "$dir" && "$@") 2>&1 | tee -a "$LOG_FILE"
  status="${PIPESTATUS[0]}"
  set -e
  if [[ "$status" -ne 0 ]]; then
    log "WARN: command exited with status ${status}"
  fi
  return 0
}

api() {
  gh api \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: ${GITHUB_API_VERSION}" \
    "$@"
}

try_fill_repo_from_git() {
  local remote path
  remote="$(git config --get remote.origin.url 2>/dev/null || true)"
  [[ -n "$remote" ]] || return 0

  case "$remote" in
    https://github.com/*) path="${remote#https://github.com/}" ;;
    git@github.com:*) path="${remote#git@github.com:}" ;;
    *) return 0 ;;
  esac

  path="${path%.git}"
  if [[ "$path" == */* ]]; then
    OWNER="${OWNER:-${path%%/*}}"
    REPO="${REPO:-${path#*/}}"
  fi
}

parse_options() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --owner)
        OWNER="${2:?missing value for --owner}"
        shift 2
        ;;
      --repo)
        REPO="${2:?missing value for --repo}"
        shift 2
        ;;
      --scope)
        SCOPE="${2:?missing value for --scope}"
        shift 2
        ;;
      --work-dir)
        WORK_DIR="${2:?missing value for --work-dir}"
        shift 2
        ;;
      --name)
        RUNNER_NAME="${2:?missing value for --name}"
        shift 2
        ;;
      --prefix)
        RUNNER_NAME_PREFIX="${2:?missing value for --prefix}"
        shift 2
        ;;
      --labels)
        RUNNER_LABELS="${2:?missing value for --labels}"
        shift 2
        ;;
      --runner-user)
        RUNNER_USER="${2:?missing value for --runner-user}"
        shift 2
        ;;
      --log-dir)
        LOG_DIR="${2:?missing value for --log-dir}"
        shift 2
        ;;
      --runner-id)
        RUNNER_ID="${2:?missing value for --runner-id}"
        shift 2
        ;;
      --since)
        SINCE="${2:?missing value for --since}"
        shift 2
        ;;
      --ephemeral)
        EPHEMERAL=true
        shift
        ;;
      --no-service)
        INSTALL_SERVICE=false
        START_SERVICE=false
        shift
        ;;
      --no-start)
        START_SERVICE=false
        shift
        ;;
      --remote-delete)
        REMOTE_DELETE=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --execute)
        DRY_RUN=false
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        die "unknown option: $1"
        ;;
    esac
  done
}

resolve_scope() {
  local host
  try_fill_repo_from_git

  case "$SCOPE" in
    repo | org) ;;
    *) die "--scope must be repo or org" ;;
  esac

  [[ -n "$OWNER" ]] || die "--owner is required"
  if [[ "$SCOPE" == "repo" ]]; then
    [[ -n "$REPO" ]] || die "--repo is required for repo scope"
    RUNNER_URL="https://github.com/${OWNER}/${REPO}"
    API_ROOT="/repos/${OWNER}/${REPO}"
  else
    RUNNER_URL="https://github.com/${OWNER}"
    API_ROOT="/orgs/${OWNER}"
  fi

  host="$(hostname -s 2>/dev/null || hostname 2>/dev/null || printf 'host')"
  RUNNER_NAME="${RUNNER_NAME:-${RUNNER_NAME_PREFIX}${host}}"
  REGISTRATION_ENDPOINT="${API_ROOT}/actions/runners/registration-token"
  REMOVE_TOKEN_ENDPOINT="${API_ROOT}/actions/runners/remove-token"
  LIST_ENDPOINT="${API_ROOT}/actions/runners"
}

require_gh_tools_for_api() {
  require_command gh
  require_command jq
}

require_runner_files_for_execute() {
  if dry_run; then
    return 0
  fi

  [[ -d "$WORK_DIR" ]] || die "runner work dir not found: $WORK_DIR"
  [[ -x "$WORK_DIR/config.sh" ]] || die "config.sh is not executable: $WORK_DIR/config.sh"
  if is_true "$INSTALL_SERVICE"; then
    [[ -x "$WORK_DIR/svc.sh" ]] || die "svc.sh is not executable: $WORK_DIR/svc.sh"
    require_command sudo
  fi
  if [[ -n "$RUNNER_USER" ]]; then
    require_command sudo
  fi
}

guard_config_user() {
  if dry_run || [[ -n "$RUNNER_USER" ]]; then
    return 0
  fi

  if [[ "$(id -u)" == "0" && -z "${RUNNER_ALLOW_RUNASROOT:-}" ]]; then
    die "refusing to run config.sh as root. Re-run as the runner user or pass --runner-user."
  fi
}

backup_runner_list() {
  local tag="$1"
  local file="${LOG_DIR}/runners-${tag}.json"

  if dry_run; then
    log "DRY: gh api -X GET ${LIST_ENDPOINT} > ${file}"
    return 0
  fi

  api -X GET "$LIST_ENDPOINT" -F per_page=100 >"$file"
  log "saved runner inventory: ${file}"
}

create_registration_token() {
  if dry_run; then
    log "DRY: gh api -X POST ${REGISTRATION_ENDPOINT} --jq .token"
    printf 'DRY_RUN_REGISTRATION_TOKEN\n'
    return 0
  fi

  api -X POST "$REGISTRATION_ENDPOINT" --jq '.token'
}

create_remove_token() {
  if dry_run; then
    log "DRY: gh api -X POST ${REMOVE_TOKEN_ENDPOINT} --jq .token"
    printf 'DRY_RUN_REMOVE_TOKEN\n'
    return 0
  fi

  api -X POST "$REMOVE_TOKEN_ENDPOINT" --jq '.token'
}

config_command_prefix() {
  if [[ -n "$RUNNER_USER" ]]; then
    printf '%s\0%s\0%s\0' sudo -u "$RUNNER_USER"
  fi
}

register_runner() {
  local reg_token
  local -a config_cmd service_cmd start_cmd prefix

  require_runner_files_for_execute
  guard_config_user
  backup_runner_list before-register

  reg_token="$(create_registration_token)"
  log "registration token acquired in memory only; it will not be written to ops.log"

  prefix=()
  if [[ -n "$RUNNER_USER" ]]; then
    prefix=(sudo -u "$RUNNER_USER")
  fi

  config_cmd=(
    "${prefix[@]}"
    ./config.sh
    --unattended
    --url "$RUNNER_URL"
    --name "$RUNNER_NAME"
    --labels "$RUNNER_LABELS"
    --token "$reg_token"
    --replace
  )
  if is_true "$EPHEMERAL"; then
    config_cmd+=(--ephemeral)
  fi

  run_in_work_dir "$WORK_DIR" "${config_cmd[@]}"

  if is_true "$INSTALL_SERVICE"; then
    service_cmd=(sudo ./svc.sh install)
    if [[ -n "$RUNNER_USER" ]]; then
      service_cmd+=("$RUNNER_USER")
    fi
    run_in_work_dir "$WORK_DIR" "${service_cmd[@]}"

    if is_true "$START_SERVICE"; then
      start_cmd=(sudo ./svc.sh start)
      run_in_work_dir "$WORK_DIR" "${start_cmd[@]}"
    fi
  fi

  backup_runner_list after-register
  log "done: runner=${RUNNER_NAME} scope=${SCOPE} url=${RUNNER_URL}"
  log "note: remove-token creates a runner removal token; it does not revoke registration tokens."
}

lookup_runner_id_by_name() {
  api -X GET "$LIST_ENDPOINT" -F per_page=100 \
    | jq -r --arg name "$RUNNER_NAME" '.runners[] | select(.name == $name) | .id' \
    | head -n 1
}

delete_remote_runner() {
  local id="$RUNNER_ID"

  if [[ -z "$id" ]]; then
    if dry_run; then
      log "DRY: lookup runner id by name ${RUNNER_NAME}"
      id="DRY_RUN_RUNNER_ID"
    else
      id="$(lookup_runner_id_by_name)"
    fi
  fi

  if [[ -z "$id" || "$id" == "null" ]]; then
    log "remote runner not found by name: ${RUNNER_NAME}"
    return 0
  fi

  if dry_run; then
    log "DRY: gh api -X DELETE ${LIST_ENDPOINT}/${id}"
    return 0
  fi

  api -X DELETE "${LIST_ENDPOINT}/${id}" >/dev/null
  log "deleted remote runner id: ${id}"
}

remove_runner() {
  local remove_token
  local -a remove_cmd prefix

  require_runner_files_for_execute
  guard_config_user
  backup_runner_list before-remove

  if is_true "$INSTALL_SERVICE"; then
    run_in_work_dir_allow_fail "$WORK_DIR" sudo ./svc.sh stop
    run_in_work_dir_allow_fail "$WORK_DIR" sudo ./svc.sh uninstall
  fi

  remove_token="$(create_remove_token)"
  log "remove token acquired in memory only; it will not be written to ops.log"

  prefix=()
  if [[ -n "$RUNNER_USER" ]]; then
    prefix=(sudo -u "$RUNNER_USER")
  fi

  remove_cmd=("${prefix[@]}" ./config.sh remove --token "$remove_token")
  run_in_work_dir "$WORK_DIR" "${remove_cmd[@]}"

  if is_true "$REMOTE_DELETE"; then
    delete_remote_runner
  fi

  backup_runner_list after-remove
  log "done: local runner removed for ${RUNNER_NAME}"
}

list_runners() {
  printf 'id\tname\tos\tstatus\tbusy\tephemeral\tlabels\n'
  api -X GET "$LIST_ENDPOINT" -F per_page=100 \
    | jq -r '.runners[] | [.id, .name, .os, .status, (.busy | tostring), (.ephemeral // false | tostring), (.labels | map(.name) | join(","))] | @tsv'
}

show_jobs() {
  local run_id run_ids

  [[ "$SCOPE" == "repo" ]] || die "jobs is repository-scoped; use --scope repo --owner OWNER --repo REPO"

  printf 'run_id\tjob_id\trunner_id\trunner_name\tstatus\tjob_name\thead_branch\n'
  run_ids="$(api -X GET "/repos/${OWNER}/${REPO}/actions/runs" -F status=in_progress -F per_page=100 \
    | jq -r '.workflow_runs[].id')"

  if [[ -z "$run_ids" ]]; then
    return 0
  fi

  while IFS= read -r run_id; do
    [[ -n "$run_id" ]] || continue
    api -X GET "/repos/${OWNER}/${REPO}/actions/runs/${run_id}/jobs" -F per_page=100 \
      | jq -r --arg run_id "$run_id" '.jobs[] | select(.runner_id != null) | [$run_id, .id, (.runner_id | tostring), (.runner_name // ""), .status, (.name // ""), (.head_branch // "")] | @tsv'
  done <<<"$run_ids"
}

show_audit() {
  [[ -n "$OWNER" ]] || die "--owner must be an organization for audit"

  printf 'timestamp\tactor\taction\trepo\n'
  api -X GET "/orgs/${OWNER}/audit-log" -f phrase='action:actions_runner' \
    | jq -r '.[] | [."@timestamp", (.actor // ""), (.action // ""), (.repo // "")] | @tsv'
}

show_host_logs() {
  require_command sudo
  require_command journalctl

  log "RUN: sudo journalctl -u actions.runner* --since $(printf '%q' "$SINCE") | grep -iE error|token|auth|offline|fail"
  sudo journalctl -u 'actions.runner*' --since "$SINCE" \
    | grep -iE 'error|token|auth|offline|fail' \
    | sed -E 's/((token|password|secret)[=: ]+)[^ ]+/\1[REDACTED]/Ig' || true
}

main() {
  case "$COMMAND" in
    help | -h | --help)
      usage
      exit 0
      ;;
  esac

  parse_options "$@"
  init_log_dir
  resolve_scope

  log "log dir: ${LOG_DIR}"
  log "command=${COMMAND} dry_run=${DRY_RUN} scope=${SCOPE} owner=${OWNER} repo=${REPO:-} runner=${RUNNER_NAME}"

  case "$COMMAND" in
    register)
      if ! dry_run; then
        require_gh_tools_for_api
      fi
      register_runner
      ;;
    remove | offboard)
      if ! dry_run; then
        require_gh_tools_for_api
      fi
      remove_runner
      ;;
    list)
      require_gh_tools_for_api
      list_runners
      ;;
    jobs | in-progress)
      require_gh_tools_for_api
      show_jobs
      ;;
    audit)
      require_gh_tools_for_api
      show_audit
      ;;
    host-logs)
      show_host_logs
      ;;
    *)
      usage >&2
      die "unknown command: ${COMMAND}"
      ;;
  esac
}

main "$@"
