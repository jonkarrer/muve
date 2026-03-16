# AgentIDE — Technical Specification (Tauri + Svelte)

> A native desktop IDE for agentic programming, built with Tauri + Svelte. The AI agent is the primary actor — reading, creating, editing, and deleting files — while the human observes, directs, and approves. The conversation IS the IDE.

---

## 1. Product vision

Traditional IDEs assume a human edits files manually. AgentIDE flips that: the agent works, the human directs. The interface is optimized for watching an AI agent manipulate a codebase in real time, with full visibility into what it reads, writes, and changes.

### Core principles

- **Chat-first**: The conversation panel is the primary workspace, not the editor
- **Radical transparency**: Every file operation (read, create, edit, delete, run) renders as a first-class object in the chat stream with diffs, previews, and clickable references
- **File tree as live dashboard**: The sidebar reflects the real filesystem and highlights which file the agent is actively processing
- **Human-in-the-loop**: The user can approve, reject, or modify agent actions before they commit
- **Native-fast**: Rust backend for filesystem, process management, and diffing — no Electron bloat

### Why Tauri + Svelte

| Concern | Tauri + Svelte | Electron + React |
|---------|---------------|------------------|
| Binary size | ~3-8 MB | ~150+ MB |
| RAM idle | ~25-40 MB | ~150-300 MB |
| JS runtime overhead | Zero (compiled away) | React runtime + virtual DOM |
| Reactivity model | Compiler-native runes | Runtime hooks + reconciler |
| Bundle size (JS) | ~15-30 KB | ~120-180 KB (React + Zustand) |
| FS access | Direct via Rust `std::fs` | Node.js `fs` (slower, GC pauses) |
| Process spawn | Rust `tokio::process` (async, zero-copy) | Node.js `child_process` |
| Diff engine | Rust `similar` crate (10-100x faster) | JS `diff` library |
| File watcher | Rust `notify` crate (native OS events) | `chokidar` (polling fallback) |

**Why Svelte specifically**: Svelte 5's rune-based reactivity (`$state`, `$derived`, `$effect`) maps perfectly to Tauri's event push model. When Rust emits an `agent:action` event, a Svelte `$state` update triggers a surgical DOM patch with zero diffing overhead — no virtual DOM, no reconciler, no wasted renders. For an IDE that receives hundreds of rapid state updates during agent work, this matters.

---

## 2. Tech stack

### Frontend (WebView)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Build tool | **Vite** | Sub-second HMR, native ESM, first-class Svelte support |
| Framework | **Svelte 5** | Compiled reactivity, zero runtime, runes API |
| Language | **TypeScript** (strict) | Type safety across Tauri IPC boundary |
| Styling | **Tailwind CSS v4** | Utility-first, CSS-first config, dark theme |
| Code editor | **CodeMirror 6** | Lightweight, extensible, Svelte action wrapper |
| Terminal | **xterm.js** | PTY rendering in browser, Svelte action wrapper |
| Syntax highlight | **Shiki** | VS Code-quality, WASM-powered |
| Virtualization | **@tanstack/svelte-virtual** | Virtualized chat list for long conversations |
| Panel resize | **Custom Svelte action** | Lightweight drag handles (no React dep needed) |
| Icons | **lucide-svelte** | Tree-shakeable icon set |

### Backend (Rust / Tauri)

| Layer | Crate | Purpose |
|-------|-------|---------|
| Async runtime | **tokio** | Async process spawning, file I/O, channels |
| Filesystem | **std::fs** + **tokio::fs** | Direct, zero-overhead file access |
| File watching | **notify** (v6) | Native OS file system events (inotify/FSEvents/ReadDirectoryChanges) |
| Diff engine | **similar** | Fast line-level and word-level diffs |
| Process mgmt | **tokio::process** | Spawn and manage Claude Code CLI |
| Serialization | **serde** + **serde_json** | IPC message serialization |
| PTY | **portable-pty** | Real terminal emulation for agent shell commands |
| Git | **git2** (libgit2 bindings) | Branch info, status, staging, commit |
| Tree-sitter | **tree-sitter** | Language-aware file parsing (optional, phase 3) |
| Logging | **tracing** | Structured async-aware logging |

---

## 3. Project structure

