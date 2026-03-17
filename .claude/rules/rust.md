---
paths:
  - "src-tauri/**/*.rs"
  - "src-tauri/Cargo.toml"
---

# Rust rules

- All Tauri commands live in `commands.rs`. Don't split into modules unless it passes ~600 lines.
- Parse Claude CLI JSON output with `serde_json::Value`, not rigid structs. The CLI format is complex and evolves.
- Emit Tauri events as simple JSON payloads (`serde_json::json!`). The frontend handles typing.
- File paths from Claude CLI are absolute. Always run them through `relativize_path()` before emitting to the frontend.
- The `IGNORE` const controls which directories are hidden from the file tree. Update it when adding new common ignore patterns.
- Async commands that spawn background work should use `tokio::spawn` and track `is_running` to prevent concurrent agent invocations.
- Capture stderr before `child.wait()` — once the process exits, stderr may not be readable.
- Don't add crate dependencies without a clear reason. Current deps: tauri, serde, serde_json, tokio, similar, tauri-plugin-store, tauri-plugin-dialog.
