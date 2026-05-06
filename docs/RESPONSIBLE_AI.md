# ElysiaAI Responsible AI Policy

ElysiaAI should be useful, local-first, and careful with user trust.
The project goal is not only "a convenient AI", but "an AI that knows the lines it must not cross."

## Core Principles

- Privacy first: user data, private documents, chat logs, API keys, and webhook URLs stay local unless the user explicitly chooses otherwise.
- Consent first: do not collect, reuse, publish, or send private data without clear user intent.
- Least privilege: AI tools should receive only the permissions and data needed for the current task.
- Human control: privileged, destructive, external, or irreversible actions need user confirmation.
- Honesty: when an answer is uncertain, inferred, unsourced, or incomplete, say so.

## Personal Data and Logs

- Do not log API keys, tokens, webhook URLs, private document text, or full chat payloads by default.
- Keep log retention short and configurable.
- Prefer redacted summaries over raw prompts or raw retrieved documents.
- Keep `.env`, uploads, local caches, generated deletion reports, and runtime logs out of Git.
- Review RAG corpora for personal data before indexing or sharing.

## RAG and Prompt Injection

Retrieved documents are untrusted reference material.
They must not override system policy, developer policy, admin policy, or user confirmation requirements.

Defenses:

- Label retrieved content as reference context.
- Strip or ignore instructions embedded inside retrieved documents.
- Do not place secrets in retrievable corpora.
- Filter sensitive output before responding.
- Require confirmation before admin actions or tool execution.

## Tool Execution Safety

The most sensitive path is:

```text
User input -> AI reasoning -> tool execution
```

Minimum controls:

- Allowlist callable tools and outbound integrations.
- Validate paths, URLs, commands, and payloads before execution.
- Separate read-only actions from write, post, delete, payment, deploy, and admin actions.
- Use least-privilege credentials for Slack, Discord, GitHub, APIs, and databases.
- Show the user what will happen before privileged actions run.

## Misinformation and Overconfidence

ElysiaAI should clearly mark:

- uncertain claims
- inferred answers
- missing sources
- stale information
- model limitations

When the project uses browsing, connectors, or RAG, cite or name the source where practical.
When no source is available, say that plainly.

## Integrations

Slack, Discord, GitHub, email, and webhook bridges can expose private context quickly.

- Treat webhook URLs and bot tokens as secrets.
- Keep outbound posting opt-in.
- Avoid sending private chat or RAG content to channels by default.
- Keep admin-only actions behind role checks and explicit confirmation.

## Project Checklist

- `SECURITY.md` exists and explains reporting and secret handling.
- `.env.example` documents secret boundaries without real secrets.
- README states the privacy and responsible AI stance.
- Threat model includes AI-to-tool execution risk.
- Logs and RAG stores have retention and redaction guidance.
- Admin actions are separated from normal user actions.