```
agentide/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json              # Window config, IPC allowlist, bundle settings
│   ├── capabilities/
│   │   └── default.json             # Permission grants for IPC commands
│   ├── src/
│   │   ├── main.rs                  # Tauri bootstrap, plugin registration
│   │   ├── commands/                # Tauri IPC command handlers
│   │   │   ├── mod.rs
│   │   │   ├── fs.rs                # File read/write/delete/rename/move/list
│   │   │   ├── agent.rs             # Start/stop/send to agent, config
│   │   │   ├── terminal.rs          # PTY spawn, resize, write
│   │   │   └── git.rs               # Branch, status, stage, commit
│   │   ├── agent/                   # Agent management
│   │   │   ├── mod.rs
│   │   │   ├── protocol.rs          # Message types (mirrors TS types)
│   │   │   ├── manager.rs           # Agent lifecycle, message routing
│   │   │   ├── adapters/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── claude_code.rs   # Claude Code CLI adapter
│   │   │   │   ├── aider.rs         # Aider adapter
│   │   │   │   ├── codex.rs         # OpenAI Codex CLI adapter
│   │   │   │   └── generic.rs       # Generic stdin/stdout wrapper
│   │   │   └── parser.rs            # Parse agent CLI output → protocol messages
│   │   ├── fs/
│   │   │   ├── mod.rs
│   │   │   ├── tree.rs              # Build file tree from disk
│   │   │   ├── watcher.rs           # File system watcher (notify crate)
│   │   │   └── ignore.rs            # Respect .gitignore, .agentideignore
│   │   ├── diff/
│   │   │   ├── mod.rs
│   │   │   ├── engine.rs            # Diff computation (similar crate)
│   │   │   └── apply.rs             # Apply diffs to files
│   │   ├── terminal/
│   │   │   ├── mod.rs
│   │   │   └── pty.rs               # PTY management (portable-pty)
│   │   ├── git/
│   │   │   ├── mod.rs
│   │   │   └── ops.rs               # Git operations via git2
│   │   ├── state.rs                 # Shared app state (Arc<Mutex<...>>)
│   │   └── error.rs                 # Error types
│   └── icons/                       # App icons
│
├── src/                             # Frontend (Vite + Svelte)
│   ├── main.ts                      # Mount Svelte app
│   ├── App.svelte                   # Root component + keyboard shortcuts
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ide/
│   │   │   │   ├── IDELayout.svelte       # Master layout with resizable panels
│   │   │   │   ├── TopBar.svelte          # Logo, agent selector, layout toggles
│   │   │   │   ├── StatusBar.svelte       # Agent status, file count, git branch
│   │   │   │   └── ResizeHandle.svelte    # Draggable panel divider
│   │   │   ├── sidebar/
│   │   │   │   ├── FileTree.svelte        # Recursive file tree with live highlighting
│   │   │   │   ├── FileTreeNode.svelte    # Single node with animation states
│   │   │   │   └── FileTreeContext.svelte # Right-click context menu
│   │   │   ├── chat/
│   │   │   │   ├── ChatPanel.svelte       # Virtualized message list + input
│   │   │   │   ├── ChatInput.svelte       # Input with history, slash commands
│   │   │   │   ├── ChatMessage.svelte     # Routes to correct renderer via {#if}
│   │   │   │   ├── UserMessage.svelte
│   │   │   │   ├── AgentMessage.svelte    # Markdown + streaming cursor
│   │   │   │   ├── ThinkingBlock.svelte   # Collapsible reasoning
│   │   │   │   ├── ActionBlock.svelte     # File operation card
│   │   │   │   ├── DiffView.svelte        # Inline unified diff
│   │   │   │   ├── CodePreview.svelte     # Syntax-highlighted block
│   │   │   │   └── ApprovalControls.svelte # Accept / Reject / Edit
│   │   │   ├── editor/
│   │   │   │   ├── FilePanel.svelte       # Tabs + CodeMirror editor
│   │   │   │   ├── EditorTabs.svelte      # Open files with modified indicators
│   │   │   │   ├── CodeEditor.svelte      # CodeMirror 6 via Svelte action
│   │   │   │   └── EmptyState.svelte
│   │   │   └── terminal/
│   │   │       ├── TerminalPanel.svelte   # xterm.js via Svelte action
│   │   │       └── TerminalTabs.svelte    # Multiple PTY sessions
│   │   ├── stores/
│   │   │   ├── ide.svelte.ts              # Layout state, panel visibility (runes)
│   │   │   ├── files.svelte.ts            # File tree, open files, agent highlights
│   │   │   ├── chat.svelte.ts             # Messages, streaming state
│   │   │   └── agent.svelte.ts            # Agent status, config
│   │   ├── tauri/
│   │   │   ├── commands.ts                # Typed wrappers around Tauri invoke()
│   │   │   ├── events.ts                  # Typed Tauri event listeners
│   │   │   └── types.ts                   # Shared types (mirrors Rust protocol.rs)
│   │   ├── actions/
│   │   │   ├── codemirror.ts              # Svelte action: use:codemirror
│   │   │   ├── xterm.ts                   # Svelte action: use:xterm
│   │   │   ├── resizable.ts              # Svelte action: use:resizable
│   │   │   └── autoscroll.ts             # Svelte action: use:autoscroll
│   │   ├── utils/
│   │   │   ├── markdown.ts               # Markdown → HTML renderer
│   │   │   ├── highlight.ts              # Shiki setup + language loading
│   │   │   └── shortcuts.ts              # Keyboard shortcut manager
│   │   └── theme.ts                       # Color tokens
│   ├── app.css                            # Tailwind base + theme variables
│   └── app.html                           # Vite entry template
│
├── svelte.config.js                       # Svelte compiler config
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. Tauri IPC architecture

The frontend talks to Rust via Tauri's command and event system — zero-overhead function calls across the WebView bridge. Svelte's rune-based reactivity makes the event listener integration particularly clean.

### 4.1 Commands (frontend → Rust)

Request/response. Frontend calls `invoke()`, Rust handler returns a result. Same as before — Tauri commands are framework-agnostic.

```rust
// src-tauri/src/commands/fs.rs

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&path, &content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<FileNode>, String> {
    fs::build_tree(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn compute_diff(before: String, after: String) -> Result<Vec<DiffHunk>, String> {
    Ok(diff::engine::compute(&before, &after))
}
```

```typescript
// src/lib/tauri/commands.ts

import { invoke } from "@tauri-apps/api/core";
import type { FileNode, DiffHunk, AgentConfig } from "./types";

export const fs = {
  readFile: (path: string) =>
    invoke<string>("read_file", { path }),

  writeFile: (path: string, content: string) =>
    invoke<void>("write_file", { path, content }),

  listDirectory: (path: string) =>
    invoke<FileNode[]>("list_directory", { path }),

  computeDiff: (before: string, after: string) =>
    invoke<DiffHunk[]>("compute_diff", { before, after }),
};

export const agent = {
  start: (config: AgentConfig) =>
    invoke<void>("start_agent", { config }),

  send: (message: string) =>
    invoke<void>("send_to_agent", { message }),

  stop: () =>
    invoke<void>("stop_agent"),
};

export const terminal = {
  spawn: (cwd?: string) =>
    invoke<string>("spawn_terminal", { cwd }),

  write: (id: string, data: string) =>
    invoke<void>("write_terminal", { id, data }),

  resize: (id: string, cols: number, rows: number) =>
    invoke<void>("resize_terminal", { id, cols, rows }),

  kill: (id: string) =>
    invoke<void>("kill_terminal", { id }),
};
```

### 4.2 Events (Rust → frontend)

Rust emits events, Svelte subscribes. This is where Svelte shines — `$effect` cleanly handles subscription lifecycle with automatic cleanup.

```rust
// src-tauri/src/agent/manager.rs — unchanged from before

use tauri::Emitter;

fn handle_agent_output(app: &AppHandle, event: AgentEvent) {
    match event {
        AgentEvent::TextChunk(text) => {
            app.emit("agent:text-chunk", &text).unwrap();
        }
        AgentEvent::Action(action) => {
            app.emit("agent:action", &action).unwrap();
        }
        AgentEvent::Thinking(text) => {
            app.emit("agent:thinking", &text).unwrap();
        }
        AgentEvent::StatusChange(status) => {
            app.emit("agent:status", &status).unwrap();
        }
        AgentEvent::Done => {
            app.emit("agent:done", &()).unwrap();
        }
    }
}

fn handle_fs_change(app: &AppHandle, event: FsEvent) {
    app.emit("fs:changed", &event).unwrap();
}

fn handle_pty_output(app: &AppHandle, terminal_id: &str, data: &[u8]) {
    app.emit(&format!("terminal:output:{}", terminal_id), data).unwrap();
}
```

```typescript
// src/lib/tauri/events.ts

import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { FileAction, AgentStatus, FsChangeEvent } from "./types";

export function onAgentTextChunk(handler: (chunk: string) => void): Promise<UnlistenFn> {
  return listen<string>("agent:text-chunk", (e) => handler(e.payload));
}

export function onAgentAction(handler: (action: FileAction) => void): Promise<UnlistenFn> {
  return listen<FileAction>("agent:action", (e) => handler(e.payload));
}

export function onAgentThinking(handler: (text: string) => void): Promise<UnlistenFn> {
  return listen<string>("agent:thinking", (e) => handler(e.payload));
}

export function onAgentStatus(handler: (status: AgentStatus) => void): Promise<UnlistenFn> {
  return listen<AgentStatus>("agent:status", (e) => handler(e.payload));
}

export function onFsChanged(handler: (event: FsChangeEvent) => void): Promise<UnlistenFn> {
  return listen<FsChangeEvent>("fs:changed", (e) => handler(e.payload));
}

export function onTerminalOutput(id: string, handler: (data: Uint8Array) => void): Promise<UnlistenFn> {
  return listen<number[]>(`terminal:output:${id}`, (e) => {
    handler(new Uint8Array(e.payload));
  });
}
```

### 4.3 Data flow diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Tauri WebView (Svelte 5)                                                   │
│                                                                             │
│  ChatInput.svelte ──invoke("send_to_agent")──┐                              │
│                                              │                              │
│  ChatPanel.svelte  ◄──listen("agent:*")──────┼────────────────────┐         │
│  FileTree.svelte   ◄──listen("fs:changed")───┼───────────────┐    │         │
│  TerminalPanel     ◄──listen("terminal:*")───┼──────────┐    │    │         │
│  CodeEditor        ◄──invoke("read_file")────┼─────┐    │    │    │         │
│                                              │     │    │    │    │         │
│  Svelte stores ($state) ◄────── all events ──┼─────┼────┼────┼────┤         │
│                                              │     │    │    │    │         │
├──────────────────────────────────────────────┼─────┼────┼────┼────┼─────────┤
│  Tauri IPC Bridge (zero-copy serde)          │     │    │    │    │         │
├──────────────────────────────────────────────┼─────┼────┼────┼────┼─────────┤
│  Rust Backend                                ▼     ▼    │    │    │         │
│                                                         │    │    │         │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐         │    │    │         │
│  │ AgentManager │  │ FS Cmds  │  │ PTY Mgr  │         │    │    │         │
│  │              │  │          │  │          ├───emit───┘    │    │         │
│  │  spawns CLI  │  │ read     │  │ spawn    │              │    │         │
│  │  parses JSON │  │ write    │  │ write    │              │    │         │
│  │  routes msgs │  │ delete   │  │ resize   │              │    │         │
│  │       │      │  │ rename   │  └──────────┘              │    │         │
│  │       │      │  │ diff     │                            │    │         │
│  │       ▼      │  └──────────┘  ┌──────────┐              │    │         │
│  │  emit(agent:*)──────────────────────────────────────────┼────┘         │
│  └──────────────┘                │FS Watcher ├──emit───────┘              │
│                                  │ (notify)  │                            │
│  ┌─────────────────────────┐     └──────────┘                            │
│  │ Claude Code CLI Process │                                              │
│  │ stdin ◄── user messages │                                              │
│  │ stdout ──► JSON events  │                                              │
│  └─────────────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Svelte 5 state management

Svelte 5 runes replace both Zustand and React hooks. Stores are plain `.svelte.ts` files that export reactive state. No library needed.

### 5.1 Files store

```typescript
// src/lib/stores/files.svelte.ts

import type { FileNode, FileAction } from "$lib/tauri/types";

interface OpenFile {
  path: string;
  content: string;
  language: string;
  dirty: boolean;
}

interface RecentTouch {
  action: string;
  timestamp: number;
}

// Reactive state via Svelte 5 runes — all exported as module-level $state
let tree = $state<FileNode[]>([]);
let activeAgentFile = $state<string | null>(null);
let activeAgentAction = $state<FileAction["kind"] | null>(null);
let recentlyTouched = $state<Map<string, RecentTouch>>(new Map());
let expandedDirs = $state<Set<string>>(new Set());
let selectedFile = $state<string | null>(null);
let openFiles = $state<OpenFile[]>([]);
let activeTabIndex = $state(0);

// Derived
let activeFile = $derived(openFiles[activeTabIndex] ?? null);
let fileCount = $derived(countFiles(tree));

// Actions
function setTree(newTree: FileNode[]) {
  tree = newTree;
}

function setActiveAgentFile(path: string | null, action?: FileAction["kind"]) {
  activeAgentFile = path;
  activeAgentAction = action ?? null;

  // Auto-expand parent directories
  if (path) {
    const parts = path.split("/");
    for (let i = 0; i < parts.length - 1; i++) {
      expandedDirs.add(parts.slice(0, i + 1).join("/"));
    }
  }
}

function addRecentlyTouched(path: string, action: string) {
  recentlyTouched.set(path, { action, timestamp: Date.now() });

  // Auto-clear after 5 seconds
  setTimeout(() => {
    recentlyTouched.delete(path);
  }, 5000);
}

function toggleDir(path: string) {
  if (expandedDirs.has(path)) {
    expandedDirs.delete(path);
  } else {
    expandedDirs.add(path);
  }
}

function selectFile(path: string) {
  selectedFile = path;
}

function openFileInTab(path: string, content: string, language = "text") {
  const existing = openFiles.findIndex((f) => f.path === path);
  if (existing >= 0) {
    activeTabIndex = existing;
    return;
  }
  openFiles.push({ path, content, language, dirty: false });
  activeTabIndex = openFiles.length - 1;
}

function closeTab(index: number) {
  openFiles.splice(index, 1);
  if (activeTabIndex >= openFiles.length) {
    activeTabIndex = Math.max(0, openFiles.length - 1);
  }
}

function countFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const n of nodes) {
    if (n.is_dir && n.children) count += countFiles(n.children);
    else count++;
  }
  return count;
}

