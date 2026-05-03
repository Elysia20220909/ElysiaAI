# Testing and Security

Load when changing dependencies, scripts, auth, network behavior, or quality gates.

## Fast Checks

```powershell
bun run lint
bun run typecheck
bun run test
```

## Guard Checks

```powershell
bun run check:deps
bun run check:encoding
bun run security:glassworm -- --ci
bun run security:audit
```

## Dependency Changes

- Keep `package.json`, lockfiles, Prisma, and Python requirements aligned.
- Prefer minimal upgrades that fix the issue.
- Record security-relevant changes in `docs/SECURITY_AUDIT.md` when meaningful.

## Security Review

- Check `.env` and local files are not staged.
- Avoid broad logging of user data.
- Keep XML/HTML parsing on safe libraries such as `defusedxml` where applicable.
- Prefer explicit allowlists for file paths and automation targets.
