# Muve

A native desktop IDE for agentic programming. The AI agent is the primary actor — reading, creating, editing, and deleting files — while the human observes and directs. The conversation IS the IDE.

## Vision

Traditional IDEs assume a human edits files manually. Muve flips that: the agent works, the human directs. The interface is optimized for watching an AI agent manipulate a codebase in real time, with full visibility into what it reads, writes, and changes.

**Core principles:**
- **Chat-first** — the conversation panel is the primary workspace, not the editor
- **Radical transparency** — every file operation (read, create, edit, delete, run) renders as a first-class object in the chat stream with diffs, previews, and clickable file references
- **File tree as live dashboard** — the sidebar reflects the real filesystem and highlights which file the agent is actively processing
- **Multi-session** — multiple projects open simultaneously, each with its own Claude conversation, file tree, and open tabs
- **Native-fast** — Rust backend via Tauri, no Electron bloat

## Tech stack

- **Frontend:** Svelte 5 (runes), TypeScript, Tailwind CSS v4, CodeMirror 6
- **Backend:** Tauri 2, Rust (tokio, similar, serde_json)
- **Agent:** Claude Code CLI (`claude -p --output-format stream-json --verbose --include-partial-messages`)
- **Build:** Vite, SvelteKit (adapter-static for SPA)
- **Package manager:** Bun

## Architecture

```
src/                          Svelte frontend
  lib/
    stores/                   Svelte 5 rune-based stores (.svelte.ts)
      sessions.svelte.ts      Multi-session management (save/restore/switch)
      chat.svelte.ts          Messages, streaming state
      files.svelte.ts         File tree, open tabs, agent highlighting
      agent.svelte.ts         Agent status
      ide.svelte.ts           Panel visibility and sizing
    agent/handler.ts          Tauri event listeners → store updates
    tauri/                    Typed Tauri IPC wrappers
      commands.ts             invoke() wrappers for Rust commands
      events.ts               listen() wrappers for Rust events
      types.ts                Shared TypeScript types
    components/
      ide/                    Shell: TopBar, StatusBar, IDELayout
      chat/                   ChatPanel, AgentMessage, ActionBlock, DiffView, ThinkingBlock
      editor/                 FilePanel (tabs + CodeMirror)
      sidebar/                FileTree, FileTreeNode
    actions/                  Svelte actions: resizable, autoscroll, codemirror
    utils/                    Markdown renderer, keyboard shortcuts
    demo/                     Demo data and playback runner

src-tauri/src/                Rust backend
  lib.rs                      Tauri setup, plugin registration, state init
  commands.rs                 All Tauri commands:
                                FS: get_cwd, set_cwd, list_directory, read_file
                                Agent: send_message, is_agent_running, set_session_id
                                Helpers: relativize_path, build_tree, compute_diff
```

## Data flow

1. User types message → ChatPanel → `invoke("send_message")`
2. Rust spawns `claude -p "msg" --output-format stream-json ...`
3. Rust reads stdout NDJSON, emits Tauri events: `agent:text-delta`, `agent:action`, `agent:turn-end`, etc.
4. Frontend `handler.ts` receives events → updates chat, files, agent stores
5. Svelte reactivity patches DOM

For conversation continuity, Rust captures `session_id` from Claude's `system` event and passes `--resume <id>` on subsequent messages.

## Sessions

A session = cwd + Claude session_id + chat messages + file state (open tabs, expanded dirs). Sessions are managed in `sessions.svelte.ts`. Switching sessions snapshots the current state, restores the target, and updates the Rust backend's cwd/session_id.

## Commands

```bash
cargo tauri dev          # Run in development (uses bunx --bun vite dev for frontend)
bunx --bun vite build    # Build frontend only
cargo check              # Check Rust only (from src-tauri/)
bunx --bun svelte-check --tsconfig ./tsconfig.json  # Type-check frontend
```

Note: Node.js on this machine runs as x64 (Rosetta) while Bun is arm64. Always use `bunx --bun` for vite/svelte-kit commands. Use `cargo tauri dev` (not `bun run tauri dev`) to avoid native module mismatches.

## Rules

Scoped rules live in `.claude/rules/`:

- `general.md` — code style, build commands, no-speculation policy
- `svelte.md` — runes, store patterns, component guidelines, Tailwind
- `rust.md` — commands.rs structure, CLI parsing, event emission
- `stores.md` — snapshot/restore for sessions, $state patterns
- `agent.md` — handler.ts patterns, event wiring, streaming state
