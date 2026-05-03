# Native Lite Lab

Rust, Swift, and Bun are split into three lanes so ElysiaAI can become lighter without losing the playful desktop feel.

## Entry Points

| Surface | Path |
| --- | --- |
| Web lab | `http://127.0.0.1:3000/native-lite.html` |
| JSON status | `http://127.0.0.1:3000/api/native-lite` |
| Terminal snapshot | `bun run native:lite` |
| Management command | `bun scripts/manage.ts native-lite` |

## Lanes

- Rust Pulse Engine: Tauri-native scan and desktop commands.
- Swift Resonance Layer: macOS-native scoring and future Secure Enclave hooks.
- Bun Fallback Surface: immediate web and CLI view when native build tools are incomplete.

On Windows, Swift source stays in `src-tauri/native`, while Rust fallback math keeps the desktop native layer buildable once the MSVC linker is installed.

## Lightweighting Rules

- Keep `dev:lite` as the default local stack for fast startup.
- Move expensive model, memory, and crawler work behind explicit full-stack startup.
- Treat `node_modules`, `.venv`, `src-tauri/target`, `.tmp`, `logs`, and `uploads` as budget buckets.
- Use Rust for fast local scanning and Tauri commands.
- Use Swift only where platform-native macOS features are worth the extra toolchain.
- Keep Bun as the always-available control surface.
