# Self-hosted Runner netns Isolation Playbook

要約: GitHub Actions self-hosted runner を、Runnerごとの専用 network namespace と個別egressポリシーで動かすための、ElysiaAI向けミニ・プレイブックです。既定は `DRY_RUN=1` で、実行前に「何が起きるか」を目で確かめる作りにしています。

## TL;DR

- 目的: Runnerごとに専用netnsを持たせ、送信先を最小化する。
- 既定: `DRY_RUN=1`。実ホストには変更しない。
- Docker: netns-holderコンテナを作り、Runnerは `--network container:<holder>` で共有する。
- Podman: rootful Podmanなら `--network ns:/var/run/netns/<name>` で既存netnsへ直接参加できる。
- rollback: コンテナ、netns symlink、veth、nftables table、GitHub登録を名前で撤収する。

## 前提

- Linux host
- `docker` または rootful `podman`
- `iproute2`, `nft`, `curl`, `tar`, `jq`
- `gh auth login` 済み
- repository runner または organization runner の管理権限
- ElysiaAIでは、まず repository-scoped runner を推奨する。

## 注意点

- `--privileged` と Docker socket mount は原則避ける。Runnerは「便利な刃物」なので、鞘も一緒に設計する。
- GitHubのself-hosted runnerは外向きHTTPS 443と、用途別のGitHub関連ドメインへの到達が必要になる。
- GitHubのドメイン一覧には `CNAME` が含まれる。L3/L4のCIDR allowlistだけで厳格化すると、artifact、cache、release asset、OIDC、package取得が壊れることがある。
- Dockerは任意の既存netnsへ直接joinする `ns:/path` 形式を持たない。Dockerではnetns-holderコンテナを作り、そのnetwork stackをRunnerコンテナに共有させる。
- Podmanは `--network ns:/path` を使えるため、既存netnsへ直接参加させやすい。

## 1. 共通変数

```bash
set -eu

export DRY_RUN=${DRY_RUN:-1}
export OWNER=${OWNER:-Elysia20220909}
export REPO=${REPO:-ElysiaAI}
export RUNNER_SCOPE=${RUNNER_SCOPE:-repo} # repo | org
export NAME_PREFIX=${NAME_PREFIX:-elysia-runner-$(hostname)-$RANDOM}
export RUNNER_IMG=${RUNNER_IMG:-ghcr.io/actions/actions-runner:latest}
export RUNNER_LABELS=${RUNNER_LABELS:-elysiaai-netns,repo-scoped}
export RUNNER_CLI=${RUNNER_CLI:-docker} # docker | "sudo podman"

export CT_NAME=${CT_NAME:-$NAME_PREFIX}
export NETNS=${NETNS:-${NAME_PREFIX}-ns}
export NET_ID=${NET_ID:-$(printf '%s' "$NAME_PREFIX" | sha256sum | cut -c1-8)}
export VETH_HOST=${VETH_HOST:-vh${NET_ID}}
export VETH_NS=${VETH_NS:-vn${NET_ID}}
export HOST_IP=${HOST_IP:-10.33.33.1}
export NS_IP=${NS_IP:-10.33.33.2}
export PREFIX_LEN=${PREFIX_LEN:-30}
export DNS_IP=${DNS_IP:-1.1.1.1}
export NFT_TABLE=${NFT_TABLE:-elysia_runner_${NET_ID}}

run() {
  if [ "$DRY_RUN" = "1" ]; then
    printf 'DRY:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

if [ "$RUNNER_SCOPE" = "org" ]; then
  export RUNNER_URL="https://github.com/$OWNER"
  export TOKEN_ENDPOINT="/orgs/$OWNER/actions/runners/registration-token"
  export REMOVE_TOKEN_ENDPOINT="/orgs/$OWNER/actions/runners/remove-token"
  export LIST_ENDPOINT="/orgs/$OWNER/actions/runners"
else
  export RUNNER_URL="https://github.com/$OWNER/$REPO"
  export TOKEN_ENDPOINT="/repos/$OWNER/$REPO/actions/runners/registration-token"
  export REMOVE_TOKEN_ENDPOINT="/repos/$OWNER/$REPO/actions/runners/remove-token"
  export LIST_ENDPOINT="/repos/$OWNER/$REPO/actions/runners"
fi

if [ "$DRY_RUN" = "1" ]; then
  export TOKEN="DRY_RUN_TOKEN"
  echo "DRY: gh api -X POST $TOKEN_ENDPOINT -q .token"
else
  export TOKEN=$(gh api -X POST "$TOKEN_ENDPOINT" -q .token)
fi
```

## 2. netns と egress を準備