export const filesStore = {
  // State (read via filesStore.tree, etc.)
  get tree() { return tree; },
  get activeAgentFile() { return activeAgentFile; },
  get activeAgentAction() { return activeAgentAction; },
  get recentlyTouched() { return recentlyTouched; },
  get expandedDirs() { return expandedDirs; },
  get selectedFile() { return selectedFile; },
  get openFiles() { return openFiles; },
  get activeTabIndex() { return activeTabIndex; },
  get activeFile() { return activeFile; },
  get fileCount() { return fileCount; },

  // Actions
  setTree,
  setActiveAgentFile,
  addRecentlyTouched,
  toggleDir,
  selectFile,
  openFileInTab,
  closeTab,
};
```

### 5.2 Chat store

```typescript
// src/lib/stores/chat.svelte.ts

import type { Message } from "$lib/tauri/types";

let messages = $state<Message[]>([]);
let streamingContent = $state("");
let streamingMessageId = $state<string | null>(null);
let isStreaming = $derived(streamingMessageId !== null);

function addMessage(msg: Message) {
  messages.push(msg);
}

function appendStreamChunk(chunk: string) {
  streamingContent += chunk;
}

function finalizeStream(id: string, thinking?: string) {
  messages.push({
    role: "agent",
    type: "text",
    id,
    timestamp: new Date().toISOString(),
    content: streamingContent,
    thinking,
  });
  streamingContent = "";
  streamingMessageId = null;
}

