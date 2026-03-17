---
paths:
  - "**"
---

# General rules

- Keep files short and focused. Prefer fewer, denser files over many small ones.
- No premature abstractions. Three similar lines of code beats a helper used once.
- Don't add comments that restate the code. Only comment non-obvious intent.
- Don't add features speculatively. Build what's needed now.
- Don't add dependencies without a clear reason.
- After making changes, verify: `cargo check` (from src-tauri/), `bunx --bun vite build`, `bunx --bun svelte-check --tsconfig ./tsconfig.json`.
- Use `bunx --bun` for vite/svelte-kit commands, `cargo tauri dev` to run the app. Never `bun run tauri` (native module mismatch: Node is x64 Rosetta, Bun is arm64).
