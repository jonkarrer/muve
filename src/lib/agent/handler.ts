import { onAgentStatus, onAgentTextDelta, onAgentThinkingDelta, onAgentTurnEnd, onAgentAction, onAgentDone, onAgentError, onAgentSession, onFsChanged } from "$lib/tauri/events";
import { fs as fsCommands, project } from "$lib/tauri/commands";
import { chatStore } from "$lib/stores/chat.svelte";
import { filesStore } from "$lib/stores/files.svelte";
import { agentStore } from "$lib/stores/agent.svelte";
import { sessionsStore } from "$lib/stores/sessions.svelte";
import type { AgentStatus, FileAction } from "$lib/tauri/types";

const ts = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

let thinking = "";
let streamId: string | null = null;
let unlisteners: (() => void)[] = [];
let hlSeq = 0;

export async function setupAgentListeners() {
  teardownAgentListeners();
  unlisteners = await Promise.all([
    onAgentStatus((s) => agentStore.setStatus(s as AgentStatus)),
    onAgentSession((sid) => sessionsStore.updateClaudeSessionId(sid)),

    onAgentTextDelta((text) => {
      if (!streamId) { streamId = crypto.randomUUID(); chatStore.startStream(streamId); }
      chatStore.appendStreamChunk(text);
    }),

    onAgentThinkingDelta((text) => { thinking += text; }),

    onAgentTurnEnd((data) => {
      if (data.had_text && streamId) chatStore.finalizeStream(streamId, thinking || undefined);
      else if (thinking) chatStore.addMessage({ role: "agent", type: "text", id: crypto.randomUUID(), timestamp: ts(), content: "", thinking });
      thinking = ""; streamId = null;
    }),

    onAgentAction((action: FileAction) => {
      const path = "path" in action ? action.path : "";
      chatStore.addMessage({ role: "agent", type: "action", id: crypto.randomUUID(), timestamp: ts(), action, status: "applied" });
      if (path) highlightFile(path, action.kind);
      if (action.kind === "create" && "content" in action) { filesStore.selectFile(path); filesStore.openFileInTab(path, action.content, "text"); }
    }),

    onAgentDone(async () => {
      agentStore.setStatus("idle");
      await refreshFileTree();
      await refreshOpenTabs();
    }),

    onAgentError((error) => {
      agentStore.setStatus("error");
      chatStore.addMessage({ role: "agent", type: "text", id: crypto.randomUUID(), timestamp: ts(), content: `Error: ${error}` });
      thinking = ""; streamId = null;
    }),

    // File system watcher — catches writes from any source
    onFsChanged(async ({ paths }) => {
      for (const p of paths) {
        highlightFile(p, "edit");
        // Refresh content of open tabs that were modified
        const openFile = filesStore.openFiles.find(f => f.path === p);
        if (openFile) {
          try { const c = await fsCommands.readFile(p); if (c !== openFile.content) openFile.content = c; } catch {}
        }
      }
      // Refresh tree to pick up new/deleted files
      await refreshFileTree();
    }),
  ]);
}

export function teardownAgentListeners() {
  unlisteners.forEach((u) => u());
  unlisteners = []; thinking = ""; streamId = null; hlSeq = 0;
}

function highlightFile(path: string, kind: string) {
  hlSeq++;
  const seq = hlSeq;
  filesStore.setActiveAgentFile(path, kind as FileAction["kind"]);
  filesStore.addRecentlyTouched(path, kind);
  setTimeout(() => { if (hlSeq === seq) filesStore.setActiveAgentFile(null); }, 1500);
}

export async function refreshFileTree() {
  try {
    const cwd = await project.getCwd();
    filesStore.setTree(await fsCommands.listDirectory(cwd));
  } catch (e) { console.error("Failed to refresh file tree:", e); }
}

async function refreshOpenTabs() {
  for (const f of filesStore.openFiles) {
    try { const c = await fsCommands.readFile(f.path); if (c !== f.content) f.content = c; } catch {}
  }
}
