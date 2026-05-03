# Common Mistakes

Load every session. Keep this short and only add mistakes that are costly.

## 1. Auto-running input automation

Symptom: a script starts controlling the desktop or a game without a deliberate user action.

Correct pattern: generate scripts and launchers, but require manual execution. Keep automation opt-in.

Why it matters: user explicitly requested complete stop for automatic execution.

## 2. Treating local privacy as optional

Symptom: adding remote API calls, telemetry, or cloud storage for memory/search without an explicit request.

Correct pattern: prefer Ollama, Milvus Lite, local files, and user-controlled integrations.

Why it matters: local-first privacy is a core promise of ElysiaAI.

## 3. Committing local state

Symptom: staging `.env`, logs, upload data, deletion result JSONL files, caches, or generated runtime state.

Correct pattern: check `git status --short` carefully and keep local artifacts ignored.

Why it matters: these files can leak secrets or noisy personal data.

## 4. Skipping dependency alignment

Symptom: package versions drift between `package.json`, lockfiles, Prisma, or Python requirements.

Correct pattern: run `bun run check:deps` after dependency edits and use `bun run security:audit` for mixed Bun/Python audits.

Why it matters: previous work added explicit guards for dependency and security drift.

## 5. Breaking Japanese text encoding

Symptom: garbled Japanese, Windows-1252 fragments, or invalid UTF-8 in docs/prompts.

Correct pattern: run `bun run check:encoding` after touching text-heavy files.

Why it matters: ElysiaAI has Japanese docs and persona content; mojibake is a real regression.
