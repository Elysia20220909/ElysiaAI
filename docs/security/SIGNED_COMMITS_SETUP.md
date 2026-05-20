# ❄️ Signed Commit Setup

This guide enables verified commits for ElysiaAI.

## Why

Verified commits reduce the risk of:

- account impersonation
- malicious commit injection
- forged commit history
- supply-chain tampering

## Recommended Method

Use SSH signing with Ed25519.

## 1. Generate Signing Key

```bash
ssh-keygen -t ed25519 -C "elysiaai-signing"
```

## 2. Configure Git

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

## 3. Add Signing Key to GitHub

Open:

```text
GitHub → Settings → SSH and GPG keys
```

Add:

```text
New SSH key → Key type: Signing Key
```

Paste:

```bash
cat ~/.ssh/id_ed25519.pub
```

## 4. Verify

Create a signed commit:

```bash
git commit -m "test signed commit"
```

GitHub should show:

```text
Verified
```

## Recommended Future Policy

Once all active developer devices are configured:

- Enable branch rule:
  - Require signed commits

## Device Notes

Recommended signing devices:

- MacBook Pro
- Mac Studio
- Dedicated Linux workstation

Avoid:

- disposable VMs
- temporary WSL environments
- shared machines

## Recovery

If a signing key is compromised:

1. Remove the SSH signing key from GitHub.
2. Generate a new Ed25519 key.
3. Reconfigure Git.
4. Rotate any related deploy keys.