function clearMessages() {
  messages = [];
  streamingContent = "";
  streamingMessageId = null;
}

export const chatStore = {
  get messages() { return messages; },
  get streamingContent() { return streamingContent; },
  get streamingMessageId() { return streamingMessageId; },
  get isStreaming() { return isStreaming; },
  addMessage,
  appendStreamChunk,
  finalizeStream,
  clearMessages,
  startStream(id: string) { streamingMessageId = id; streamingContent = ""; },
};
```

### 5.3 Agent store

```typescript
// src/lib/stores/agent.svelte.ts

import type { AgentStatus, AgentConfig } from "$lib/tauri/types";

let status = $state<AgentStatus>("idle");
let config = $state<AgentConfig | null>(null);
let pendingApprovals = $state(0);
let isConnected = $state(false);

let statusLabel = $derived(
  status === "active" ? "agent active" :
  status === "thinking" ? "thinking..." :
  status === "awaiting_approval" ? `${pendingApprovals} pending` :
  status === "error" ? "error" : "idle"
);

export const agentStore = {
  get status() { return status; },
  get config() { return config; },
  get pendingApprovals() { return pendingApprovals; },
  get isConnected() { return isConnected; },
  get statusLabel() { return statusLabel; },

  setStatus(s: AgentStatus) { status = s; },
  setConfig(c: AgentConfig) { config = c; },
  setConnected(c: boolean) { isConnected = c; },
  incrementPending() { pendingApprovals++; },
  decrementPending() { pendingApprovals = Math.max(0, pendingApprovals - 1); },
};
```

### 5.4 IDE layout store

```typescript
// src/lib/stores/ide.svelte.ts

let showSidebar = $state(true);
let showFilePanel = $state(true);
let showTerminal = $state(false);
let sidebarWidth = $state(220);
let filePanelWidth = $state(380);
let terminalHeight = $state(200);

export const ideStore = {
  get showSidebar() { return showSidebar; },
  get showFilePanel() { return showFilePanel; },
  get showTerminal() { return showTerminal; },
  get sidebarWidth() { return sidebarWidth; },
  get filePanelWidth() { return filePanelWidth; },
  get terminalHeight() { return terminalHeight; },

  toggleSidebar() { showSidebar = !showSidebar; },
  toggleFilePanel() { showFilePanel = !showFilePanel; },
  toggleTerminal() { showTerminal = !showTerminal; },
  setSidebarWidth(w: number) { sidebarWidth = Math.min(350, Math.max(150, w)); },
  setFilePanelWidth(w: number) { filePanelWidth = Math.min(600, Math.max(280, w)); },
  setTerminalHeight(h: number) { terminalHeight = Math.min(400, Math.max(100, h)); },
};
```

---

## 6. Svelte component patterns

### 6.1 Tauri event subscription via $effect

```svelte
<!-- src/lib/components/chat/ChatPanel.svelte -->
<script lang="ts">
  import { onAgentTextChunk, onAgentAction, onAgentThinking, onAgentStatus } from "$lib/tauri/events";
  import { chatStore } from "$lib/stores/chat.svelte";
  import { filesStore } from "$lib/stores/files.svelte";
  import { agentStore } from "$lib/stores/agent.svelte";
  import ChatMessage from "./ChatMessage.svelte";
  import ChatInput from "./ChatInput.svelte";

  let chatEnd: HTMLDivElement;

  // Subscribe to Tauri events — $effect handles cleanup automatically
  $effect(() => {
    const unlisteners = [
      onAgentTextChunk((chunk) => {
        chatStore.appendStreamChunk(chunk);
      }),
      onAgentAction((action) => {
        chatStore.addMessage({
          role: "agent",
          type: "action",
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          action,
          status: "applied",
        });

        // Update file tree highlighting
        filesStore.setActiveAgentFile(action.path, action.kind);
        setTimeout(() => {
          filesStore.setActiveAgentFile(null);
          filesStore.addRecentlyTouched(action.path, action.kind);
        }, 800);
      }),
      onAgentStatus((status) => {
        agentStore.setStatus(status);
      }),
    ];

    return () => {
      // Cleanup all listeners when component unmounts
      unlisteners.forEach(async (p) => (await p)());
    };
  });

  // Auto-scroll to bottom on new messages
  $effect(() => {
    // Touch messages array to track it
    chatStore.messages.length;
    chatStore.streamingContent;
    chatEnd?.scrollIntoView({ behavior: "smooth" });
  });
</script>

