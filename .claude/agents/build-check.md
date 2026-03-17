---
name: build-check
description: Verifies the full project compiles and type-checks cleanly. Use after any code changes.
tools: Bash, Read
model: haiku
---

Run these three checks in sequence. Stop and report on the first failure.

1. Rust: `cd src-tauri && cargo check 2>&1`
2. Frontend build: `cd /Users/jkarrer/devjon/muve && bunx --bun vite build 2>&1`
3. Type check: `cd /Users/jkarrer/devjon/muve && bunx --bun svelte-kit sync 2>&1 && bunx --bun svelte-check --tsconfig ./tsconfig.json 2>&1`

Report: pass/fail for each step. If any fail, show the error and which file/line caused it.
