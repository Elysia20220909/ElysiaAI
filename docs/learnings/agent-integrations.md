# Agent Integrations

Load when changing OpenAI, Open-LLM-VTuber, auth, or cross-service agent behavior.

## Current Pattern

- Keep the Bun/Elysia server as the HTTP integration layer.
- Keep Python kernel code focused on AI orchestration, tools, and local model behavior.
- Prefer explicit environment variables and documented setup steps over hidden defaults.
- Preserve local-first behavior unless the user asks for cloud behavior.

## OpenAI Work

- Check `docs/OPENAI_INTEGRATION.md` before editing OpenAI-facing code.
- Keep secrets in environment variables.
- Avoid logging request bodies, API keys, tokens, or user private content.

## Open-LLM-VTuber Work

- Check `docs/OPEN_LLM_VTUBER_INTEGRATION.md`.
- Make integration health visible through docs or diagnostics.
- Keep service startup manual unless the user explicitly asks for automation.

## Review Checklist

- Auth boundary clear.
- Secrets not committed.
- Failure mode documented.
- Small targeted test or smoke check run.