<div class="flex flex-1 flex-col min-h-0">
  <div class="flex-1 overflow-y-auto">
    {#each chatStore.messages as msg (msg.id)}
      <ChatMessage {msg} />
    {/each}

    {#if chatStore.isStreaming}
      <div class="px-4 py-2 font-mono text-[13px] text-[#c5cdd8]">
        {chatStore.streamingContent}<span class="animate-pulse">▌</span>
      </div>
    {/if}

    <div bind:this={chatEnd}></div>
  </div>

  <ChatInput />
</div>
```

### 6.2 File tree node with reactive highlighting

```svelte
<!-- src/lib/components/sidebar/FileTreeNode.svelte -->
<script lang="ts">
  import { filesStore } from "$lib/stores/files.svelte";
  import type { FileNode } from "$lib/tauri/types";
  import { fs as fsCommands } from "$lib/tauri/commands";

  let { node, depth = 0 }: { node: FileNode; depth?: number } = $props();

  const actionColors: Record<string, string> = {
    read: "#4d9cf0",
    create: "#22d68a",
    edit: "#f0a830",
    delete: "#e8534a",
  };

  let isAgentActive = $derived(filesStore.activeAgentFile === node.path);
  let recentTouch = $derived(filesStore.recentlyTouched.get(node.path));
  let isSelected = $derived(filesStore.selectedFile === node.path);
  let isExpanded = $derived(filesStore.expandedDirs.has(node.path));
  let borderColor = $derived(
    isAgentActive ? actionColors[filesStore.activeAgentAction!] ?? "transparent" : "transparent"
  );

  async function handleClick() {
    if (node.is_dir) {
      filesStore.toggleDir(node.path);
    } else {
      filesStore.selectFile(node.path);
      const content = await fsCommands.readFile(node.path);
      filesStore.openFileInTab(node.path, content);
    }
  }
</script>

<button
  onclick={handleClick}
  class="flex w-full items-center gap-1 py-0.5 cursor-pointer font-mono text-[12.5px] border-l-2 transition-all duration-150"
  class:animate-pulse={isAgentActive}
  class:text-emerald-400={isSelected && !isAgentActive}
  class:bg-emerald-500/[0.08]={isSelected}
  style:border-left-color={borderColor}
  style:padding-left="{12 + depth * 16}px"
>
  {#if node.is_dir}
    <span class="text-amber-400 text-[11px] mr-1">{isExpanded ? "▾" : "▸"}</span>
  {:else}
    <span class="text-[8px] mr-1.5" style:color={actionColors.create}>◆</span>
  {/if}

  <span class:opacity-85={node.is_dir}>{node.name}</span>

  {#if isAgentActive && filesStore.activeAgentAction === "create"}
    <span class="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold tracking-wider">NEW</span>
  {/if}
  {#if isAgentActive && filesStore.activeAgentAction === "edit"}
    <span class="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold tracking-wider">MOD</span>
  {/if}
  {#if recentTouch}
    <span class="ml-auto w-1.5 h-1.5 rounded-full" style:background={actionColors[recentTouch.action]}></span>
  {/if}
</button>

{#if node.is_dir && isExpanded && node.children}
  {#each node.children as child (child.path)}
    <svelte:self node={child} depth={depth + 1} />
  {/each}
{/if}
```

### 6.3 Svelte actions for imperative libraries

Svelte actions (`use:action`) cleanly wrap imperative libraries like CodeMirror and xterm.js without lifecycle hook gymnastics.

```typescript
// src/lib/actions/codemirror.ts — Svelte action for CodeMirror 6

import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Action } from "svelte/action";

interface CodeMirrorParams {
  content: string;
  language?: any;  // CodeMirror language extension
  readonly?: boolean;
  onchange?: (content: string) => void;
}

export const codemirror: Action<HTMLDivElement, CodeMirrorParams> = (node, params) => {
  let view: EditorView;

  function create(p: CodeMirrorParams) {
    const extensions = [
      basicSetup,
      oneDark,
      EditorState.readOnly.of(p.readonly ?? true),
    ];

    if (p.language) extensions.push(p.language);

    if (p.onchange) {
      extensions.push(EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          p.onchange!(update.state.doc.toString());
        }
      }));
    }

    view = new EditorView({
      state: EditorState.create({ doc: p.content, extensions }),
      parent: node,
    });
  }

  create(params);

  return {
    update(newParams: CodeMirrorParams) {
      // Recreate if content changed externally (e.g., agent edit)
      if (newParams.content !== view.state.doc.toString()) {
        view.destroy();
        create(newParams);
      }
    },
    destroy() {
      view.destroy();
    },
  };
};
```

```typescript
// src/lib/actions/xterm.ts — Svelte action for xterm.js

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import type { Action } from "svelte/action";

interface XtermParams {
  ondata?: (data: string) => void;
  onresize?: (cols: number, rows: number) => void;
}

export const xterm: Action<HTMLDivElement, XtermParams> = (node, params) => {
  const term = new Terminal({
    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
    fontSize: 13,
    theme: {
      background: "#0a0e14",
      foreground: "#c5cdd8",
      cursor: "#22d68a",
      selectionBackground: "#22d68a33",
    },
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);

  term.open(node);

  try {
    term.loadAddon(new WebglAddon());
  } catch {
    // WebGL not available, fall back to canvas
  }

  fitAddon.fit();

  if (params.ondata) term.onData(params.ondata);
  if (params.onresize) {
    term.onResize(({ cols, rows }) => params.onresize!(cols, rows));
  }

  const resizeObserver = new ResizeObserver(() => fitAddon.fit());
  resizeObserver.observe(node);

  // Expose write method via custom property so parent can feed data
  (node as any).__xterm = term;

  return {
    destroy() {
      resizeObserver.disconnect();
      term.dispose();
    },
  };
};
```

```typescript
// src/lib/actions/resizable.ts — Svelte action for panel resize handles

import type { Action } from "svelte/action";

interface ResizableParams {
  direction: "horizontal" | "vertical";
  onresize: (delta: number) => void;
}

export const resizable: Action<HTMLDivElement, ResizableParams> = (node, params) => {
  let startPos = 0;

  function onMouseDown(e: MouseEvent) {
    e.preventDefault();
    startPos = params.direction === "horizontal" ? e.clientX : e.clientY;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = params.direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }

  function onMouseMove(e: MouseEvent) {
    const current = params.direction === "horizontal" ? e.clientX : e.clientY;
    const delta = current - startPos;
    startPos = current;
    params.onresize(delta);
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  node.addEventListener("mousedown", onMouseDown);

  return {
    destroy() {
      node.removeEventListener("mousedown", onMouseDown);
    },
  };
};
```

### 6.4 IDE layout with resize actions

```svelte
<!-- src/lib/components/ide/IDELayout.svelte -->
<script lang="ts">
  import { ideStore } from "$lib/stores/ide.svelte";
  import { resizable } from "$lib/actions/resizable";
  import FileTree from "../sidebar/FileTree.svelte";
  import ChatPanel from "../chat/ChatPanel.svelte";
  import FilePanel from "../editor/FilePanel.svelte";
  import TerminalPanel from "../terminal/TerminalPanel.svelte";
  import TopBar from "./TopBar.svelte";
  import StatusBar from "./StatusBar.svelte";
</script>

<div class="flex flex-col h-screen bg-[#0a0e14] text-[#c5cdd8] font-mono overflow-hidden">
  <TopBar />

  <div class="flex flex-1 min-h-0">
    <!-- Sidebar -->
    {#if ideStore.showSidebar}
      <div class="flex-shrink-0 flex flex-col bg-[#0d1117] border-r border-[#1e2a3a]"
           style:width="{ideStore.sidebarWidth}px">
        <FileTree />
      </div>
      <div use:resizable={{ direction: "horizontal", onresize: (d) => ideStore.setSidebarWidth(ideStore.sidebarWidth + d) }}
           class="w-1 cursor-col-resize hover:bg-emerald-500/20 transition-colors flex-shrink-0" />
    {/if}

    <!-- Main area (chat + terminal) -->
    <div class="flex flex-col flex-1 min-w-0">
      <div class="flex flex-1 min-h-0">
        <!-- Chat -->
        <div class="flex-1 flex flex-col min-w-[400px] border-r border-[#1e2a3a]">
          <ChatPanel />
        </div>

        <!-- File panel -->
        {#if ideStore.showFilePanel}
          <div use:resizable={{ direction: "horizontal", onresize: (d) => ideStore.setFilePanelWidth(ideStore.filePanelWidth - d) }}
               class="w-1 cursor-col-resize hover:bg-emerald-500/20 transition-colors flex-shrink-0" />
          <div class="flex-shrink-0 flex flex-col bg-[#0d1117]"
               style:width="{ideStore.filePanelWidth}px">
            <FilePanel />
          </div>
        {/if}
      </div>

      <!-- Terminal -->
      {#if ideStore.showTerminal}
        <div use:resizable={{ direction: "vertical", onresize: (d) => ideStore.setTerminalHeight(ideStore.terminalHeight - d) }}
             class="h-1 cursor-row-resize hover:bg-emerald-500/20 transition-colors flex-shrink-0" />
        <div class="flex-shrink-0 border-t border-[#1e2a3a]"
             style:height="{ideStore.terminalHeight}px">
          <TerminalPanel />
        </div>
      {/if}
    </div>
  </div>

  <StatusBar />
</div>
```

---

## 7. Agent message protocol

Shared between Rust (`serde`) and TypeScript. Single source of truth in Rust, TypeScript types mirror exactly.

### 7.1 Rust definitions

```rust
// src-tauri/src/agent/protocol.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "role")]
pub enum Message {
    #[serde(rename = "user")]
    User(UserMessage),
    #[serde(rename = "agent")]
    Agent(AgentMessage),
    #[serde(rename = "system")]
    System(SystemMessage),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserMessage {
    pub id: String,
    pub timestamp: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AgentMessage {
    #[serde(rename = "text")]
    Text {
        id: String,
        timestamp: String,
        content: String,
        thinking: Option<String>,
    },
    #[serde(rename = "action")]
    Action {
        id: String,
        timestamp: String,
        action: FileAction,
        status: ActionStatus,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ActionStatus {
    Pending,
    Approved,
    Rejected,
    Applied,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum FileAction {
    #[serde(rename = "read")]
    Read {
        path: String,
        line_range: Option<(usize, usize)>,
        content: Option<String>,
    },
    #[serde(rename = "create")]
    Create {
        path: String,
        content: String,
        language: Option<String>,
    },
    #[serde(rename = "edit")]
    Edit {
        path: String,
        diff: Vec<DiffHunk>,
        before: Option<String>,
        after: Option<String>,
    },
    #[serde(rename = "delete")]
    Delete {
        path: String,
        previous_content: Option<String>,
    },
    #[serde(rename = "rename")]
    Rename {
        old_path: String,
        new_path: String,
    },
    #[serde(rename = "run")]
    Run {
        command: String,
        cwd: Option<String>,
        output: Option<String>,
        exit_code: Option<i32>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffHunk {
    #[serde(rename = "type")]
    pub kind: DiffKind,
    pub content: String,
    pub old_line: Option<usize>,
    pub new_line: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DiffKind {
    Context,
    Add,
    Remove,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AgentStatus {
    Idle,
    Thinking,
    Active,
    Error,
    AwaitingApproval,
}
```

### 7.2 TypeScript mirror

```typescript
// src/lib/tauri/types.ts

export type MessageRole = "user" | "agent" | "system";
export type AgentStatus = "idle" | "thinking" | "active" | "error" | "awaiting_approval";
export type ActionStatus = "pending" | "approved" | "rejected" | "applied";
export type DiffKind = "context" | "add" | "remove";

export interface UserMessage {
  role: "user";
  id: string;
  timestamp: string;
  content: string;
}

export interface AgentTextMessage {
  role: "agent";
  type: "text";
  id: string;
  timestamp: string;
  content: string;
  thinking?: string;
}

export interface AgentActionMessage {
  role: "agent";
  type: "action";
  id: string;
  timestamp: string;
  action: FileAction;
  status: ActionStatus;
}

export type Message = UserMessage | AgentTextMessage | AgentActionMessage;

export type FileAction =
  | { kind: "read"; path: string; line_range?: [number, number]; content?: string }
  | { kind: "create"; path: string; content: string; language?: string }
  | { kind: "edit"; path: string; diff: DiffHunk[]; before?: string; after?: string }
  | { kind: "delete"; path: string; previous_content?: string }
  | { kind: "rename"; old_path: string; new_path: string }
  | { kind: "run"; command: string; cwd?: string; output?: string; exit_code?: number };

export interface DiffHunk {
  type: DiffKind;
  content: string;
  old_line?: number;
  new_line?: number;
}

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
  size?: number;
  modified?: string;
}

export interface AgentConfig {
  adapter: "claude-code" | "aider" | "codex" | "generic";
  working_directory: string;
  model?: string;
  allowed_tools?: string[];
  approval_mode?: boolean;
}

export interface FsChangeEvent {
  kind: "create" | "modify" | "delete" | "rename";
  paths: string[];
}
```

### 7.3 Agent adapter trait (Rust)

```rust
// src-tauri/src/agent/adapters/mod.rs

use async_trait::async_trait;
use tokio::sync::mpsc;

#[async_trait]
pub trait AgentAdapter: Send + Sync {
    fn name(&self) -> &str;
    fn display_name(&self) -> &str;

    async fn start(&mut self, config: &AgentConfig) -> Result<(), AgentError>;
    async fn stop(&mut self) -> Result<(), AgentError>;
    async fn send(&self, message: &str) -> Result<(), AgentError>;

    fn event_receiver(&self) -> &mpsc::UnboundedReceiver<AgentEvent>;

    fn capabilities(&self) -> AdapterCapabilities;
}

pub struct AdapterCapabilities {
    pub streaming: bool,
    pub thinking: bool,
    pub approval: bool,
    pub multi_file: bool,
    pub terminal: bool,
}
```

---

## 8. Rust backend — detailed modules

The Rust backend is identical to the React version. It has no knowledge of the frontend framework. See the full implementations for: Agent manager (6.1), Claude Code adapter (6.2), File system module (6.3), Diff engine (6.4), and PTY/Terminal (6.5) in the architecture reference.

Key modules and their crate dependencies:

```
agent/manager.rs      → tokio, serde_json
agent/adapters/       → tokio::process, serde_json
  claude_code.rs      → BufReader, lines(), serde parse
  aider.rs            → same pattern, different JSON schema
  generic.rs          → raw stdin/stdout pipe
fs/tree.rs            → ignore::WalkBuilder (.gitignore-aware)
fs/watcher.rs         → notify::RecommendedWatcher
diff/engine.rs        → similar::TextDiff
terminal/pty.rs       → portable_pty
git/ops.rs            → git2
```

---

## 9. UI layout

### 9.1 Panel architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  TopBar: [☰] ⟐ AGENTIDE   [agent: claude-code ▾]    [▶ run]   │
├────────┬──────────────────────────────────┬─────────────────────┤
│        │                                  │                     │
│  File  │         Chat Panel               │    File Viewer /    │
│  Tree  │                                  │    Code Editor      │
│        │  [user message]                  │                     │
│  220px │  [agent thinking...]             │    [tabs]           │
│        │  [READ  src/app.py  L1-7]        │    [editor]         │
│        │  [CREATE src/auth.py   ]         │                     │
│ active │  [EDIT  src/app.py  diff]        │    380px min        │
│  file  │  [agent response + code]         │    resizable        │
│ ►high- │                                  │                     │
│  light │  ❯ tell the agent what to do...  │                     │
│        │                                  │                     │
├────────┴──────────────────────────────────┴─────────────────────┤
│  Terminal (collapsible, 200px default)                          │
│  $ pip install PyJWT==2.8.0                                     │
├─────────────────────────────────────────────────────────────────┤
│  StatusBar: ● agent active │ 12 files │ main │ python │ v0.1.0 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` / `⌘B` | Toggle file tree |
| `Ctrl+J` / `⌘J` | Toggle terminal |
| `Ctrl+E` / `⌘E` | Toggle file panel |
| `Ctrl+L` / `⌘L` | Focus chat input |
| `Ctrl+K` / `⌘K` | Command palette |
| `Ctrl+O` / `⌘O` | Open project folder |
| `Escape` | Focus chat input |
| `↑` (empty input) | Recall previous message |
| `Ctrl+Enter` | Send message |
| `Ctrl+Shift+A` | Approve all pending actions |

Keyboard shortcuts registered in `App.svelte` via `svelte:window`:

```svelte
<!-- src/App.svelte -->
<svelte:window onkeydown={handleShortcut} />
```

---

## 10. Theme

```typescript
// src/lib/theme.ts

export const theme = {
  bg:            "#0a0e14",
  bgPanel:       "#0d1117",
  bgSurface:     "#131922",
  bgHover:       "#1a2233",
  bgActive:      "#1e2a3a",

  border:        "#1e2a3a",
  borderBright:  "#2d3f56",

  text:          "#c5cdd8",
  textMuted:     "#5c6a7a",
  textDim:       "#3d4b5c",

  accent:        "#22d68a",    // Green — primary, prompts, CREATE
  accentDim:     "#1a9e66",
  blue:          "#4d9cf0",    // READ, links
  amber:         "#f0a830",    // EDIT, warnings
  red:           "#e8534a",    // DELETE, errors
  purple:        "#b07ee8",    // RUN, keywords
} as const;
```

Tailwind config extends with these as custom colors. Everything is monospace. Font stack:

```css
--font-mono: 'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'Cascadia Code', monospace;
```

---

## 11. Tauri configuration

```json
// src-tauri/tauri.conf.json
{
  "productName": "AgentIDE",
  "identifier": "com.agentide.app",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{
      "title": "AgentIDE",
      "width": 1400,
      "height": 900,
      "minWidth": 900,
      "minHeight": 600,
      "decorations": true,
      "transparent": false
    }]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.png"]
  }
}
```

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-spawn",
    "shell:allow-execute",
    "fs:allow-read",
    "fs:allow-write",
    "dialog:allow-open",
    "store:default"
  ]
}
```

---

## 12. Phase plan

### Phase 1: Scaffold + static UI (Week 1-2)

- [ ] `npm create tauri-app` with Vite + Svelte + TypeScript template
- [ ] Tailwind v4 config with dark theme tokens
- [ ] `IDELayout.svelte` with custom `use:resizable` action for panel dividers
- [ ] `FileTree.svelte` + `FileTreeNode.svelte` with expand/collapse, icons, selection
- [ ] `ChatPanel.svelte` with all message type renderers
- [ ] `ActionBlock.svelte` with `DiffView.svelte` and `CodePreview.svelte`
- [ ] `ThinkingBlock.svelte` collapsible
- [ ] `StatusBar.svelte` with status indicator
- [ ] `FilePanel.svelte` + `CodeEditor.svelte` with `use:codemirror` action
- [ ] `EditorTabs.svelte`
- [ ] All four Svelte stores (`.svelte.ts` files with runes)
- [ ] Demo mode with hardcoded message sequence
- [ ] File tree live highlighting animations (CSS + reactive classes)
- [ ] Keyboard shortcuts via `svelte:window`
- [ ] Panel state persistence via `tauri-plugin-store`

### Phase 2: Rust backend + Claude Code (Week 3-4)

- [ ] Rust: `protocol.rs` types with serde
- [ ] Rust: `fs.rs` commands — read, write, delete, list
- [ ] Rust: `tree.rs` — build file tree from disk with gitignore
- [ ] Rust: `watcher.rs` — file system watcher via `notify`
- [ ] Rust: `engine.rs` — diff computation via `similar`
- [ ] Rust: `manager.rs` — agent lifecycle
- [ ] Rust: `claude_code.rs` — spawn CLI, parse stream-json
- [ ] Rust: Tauri event emitters for agent output
- [ ] Frontend: `commands.ts` typed `invoke()` wrappers
- [ ] Frontend: `events.ts` Tauri event listeners
- [ ] Frontend: Wire Tauri events → Svelte stores via `$effect` in `ChatPanel.svelte`
- [ ] Frontend: Real file tree from disk
- [ ] Frontend: Chat input → Rust → Claude Code → streaming response
- [ ] Frontend: File tree highlights from real agent actions
- [ ] "Open Project" dialog (`tauri-plugin-dialog`)

### Phase 3: Terminal + approval flow (Week 5-6)

- [ ] Rust: `pty.rs` — PTY spawn via `portable-pty`
- [ ] Rust: terminal commands (spawn, write, resize, kill)
- [ ] Frontend: `TerminalPanel.svelte` with `use:xterm` action
- [ ] Frontend: Terminal tabs, auto-show on first `run` action
- [ ] Approval flow: pending/approved/rejected states in `agent.svelte.ts`
- [ ] Batch approval (`Ctrl+Shift+A`)
- [ ] Command palette (`Ctrl+K`) — custom Svelte component with fuzzy search
- [ ] Slash commands in `ChatInput.svelte`
- [ ] CodeMirror animated diff overlay via `Decoration` API
- [ ] Session export as markdown

### Phase 4: Multi-agent + git + polish (Week 7-8)

- [ ] Rust: Aider adapter
- [ ] Rust: Generic stdin/stdout adapter
- [ ] Rust: `git.rs` — branch, status, stage, commit via `git2`
- [ ] Frontend: Git info in `StatusBar.svelte` and tree badges
- [ ] Frontend: Agent selector dropdown in `TopBar.svelte`
- [ ] Frontend: Settings dialog for agent configuration
- [ ] Session persistence (save/restore full conversations)
- [ ] Auto-update via `tauri-plugin-updater`
- [ ] Platform builds: macOS (.dmg), Windows (.msi), Linux (.AppImage)

---

## 13. Dev setup

```bash
# Prerequisites
# - Rust (rustup)
# - Node.js 18+
# - System deps: https://v2.tauri.app/start/prerequisites/

# Clone and install
git clone https://github.com/your-org/agentide.git
cd agentide
npm install

# Development (hot-reload frontend + Rust rebuild)
npm run tauri dev

# Build for production
npm run tauri build
```

### Cargo.toml dependencies

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-store = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
similar = "2"
notify = "6"
ignore = "0.4"
git2 = "0.19"
portable-pty = "0.8"
anyhow = "1"
tracing = "0.1"
tracing-subscriber = "0.3"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
async-trait = "0.1"
```

### package.json dependencies

```json
{
  "dependencies": {
    "svelte": "^5.0.0",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-fs": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "@tauri-apps/plugin-store": "^2.0.0",
    "@tanstack/svelte-virtual": "^3.10.0",
    "@codemirror/state": "^6.4.0",
    "@codemirror/view": "^6.26.0",
    "@codemirror/lang-python": "^6.1.0",
    "@codemirror/lang-javascript": "^6.2.0",
    "@codemirror/lang-rust": "^6.0.0",
    "@codemirror/theme-one-dark": "^6.1.0",
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-webgl": "^0.18.0",
    "shiki": "^1.10.0",
    "lucide-svelte": "^0.450.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@tauri-apps/cli": "^2.0.0",
    "vite": "^5.4.0",
    "typescript": "^5.5.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

### Svelte config

```javascript
// svelte.config.js
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,  // Enable Svelte 5 runes globally
  },
};
```

### Vite config

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  clearScreen: false,
  server: {
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "esnext",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

---

## 14. Testing

| Layer | Tool | Focus |
|-------|------|-------|
| Rust unit tests | `cargo test` | Protocol parsing, diff engine, tree building |
| Rust integration | `cargo test` + temp dirs | FS commands, watcher, git ops |
| Svelte components | Vitest + `@testing-library/svelte` | Render states, interactions, store reactivity |
| Stores | Vitest | Rune state transitions, derived values |
| IPC contract | Vitest + mock `invoke` | TS types match Rust serde output |
| E2E | Tauri's WebDriver + Playwright | Full flow across IPC boundary |
| Adapter tests | `cargo test` + mock CLI | Claude Code JSON parsing edge cases |

### Testing Svelte 5 stores

```typescript
// files.svelte.test.ts
import { describe, it, expect } from "vitest";
import { filesStore } from "./files.svelte";

describe("filesStore", () => {
  it("auto-expands parent dirs when agent touches nested file", () => {
    filesStore.setActiveAgentFile("src/routes/api.py", "edit");
    expect(filesStore.expandedDirs.has("src")).toBe(true);
    expect(filesStore.expandedDirs.has("src/routes")).toBe(true);
    expect(filesStore.activeAgentAction).toBe("edit");
  });
});
```

---

## 15. Performance targets

| Metric | Target | How |
|--------|--------|-----|
| Cold start | < 1.2s | Tauri + Svelte compiled output (no framework runtime to parse) |
| File tree (10k files) | < 200ms | Rust `ignore` crate, Svelte `{#each}` with keyed blocks |
| Diff (5k line file) | < 10ms | Rust `similar` crate |
| Agent message render | < 8ms | Svelte compiled updates, no virtual DOM diffing |
| Memory idle | < 35 MB | Tauri WebView + zero-runtime Svelte |
| Memory active (large project) | < 150 MB | `@tanstack/svelte-virtual` for chat, lazy file loading |
| JS bundle size | < 80 KB gzipped | Svelte compiles away, tree-shaken imports |
| Binary size | < 15 MB | Tauri's small runtime |

---

## 16. Svelte vs React — architecture differences summary

For anyone coming from the React version of this spec, here are the key shifts:

| Concept | React version | Svelte version |
|---------|--------------|----------------|
| State management | Zustand stores (external library) | `.svelte.ts` files with `$state` runes (built-in) |
| Reactivity | `useState` + re-render cycle | `$state` + compiler-generated updates |
| Derived values | `useMemo` / Zustand selectors | `$derived` rune |
| Side effects | `useEffect` with dep arrays | `$effect` with auto-tracked dependencies |
| Event subscriptions | Custom hooks (`useTauriEvent`) | `$effect` cleanup in component `<script>` |
| Imperative libs | `useRef` + `useEffect` | Svelte actions (`use:codemirror`, `use:xterm`) |
| Panel resizing | `react-resizable-panels` package | Custom `use:resizable` action (~40 lines) |
| Virtualization | `react-virtuoso` | `@tanstack/svelte-virtual` |
| Component files | `.tsx` (JSX + hooks) | `.svelte` (template + script + style) |
| Conditional render | Ternary in JSX | `{#if}` / `{:else}` blocks |
| List render | `.map()` in JSX | `{#each items as item (key)}` |
| Props | `interface Props` + destructure | `let { prop }: { prop: Type } = $props()` |
| Runtime JS shipped | ~120-180 KB (React + ReactDOM + Zustand) | ~15-30 KB (Svelte runtime is minimal) |