このブロックはPodman向けに「名前付きnetns」を作る。Docker向けでは次章のnetns-holder方式を使う。

```bash
run sudo ip netns add "$NETNS"
run sudo ip link add "$VETH_HOST" type veth peer name "$VETH_NS"
run sudo ip link set "$VETH_NS" netns "$NETNS"

run sudo ip addr add "$HOST_IP/$PREFIX_LEN" dev "$VETH_HOST"
run sudo ip link set "$VETH_HOST" up
run sudo ip netns exec "$NETNS" ip addr add "$NS_IP/$PREFIX_LEN" dev "$VETH_NS"
run sudo ip netns exec "$NETNS" ip link set lo up
run sudo ip netns exec "$NETNS" ip link set "$VETH_NS" up
run sudo ip netns exec "$NETNS" ip route add default via "$HOST_IP"
run sudo mkdir -p "/etc/netns/$NETNS"
run sudo sh -c "printf 'nameserver %s\n' '$DNS_IP' > '/etc/netns/$NETNS/resolv.conf'"

run sudo sysctl -w net.ipv4.ip_forward=1
run sudo nft add table ip "${NFT_TABLE}_nat"
run sudo nft add chain ip "${NFT_TABLE}_nat" postrouting '{ type nat hook postrouting priority srcnat; policy accept; }'
run sudo nft add rule ip "${NFT_TABLE}_nat" postrouting ip saddr "$NS_IP" masquerade

run sudo nft add table inet "$NFT_TABLE"
run sudo nft add chain inet "$NFT_TABLE" forward '{ type filter hook forward priority filter; policy accept; }'
run sudo nft add rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" ct state established,related accept
run sudo nft add rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" ip daddr "$DNS_IP" udp dport 53 accept
run sudo nft add rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" ip daddr "$DNS_IP" tcp dport 53 accept
run sudo nft add rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" tcp dport 443 accept
run sudo nft add rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" counter drop
```

この時点では「任意宛先のHTTPS 443」を許可している。まず動かし、ログを見て、次の厳格ルールへ寄せる。

## 3. nftables strict egress の型

GitHub公開CIDRを使うL3版。GitHub関連ドメインにはCNAMEやCDNがあるため、これは完成品ではなく、検証しながら育てるための台紙として扱う。

```bash
if [ "$DRY_RUN" = "1" ]; then
  echo "DRY: gh api /meta | jq -r '.web[], .api[], .git[], .packages[], .actions[]'"
  echo "DRY: sudo nft add set inet $NFT_TABLE github_v4 '{ type ipv4_addr; flags interval; }'"
else
  sudo nft add set inet "$NFT_TABLE" github_v4 '{ type ipv4_addr; flags interval; }' 2>/dev/null || true
  gh api /meta \
    --jq '.web[], .api[], .git[], .packages[], .actions[]' \
    | grep -E '^[0-9]+\.' \
    | while read -r cidr; do
        sudo nft add element inet "$NFT_TABLE" github_v4 "{ $cidr }" 2>/dev/null || true
      done
fi

run sudo nft insert rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" ip daddr @github_v4 tcp dport 443 accept
```

運用でさらに絞るなら、DNS proxyやHTTPS proxyでFQDN allowlistを管理する。L3だけで美しく完結しようとすると、GitHubのCDNという潮の満ち引きに足を取られやすい。

## 4A. PodmanでRunnerをnetnsへ入れる

```bash
export RUNNER_CLI="sudo podman"

run sudo podman run -d \
  --name "$CT_NAME" \
  --network "ns:/var/run/netns/$NETNS" \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -e RUNNER_ALLOW_RUNASROOT=1 \
  "$RUNNER_IMG" sleep infinity
```

## 4B. DockerでRunnerをnetns-holderへ入れる

Dockerでは、まずnetwork stackだけを持つ小さなコンテナを作る。

