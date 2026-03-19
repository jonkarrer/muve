import { onAgentStatus, onAgentTextDelta, onAgentTurnEnd, onAgentAction, onAgentDone, onAgentError, onAgentSession, onFsChanged } from "$lib/tauri/events";
import { fs as fsCommands, project } from "$lib/tauri/commands";
import { chatStore } from "$lib/stores/chat.svelte";
import { filesStore } from "$lib/stores/files.svelte";
import { agentStore } from "$lib/stores/agent.svelte";
import { sessionsStore } from "$lib/stores/sessions.svelte";
import type { AgentStatus, FileAction, Message } from "$lib/tauri/types";

const ts = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// Per-tab streaming state
const tabStreams = new Map<string, { streamId: string; content: string; thinking: string }>();
let unlisteners: (() => void)[] = [];
let hlSeq = 0;

function isActiveTab(tabId: string): boolean {
  return tabId === sessionsStore.activeSessionId;
}

function getSession(tabId: string) {
  return sessionsStore.sessions.find(s => s.id === tabId);
}

function pushMessage(tabId: string, msg: Message) {
  if (isActiveTab(tabId)) {
    chatStore.addMessage(msg);
  } else {
    const s = getSession(tabId);
    if (s) s.messages.push(msg);
  }
}

function getStream(tabId: string) {
  let s = tabStreams.get(tabId);
  if (!s) { s = { streamId: crypto.randomUUID(), content: "", thinking: "" }; tabStreams.set(tabId, s); }
  return s;
}

export async function setupAgentListeners() {
  teardownAgentListeners();
  unlisteners = await Promise.all([
    onAgentStatus(({ tab_id, status }) => {
      if (isActiveTab(tab_id)) agentStore.setStatus(status as AgentStatus);
    }),

    onAgentSession(({ tab_id, session_id }) => {
      const s = getSession(tab_id);
      if (s) s.claudeSessionId = session_id;
    }),

    onAgentTextDelta(({ tab_id, text }) => {
      const stream = getStream(tab_id);
      stream.content += text;
      if (isActiveTab(tab_id)) {
        if (!chatStore.isStreaming) chatStore.startStream(stream.streamId);
        chatStore.appendStreamChunk(text);
      }
    }),

    onAgentTurnEnd(({ tab_id, had_text, thinking: thinkingText }) => {
      const stream = tabStreams.get(tab_id);
      const thinkingContent = stream?.thinking || (thinkingText ?? "") || "";
      if (had_text && stream) {
        const msg: Message = { role: "agent", type: "text", id: stream.streamId, timestamp: ts(), content: stream.content, thinking: thinkingContent || undefined };
        if (isActiveTab(tab_id)) {
          chatStore.finalizeStream(stream.streamId, thinkingContent || undefined);
        } else {
          const s = getSession(tab_id);
          if (s) s.messages.push(msg);
        }
      } else if (thinkingContent) {
        pushMessage(tab_id, { role: "agent", type: "text", id: crypto.randomUUID(), timestamp: ts(), content: "", thinking: thinkingContent });
      }
      tabStreams.delete(tab_id);
    }),

    onAgentAction((payload) => {
      const { tab_id, ...action } = payload;
      const path = "path" in action ? (action as any).path : "";
      pushMessage(tab_id, { role: "agent", type: "action", id: crypto.randomUUID(), timestamp: ts(), action: action as FileAction, status: "applied" });
      if (path && isActiveTab(tab_id)) highlightFile(path, (action as FileAction).kind);
    }),

    onAgentDone(async ({ tab_id }) => {
      tabStreams.delete(tab_id);
      if (isActiveTab(tab_id)) agentStore.setStatus("idle");
      await refreshFileTree();
    }),

    onAgentError(({ tab_id, error }) => {
      tabStreams.delete(tab_id);
      if (isActiveTab(tab_id)) agentStore.setStatus("error");
      pushMessage(tab_id, { role: "agent", type: "text", id: crypto.randomUUID(), timestamp: ts(), content: `Error: ${error}` });
    }),

    onFsChanged(async ({ paths }) => {
      for (const p of paths) highlightFile(p, "edit");
      await refreshFileTree();
    }),
  ]);
}

export function teardownAgentListeners() {
  unlisteners.forEach((u) => u());
  unlisteners = []; tabStreams.clear(); hlSeq = 0;
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
