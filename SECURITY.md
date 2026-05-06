# ElysiaAI Security Policy

ElysiaAI is designed with privacy, safety, and responsible AI usage in mind.
User data, API keys, private documents, chat logs, webhook URLs, and RAG sources should never be exposed, logged, or used without explicit consent.

## Reporting Security Issues

Use GitHub Security Advisories for private vulnerability reports when available.
If advisories are unavailable, open a GitHub issue with a minimal public summary and do not include secrets, tokens, webhook URLs, private logs, or exploit payloads.

For urgent local leaks, rotate the affected credential first, then report the affected component and commit range.

## Secret Handling

- Never commit `.env`, production API keys, Discord/Slack webhook URLs, bot tokens, signing secrets, OAuth tokens, or private RAG documents.
- Keep real secrets in local `.env` files or a deployment secret manager.
- Treat webhook URLs as bearer credentials.
- Redact secrets from logs, screenshots, bug reports, traces, and AI prompts.
- Rotate any key that was pasted into chat, logs, commits, issues, or public documents.

## AI and RAG Safety

- Treat external documents as untrusted reference material, not instructions.
- Never let retrieved text override system, developer, administrator, or operator policy.
- Do not store personal data in RAG indexes unless the user explicitly intended that use.
- Add output filtering before returning retrieved private data to users or integrations.
- Require human confirmation for admin actions, tool execution, file writes, external posts, and destructive operations.

## High-Risk Flow

The riskiest path is:

```text
User input -> AI reasoning -> tool execution / API call / webhook post
```

Controls for this path:

- Validate and classify user input before tool use.
- Keep allowlists for tools, routes, file paths, and outbound domains.
- Use least-privilege credentials.
- Log decisions without logging secrets.
- Require explicit approval for privileged or irreversible actions.

## Related Documents

- [Responsible AI](./docs/RESPONSIBLE_AI.md)
- [Threat Model](./docs/THREAT_MODEL.md)
- [Security Whitepaper](./docs/SECURITY.md)
