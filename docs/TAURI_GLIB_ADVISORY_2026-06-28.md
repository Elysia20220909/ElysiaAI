# Tauri glib advisory note

Date: 2026-06-28

## Summary

Dependabot reports `GHSA-wrw7-89jp-8q8g` against `glib` in `src-tauri/Cargo.lock`.

The affected dependency is not a direct Rust dependency of ElysiaAI. It is pulled through the Linux GTK3/WebKit stack used by Tauri/Wry:

`tauri -> tauri-runtime-wry/wry/webkit2gtk/gtk -> glib 0.18.5`

The patched range starts at `glib 0.20.0`, but the current GTK3 crate chain keeps `gtk 0.18.2 -> glib ^0.18`. A direct `cargo update -p glib --precise 0.20.0` does not resolve because Cargo must satisfy the upstream `gtk` constraint.

## Distribution impact

Windows and macOS desktop builds are not expected to load the Linux GTK3/WebKit dependency path at runtime.

Linux builds should be treated as advisory-gated until the upstream Tauri/Wry/GTK dependency tree moves away from `glib 0.18.x`, or until the project switches Linux webview packaging to a dependency path that resolves `glib >= 0.20.0`.

## Checked commands

```bash
cargo tree --target all -i glib
cargo update -p glib --precise 0.20.0
cargo update -p tauri --precise 2.11.3
```

Result:

* `glib` remains locked under `gtk v0.18.2`.
* Updating Tauri from `2.11.2` to `2.11.3` does not remove the advisory.
* No unresolved lockfile change was kept.

## Release handling

For Beta desktop distribution:

* Allow Windows/macOS smoke packaging if CI is green.
* Mark Linux packaging as "known upstream dependency advisory" in release notes.
* Recheck after Tauri/Wry publishes a Linux dependency chain that no longer depends on `gtk 0.18.x` or `glib 0.18.x`.
* Do not dismiss the Dependabot alert as fixed until `Cargo.lock` resolves `glib >= 0.20.0`.

## Connected gate

The advisory is connected to `scripts/tauri-distribution-check.ts`.

Use this command to block Linux distribution candidates while `glib` is below the patched range:

```bash
bun run desktop:check:linux
```

Use this command only to record the known Beta waiver in CI or local release notes:

```bash
bun run desktop:check:linux:beta
```

The waiver command keeps the risk visible. It does not approve Linux distribution.