```bash
export RUNNER_CLI=docker
export NET_CT_NAME=${NET_CT_NAME:-${CT_NAME}-netns}

run docker run -d \
  --name "$NET_CT_NAME" \
  --network none \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --read-only \
  busybox:latest sleep infinity

if [ "$DRY_RUN" = "1" ]; then
  export NET_CT_PID="DRY_RUN_PID"
  echo "DRY: docker inspect -f '{{.State.Pid}}' $NET_CT_NAME"
else
  export NET_CT_PID=$(docker inspect -f '{{.State.Pid}}' "$NET_CT_NAME")
fi

run sudo mkdir -p /var/run/netns
run sudo ln -sfT "/proc/$NET_CT_PID/ns/net" "/var/run/netns/$NETNS"
run sudo mkdir -p "/etc/netns/$NETNS"
run sudo sh -c "printf 'nameserver %s\n' '$DNS_IP' > '/etc/netns/$NETNS/resolv.conf'"

run sudo ip link add "$VETH_HOST" type veth peer name "$VETH_NS"
run sudo ip link set "$VETH_NS" netns "$NET_CT_PID"
run sudo ip addr add "$HOST_IP/$PREFIX_LEN" dev "$VETH_HOST"
run sudo ip link set "$VETH_HOST" up
run sudo nsenter -t "$NET_CT_PID" -n ip link set lo up
run sudo nsenter -t "$NET_CT_PID" -n ip link set "$VETH_NS" name eth0
run sudo nsenter -t "$NET_CT_PID" -n ip addr add "$NS_IP/$PREFIX_LEN" dev eth0
run sudo nsenter -t "$NET_CT_PID" -n ip link set eth0 up
run sudo nsenter -t "$NET_CT_PID" -n ip route add default via "$HOST_IP"

run sudo sysctl -w net.ipv4.ip_forward=1
run sudo nft add table ip "${NFT_TABLE}_nat"
run sudo nft add chain ip "${NFT_TABLE}_nat" postrouting '{ type nat hook postrouting priority srcnat; policy accept; }'
run sudo nft add rule ip "${NFT_TABLE}_nat" postrouting ip saddr "$NS_IP" masquerade

run sudo nft add table inet "$NFT_TABLE"
run sudo nft add chain inet "$NFT_TABLE" forward '{ type filter hook forward priority filter; policy accept; }'
run sudo nft add rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" ct state established,related accept
run sudo nft add rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" ip daddr "$DNS_IP" udp dport 53 accept
run sudo nft add rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" ip daddr "$DNS_IP" tcp dport 53 accept
run sudo nft add rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" tcp dport 443 accept
run sudo nft add rule inet "$NFT_TABLE" forward ip saddr "$NS_IP" counter drop

run docker run -d \
  --name "$CT_NAME" \
  --network "container:$NET_CT_NAME" \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -e RUNNER_ALLOW_RUNASROOT=1 \
  "$RUNNER_IMG" sleep infinity
```

Composeで管理する場合も、構造は同じ。

```yaml
services:
  runner-netns:
    image: busybox:latest
    command: ["sleep", "infinity"]
    network_mode: "none"
    read_only: true
    cap_drop: ["ALL"]
    security_opt:
      - "no-new-privileges"

  runner:
    image: ghcr.io/actions/actions-runner:latest
    command: ["sleep", "infinity"]
    network_mode: "service:runner-netns"
    cap_drop: ["ALL"]
    security_opt:
      - "no-new-privileges"
    environment:
      RUNNER_ALLOW_RUNASROOT: "1"
```

Composeはveth/nftablesの作成までは担当しない。`runner-netns` のPIDを取り、上のnetns接続ブロックを当てる。

## 5. Runnerを構成して起動

```bash
if [ "$DRY_RUN" = "1" ]; then
  export RUNNER_VERSION="DRY_RUN_VERSION"
  echo "DRY: gh api /repos/actions/runner/releases/latest -q .tag_name"
else
  export RUNNER_VERSION=$(gh api /repos/actions/runner/releases/latest -q .tag_name | sed 's/^v//')
fi

export RUNNER_TARBALL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

run $RUNNER_CLI exec -u 0 "$CT_NAME" sh -lc "printf 'nameserver %s\n' '$DNS_IP' > /etc/resolv.conf"
run $RUNNER_CLI exec "$CT_NAME" bash -lc "mkdir -p /runner && cd /runner && curl -fsSLo actions-runner.tar.gz '$RUNNER_TARBALL' && tar xzf actions-runner.tar.gz && rm actions-runner.tar.gz"

run $RUNNER_CLI exec \
  -e RUNNER_URL="$RUNNER_URL" \
  -e RUNNER_TOKEN="$TOKEN" \
  -e RUNNER_NAME="$NAME_PREFIX" \
  -e RUNNER_LABELS="$RUNNER_LABELS" \
  "$CT_NAME" bash -lc 'cd /runner && ./config.sh --url "$RUNNER_URL" --token "$RUNNER_TOKEN" --unattended --name "$RUNNER_NAME" --labels "$RUNNER_LABELS"'

run $RUNNER_CLI exec -d "$CT_NAME" bash -lc 'cd /runner && ./run.sh'
```

より強い隔離を選ぶなら、登録時に `--ephemeral` を追加する。1ジョブごとにRunnerが自動登録解除されるので、ジョブ後にコンテナとnetnsを破棄する自動化と相性がよい。

