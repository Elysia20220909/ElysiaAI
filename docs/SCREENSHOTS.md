# ElysiaAI Screenshot Guide

This guide defines how screenshots should be captured for README and release documentation.

## Recommended paths

Use these paths for stable README previews:

```text
docs/screenshots/desktop.png
docs/screenshots/local-ops.png
docs/screenshots/security-center.png
```

## Before capturing

- Use a clean local environment.
- Remove private documents from the UI.
- Redact usernames, tokens, webhook URLs, local paths, and private RAG content.
- Avoid showing `.env`, logs, browser history, or terminal secrets.
- Prefer sample data over real personal data.

## Capture targets

### Desktop

Show the normal ElysiaAI desktop or web UI entry point.

### Local Ops

Show local service status, health checks, or safe operational views.

### Security Center

Show security status without exposing secrets, private logs, or exploit payloads.

## Image quality

- Prefer PNG.
- Use readable resolution.
- Keep screenshots current with the UI.
- Avoid decorative screenshots that do not represent real behavior.

## Review checklist

Before committing screenshots:

- [ ] No secrets are visible.
- [ ] No private RAG content is visible.
- [ ] No webhook URLs are visible.
- [ ] No personal files or private paths are visible.
- [ ] The screenshot matches the current UI.

Screenshots are documentation artifacts, not trophies. They should show the path through the castle without revealing where the keys are hidden.
