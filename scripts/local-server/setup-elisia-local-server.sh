#!/usr/bin/env bash
set -Eeuo pipefail

host_name="10.10.20.30"
ssh_user="elisia"
bind_ip=""
timezone="Asia/Tokyo"
domain_suffix="home.arpa"
pull_model="llama3.2"
target_dir="/opt/elisia-core"
start_stack="false"
validate_only="false"
skip_copy="false"
skip_docker_install="false"
fetch_caddy_root="false"
local_cert_path=""

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
source_dir="${repo_root}/deploy/elisia-core"

usage() {
  cat <<'EOF'
E.L.I.S.I.A. local server setup launcher for macOS/Linux/WSL.

Usage:
  bash scripts/local-server/setup-elisia-local-server.sh [options]

Safe default:
  Copies deploy/elisia-core and runs setup.sh with --no-start.
  Add --start to start containers and optionally pull an Ollama model.

Options:
  --host HOST                 Docker Core VM host or IP. Default: 10.10.20.30
  --user USER                 SSH user. Default: elisia
  --bind-ip IP                Service bind IP. Default: same as --host
  --timezone TZ               Timezone. Default: Asia/Tokyo
  --domain-suffix NAME        Local DNS suffix. Default: home.arpa
  --pull-model MODEL          Ollama model pulled when --start is set. Default: llama3.2
  --source-dir DIR            Local deploy/elisia-core path
  --target-dir DIR            Remote target directory. Default: /opt/elisia-core
  --start                     Start containers after validation
  --validate-only             Validate existing remote files only
  --skip-copy                 Do not copy deploy files
  --skip-docker-install       Pass --skip-docker-install to setup.sh
  --fetch-caddy-root          Copy remote caddy/root.crt to this workstation after setup
  --local-cert-path PATH      Destination for root.crt. Default: ./root.crt
  -h, --help                  Show this help

Examples:
  # Prepare, validate, and do not start containers
  bash scripts/local-server/setup-elisia-local-server.sh

  # Start the stack and pull llama3.2
  bash scripts/local-server/setup-elisia-local-server.sh --start

  # Start against a custom host and model
  bash scripts/local-server/setup-elisia-local-server.sh --host 10.10.20.30 --pull-model qwen2.5:7b --start
EOF
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

log() {
  printf '\n==> %s\n' "$*"
}

sh_quote() {
  local value="$1"
  printf "'%s'" "$(printf '%s' "${value}" | sed "s/'/'\\\\''/g")"
}

run_checked() {
  log "$*"
  "$@"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      host_name="$2"
      shift 2
      ;;
    --user)
      ssh_user="$2"
      shift 2
      ;;
    --bind-ip)
      bind_ip="$2"
      shift 2
      ;;
    --timezone)
      timezone="$2"
      shift 2
      ;;
    --domain-suffix)
      domain_suffix="$2"
      shift 2
      ;;
    --pull-model)
      pull_model="$2"
      shift 2
      ;;
    --source-dir)
      source_dir="$2"
      shift 2
      ;;
    --target-dir)
      target_dir="$2"
      shift 2
      ;;
    --start)
      start_stack="true"
      shift
      ;;
    --validate-only)
      validate_only="true"
      shift
      ;;
    --skip-copy)
      skip_copy="true"
      shift
      ;;
    --skip-docker-install)
      skip_docker_install="true"
      shift
      ;;
    --fetch-caddy-root)
      fetch_caddy_root="true"
      shift
      ;;
    --local-cert-path)
      local_cert_path="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

if [[ -z "${bind_ip}" ]]; then
  bind_ip="${host_name}"
fi
if [[ -z "${local_cert_path}" ]]; then
  local_cert_path="${PWD}/root.crt"
fi

[[ -f "${source_dir}/setup.sh" ]] || die "setup.sh not found in SourceDir: ${source_dir}"
[[ -f "${source_dir}/compose.yaml" ]] || die "compose.yaml not found in SourceDir: ${source_dir}"

ssh_target="${ssh_user}@${host_name}"
quoted_target_dir="$(sh_quote "${target_dir}")"

printf 'E.L.I.S.I.A. local server setup launcher\n'
printf 'Target: %s:%s\n' "${ssh_target}" "${target_dir}"
printf 'Source: %s\n' "${source_dir}"
if [[ "${start_stack}" == "true" ]]; then
  printf 'Mode:   start\n'
elif [[ "${validate_only}" == "true" ]]; then
  printf 'Mode:   validate-only\n'
else
  printf 'Mode:   prepare-no-start\n'
fi

if [[ "${skip_copy}" != "true" && "${validate_only}" != "true" ]]; then
  run_checked ssh "${ssh_target}" "rm -rf /tmp/elisia-core-upload && sudo mkdir -p ${quoted_target_dir} && sudo chown -R \"\$USER:\$USER\" ${quoted_target_dir}"

  if command -v rsync >/dev/null 2>&1; then
    run_checked rsync -av "${source_dir}/" "${ssh_target}:${target_dir}/"
  else
    run_checked scp -r "${source_dir}" "${ssh_target}:/tmp/elisia-core-upload"
    run_checked ssh "${ssh_target}" "sudo cp -a /tmp/elisia-core-upload/. ${quoted_target_dir} && sudo chown -R \"\$USER:\$USER\" ${quoted_target_dir}"
  fi
fi

setup_args=(
  "--target-dir" "${target_dir}"
  "--bind-ip" "${bind_ip}"
  "--timezone" "${timezone}"
  "--domain-suffix" "${domain_suffix}"
)

if [[ "${skip_docker_install}" == "true" ]]; then
  setup_args+=("--skip-docker-install")
else
  setup_args+=("--install-docker")
fi

if [[ "${validate_only}" == "true" ]]; then
  setup_args+=("--validate-only")
elif [[ "${start_stack}" != "true" ]]; then
  setup_args+=("--no-start")
fi

if [[ "${start_stack}" == "true" && -n "${pull_model}" ]]; then
  setup_args+=("--pull-model" "${pull_model}")
fi

quoted_setup_args=""
for arg in "${setup_args[@]}"; do
  quoted_setup_args+=" $(sh_quote "${arg}")"
done

run_checked ssh "${ssh_target}" "cd ${quoted_target_dir} && chmod +x setup.sh backup-volumes.sh && sudo ./setup.sh${quoted_setup_args}"

if [[ "${fetch_caddy_root}" == "true" ]]; then
  run_checked scp "${ssh_target}:${target_dir}/caddy/root.crt" "${local_cert_path}"
  printf '\nCaddy root certificate copied to: %s\n' "${local_cert_path}"
  printf 'Trust it manually after verifying this is your local E.L.I.S.I.A. Caddy CA.\n'
fi

printf '\nE.L.I.S.I.A. local server setup launcher complete.\n'