```bash
run $RUNNER_CLI exec \
  -e RUNNER_URL="$RUNNER_URL" \
  -e RUNNER_TOKEN="$TOKEN" \
  -e RUNNER_NAME="$NAME_PREFIX" \
  -e RUNNER_LABELS="$RUNNER_LABELS" \
  "$CT_NAME" bash -lc 'cd /runner && ./config.sh --url "$RUNNER_URL" --token "$RUNNER_TOKEN" --unattended --ephemeral --name "$RUNNER_NAME" --labels "$RUNNER_LABELS"'
```

Workflow側は、意図したrunnerへだけ流す。

```yaml
runs-on: [self-hosted, linux, x64, elysiaai-netns]
```

## 6. 稼働確認

```bash
run sudo ip netns exec "$NETNS" ip addr
run sudo ip netns exec "$NETNS" ip route
run sudo ip netns exec "$NETNS" curl -I https://github.com -m 5

echo "Runner名: $NAME_PREFIX"
echo "GitHub: Settings > Actions > Runners で Online を確認"
```

## 7. rollback

まずはdry-run。

```bash
echo "DRY: would remove runner registration, container(s), netns link, veth, and nftables tables"
```

実撤収。

```bash
if [ "$DRY_RUN" = "1" ]; then
  echo "DRY: gh api $LIST_ENDPOINT --jq '.runners[] | select(.name==\"$NAME_PREFIX\") | .id'"
  echo "DRY: gh api -X DELETE $LIST_ENDPOINT/<runner-id>"
else
  gh api "$LIST_ENDPOINT" > "/tmp/${NAME_PREFIX}-runner-backup.json"
  RUNNER_ID=$(jq -r ".runners[] | select(.name==\"$NAME_PREFIX\") | .id" "/tmp/${NAME_PREFIX}-runner-backup.json")
  if [ -n "$RUNNER_ID" ] && [ "$RUNNER_ID" != "null" ]; then
    gh api -X DELETE "$LIST_ENDPOINT/$RUNNER_ID"
  fi
fi

run $RUNNER_CLI rm -f "$CT_NAME"
if [ "$RUNNER_CLI" = "docker" ]; then
  run docker rm -f "${CT_NAME}-netns"
fi
run sudo sh -c "ip netns delete '$NETNS' 2>/dev/null || rm -f '/var/run/netns/$NETNS'"
run sudo sh -c "rm -f '/etc/netns/$NETNS/resolv.conf'; rmdir '/etc/netns/$NETNS' 2>/dev/null || true"
run sudo sh -c "ip link delete '$VETH_HOST' 2>/dev/null || true"
run sudo sh -c "nft delete table inet '$NFT_TABLE' 2>/dev/null || true"
run sudo sh -c "nft delete table ip '${NFT_TABLE}_nat' 2>/dev/null || true"
```

Runnerの中から穏当に登録解除したい場合は、上のAPI DELETEの代わりにremove tokenを使う。この方法はコンテナ削除前に実行する。

```bash
if [ "$DRY_RUN" = "1" ]; then
  export REMOVE_TOKEN="DRY_RUN_REMOVE_TOKEN"
  echo "DRY: gh api -X POST $REMOVE_TOKEN_ENDPOINT -q .token"
else
  export REMOVE_TOKEN=$(gh api -X POST "$REMOVE_TOKEN_ENDPOINT" -q .token)
fi

run $RUNNER_CLI exec \
  -e REMOVE_TOKEN="$REMOVE_TOKEN" \
  "$CT_NAME" bash -lc 'cd /runner && ./config.sh remove --token "$REMOVE_TOKEN"'
```

## 8. ElysiaAI運用メモ

- Repository-scoped、label-restricted、patched、isolated を基本線にする。
- Public forkや未信頼PRをself-hosted runnerへ流さない。
- `runs-on` は専用ラベルを必須にし、汎用 `self-hosted` だけで拾わせない。
- Runnerイメージはdigest pinningを検討する。
- egressは「まず443のみ、次にGitHub CIDR、最後にproxy/FQDN制御」へ段階的に締める。
- `/tmp/*runner-backup.json` は監査用の一時ファイル。Gitには入れない。
- 破棄しやすい名前を付ける。名前は安全の半分、もう半分は撤収の速さ。

## 参考

- GitHub Docs: [Self-hosted runners reference](https://docs.github.com/ja/actions/reference/runners/self-hosted-runners)
- GitHub Docs: [REST API endpoints for self-hosted runners](https://docs.github.com/en/enterprise-cloud@latest/rest/actions/self-hosted-runners)
- Docker Docs: [Container networks](https://docs.docker.com/engine/network/#container-networks)
- Podman Docs: [podman run --network](https://docs.podman.io/en/latest/markdown/podman-run.1.html)
