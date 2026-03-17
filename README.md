<p align="center">
  <h1 align="center">Muve</h1>
  <p align="center">
    A native desktop IDE where the AI agent codes and you direct.
  </p>
</p>

<p align="center">
  <a href="#about">About</a> &nbsp;&bull;&nbsp;
  <a href="#how-it-works">How It Works</a> &nbsp;&bull;&nbsp;
  <a href="#tech-stack">Tech Stack</a> &nbsp;&bull;&nbsp;
  <a href="#getting-started">Getting Started</a>
</p>

---

## About

Traditional IDEs assume you edit files by hand. **Muve flips that.** The AI agent reads, creates, edits, and deletes files while you watch it work and steer the direction. The conversation *is* the IDE.

### Design principles

- **Chat-first** — the conversation panel is the primary workspace, not the editor
- **Radical transparency** — every file operation renders as a first-class object in the chat stream with inline diffs, previews, and clickable file references
- **Live file tree** — the sidebar reflects the real filesystem and highlights which files the agent is actively touching
- **Multi-session** — multiple projects open simultaneously, each with its own conversation, file tree, and open tabs
- **Native performance** — Rust backend via Tauri 2, no Electron

## How It Works

```
You type a message
        │
        ▼
┌───────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Svelte UI    │────▶│  Tauri (Rust)    │────▶│  Claude Code    │
│               │◀────│                  │◀────│  CLI            │
└───────────────┘     └──────────────────┘     └─────────────────┘
        │                                              │
        │         Real-time streaming via               │
        │◀──────── Tauri events (NDJSON) ──────────────┘
        │
        ▼
 Chat renders file reads, edits,
 diffs, and shell output live
```

1. You send a message from the chat panel
2. Rust spawns Claude Code as a subprocess, streaming structured JSON
3. Every agent action — file reads, writes, diffs, shell commands — streams back as a Tauri event
4. The frontend renders each action inline with syntax-highlighted diffs and clickable file links
5. Session state persists across conversations so you can pick up where you left off

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5, TypeScript, Tailwind CSS v4, CodeMirror 6 |
| Backend | Tauri 2, Rust, Tokio |
| Agent | Claude Code CLI (stream-json mode) |
| Build | Vite, SvelteKit (static adapter) |
| Package Manager | Bun |

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Bun](https://bun.sh/)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/muve.git
cd muve

# Install frontend dependencies
bun install

# Run in development
cargo tauri dev
```

### Build

```bash
# Production build
cargo tauri build
```

## Project Structure

```
src/                        Svelte frontend
  lib/
    stores/                 Reactive state (Svelte 5 runes)
    agent/                  Event handler wiring
    tauri/                  Typed IPC wrappers
    components/
      chat/                 Chat panel, message rendering, diffs
      editor/               File viewer with CodeMirror
      sidebar/              File tree
      ide/                  Shell layout, top bar, status bar

src-tauri/src/              Rust backend
  lib.rs                    App setup and plugin registration
  commands.rs               Tauri commands (filesystem, agent, helpers)
```

## License

MIT
