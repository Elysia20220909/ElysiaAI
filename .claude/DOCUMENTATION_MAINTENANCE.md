# Documentation Maintenance

## Every Session

Load:
- `CLAUDE.md`
- `.claude/COMMON_MISTAKES.md`
- `.claude/QUICK_START.md`
- `.claude/ARCHITECTURE_MAP.md`

Then use `docs/INDEX.md` to choose task-specific docs.

## When to Update

- Add to `.claude/COMMON_MISTAKES.md` only when a mistake costs real debugging time or can leak data.
- Add to `docs/learnings/*.md` when a reusable project pattern emerges.
- Add a completion note only for meaningful tasks, not tiny edits.
- Move stale one-off plans to `docs/archive/`.

## Keep Small

- Split any learning file that grows beyond one clear topic.
- Prefer links over copied text.
- Do not duplicate large sections from active docs.
