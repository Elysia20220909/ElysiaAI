# Photo Automation

Load when editing FF14 photo scripts, screenshot helpers, or desktop/game automation.

## Hard Rule

No automatic execution.

The user explicitly requested complete stop for auto-run behavior. Scripts may be generated, documented, and manually launched, but must not start controlling the game, keyboard, mouse, or camera on their own.

## Safe Pattern

- Manual launch only.
- Clear dry-run mode when possible.
- Store screenshots in explicit user-approved paths such as `C:\Users\Public\Pictures`.
- Keep input automation separate from image sorting or metadata work.
- Add obvious stop controls for any interactive helper.

## Review Checklist

- No startup hooks.
- No background scheduler.
- No hidden hotkey listener unless the user explicitly starts it.
- No destructive file moves without preview.
- Output paths are configurable and visible.
