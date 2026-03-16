import {
  onAgentStatus,
  onAgentTextDelta,
  onAgentThinkingDelta,
  onAgentTurnEnd,
  onAgentAction,
  onAgentDone,
  onAgentError,
} from "$lib/tauri/events";
import { fs as fsCommands, project } from "$lib/tauri/commands";
import { chatStore } from "$lib/stores/chat.svelte";
import { filesStore } from "$lib/stores/files.svelte";
import { agentStore } from "$lib/stores/agent.svelte";
import { formatTimestamp } from "$lib/utils/time";
import type { AgentStatus, FileAction } from "$lib/tauri/types";

let thinkingAccum = "";
let streamId: string | null = null;
let unlisteners: (() => void)[] = [];
let highlightSeq = 0;

export async function setupAgentListeners() {
  teardownAgentListeners();

  const listeners = await Promise.all([
    onAgentStatus((status) => {
      agentStore.setStatus(status as AgentStatus);
    }),

    onAgentTextDelta((text) => {
      if (!streamId) {
        streamId = crypto.randomUUID();
        chatStore.startStream(streamId);
      }
      chatStore.appendStreamChunk(text);
    }),

    onAgentThinkingDelta((text) => {
      thinkingAccum += text;
    }),

    onAgentTurnEnd((data) => {
      if (data.had_text && streamId) {
        chatStore.finalizeStream(streamId, thinkingAccum || undefined);
      } else if (thinkingAccum && !data.had_text) {
        chatStore.addMessage({
          role: "agent",
          type: "text",
          id: crypto.randomUUID(),
          timestamp: formatTimestamp(),
          content: "",
          thinking: thinkingAccum,
        });
      }
      thinkingAccum = "";
      streamId = null;
    }),

    onAgentAction((action: FileAction) => {
      const path = getActionPath(action);

      chatStore.addMessage({
        role: "agent",
        type: "action",
        id: crypto.randomUUID(),
        timestamp: formatTimestamp(),
        action,
        status: "applied",
      });

      if (path) {
        highlightSeq++;
        const mySeq = highlightSeq;
        filesStore.setActiveAgentFile(path, action.kind);
        filesStore.addRecentlyTouched(path, action.kind);
        setTimeout(() => {
          if (highlightSeq === mySeq) {
            filesStore.setActiveAgentFile(null);
          }
        }, 1500);
      }

      if (action.kind === "create" && "content" in action) {
        filesStore.selectFile(path);
        filesStore.openFileInTab(path, action.content, "text");
      }
    }),

    onAgentDone(async () => {
      agentStore.setStatus("idle");
      await refreshFileTree();
      await refreshOpenTabs();
    }),

    onAgentError((error) => {
      agentStore.setStatus("error");
      chatStore.addMessage({
        role: "agent",
        type: "text",
        id: crypto.randomUUID(),
        timestamp: formatTimestamp(),
        content: `Error: ${error}`,
      });
      thinkingAccum = "";
      streamId = null;
    }),
  ]);

  unlisteners = listeners;
}

export function teardownAgentListeners() {
  for (const unlisten of unlisteners) {
    unlisten();
  }
  unlisteners = [];
  thinkingAccum = "";
  streamId = null;
  highlightSeq = 0;
}

export async function refreshFileTree() {
  try {
    const cwd = await project.getCwd();
    const tree = await fsCommands.listDirectory(cwd);
    filesStore.setTree(tree);
  } catch (e) {
    console.error("Failed to refresh file tree:", e);
  }
}

async function refreshOpenTabs() {
  for (const file of filesStore.openFiles) {
    try {
      const content = await fsCommands.readFile(file.path);
      if (content !== file.content) {
        file.content = content;
      }
    } catch {
      // File may have been deleted — leave stale content
    }
  }
}

function getActionPath(action: FileAction): string {
  if ("path" in action) return action.path;
  if ("old_path" in action) return action.old_path;
  return "";
}
