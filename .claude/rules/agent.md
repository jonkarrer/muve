---
paths:
  - "src/lib/agent/**"
  - "src/lib/tauri/**"
---

# Agent integration rules

- `handler.ts` is the single bridge between Tauri events and Svelte stores. All event→store wiring lives here.
- Event listeners are set up in `setupAgentListeners()` and torn down in `teardownAgentListeners()`. Both are called from `+page.svelte` onMount/cleanup.
- The handler accumulates streaming state (thinking text, stream ID) in module-level variables, not in stores. Stores only get finalized data.
- File tree highlighting uses a sequence counter (`hlSeq`) to prevent race conditions when multiple actions arrive rapidly.
- `commands.ts` is thin typed wrappers around `invoke()`. No business logic here.
- `events.ts` uses a factory: `const on = <T>(event) => (handler) => listen<T>(event, e => handler(e.payload))`.
- When Claude's `system` event arrives with a `session_id`, it must be forwarded to `sessionsStore.updateClaudeSessionId()` so session switching can resume conversations.
