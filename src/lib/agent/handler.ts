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
import type { AgentStatus, FileAction } from "$lib/tauri/types";

let thinkingAccum = "";
let streamId: string | null = null;
let unlisteners: (() => void)[] = [];
let highlightSeq = 0;

export async function setupAgentListeners() {
  // Clean up any previous listeners
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
      // Finalize any streamed text
      if (data.had_text && streamId) {
        chatStore.finalizeStream(
          streamId,
          thinkingAccum || undefined
        );
      } else if (thinkingAccum && !data.had_text) {
        // Thinking with no text — create a thinking-only message
        chatStore.addMessage({
          role: "agent",
          type: "text",
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          content: "",
          thinking: thinkingAccum,
        });
      }

      // Reset accumulators
      thinkingAccum = "";
      streamId = null;
    }),

    onAgentAction((action: FileAction) => {
      const path = "path" in action ? (action as any).path : "";
      console.log("[muve] agent:action received:", action.kind, path);

      chatStore.addMessage({
        role: "agent",
        type: "action",
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        action,
        status: "applied",
      });

      // Highlight in file tree — use sequence number to prevent race conditions
      if (path) {
        highlightSeq++;
        const mySeq = highlightSeq;
        console.log("[muve] highlighting file:", path, "tree has", filesStore.tree.length, "root nodes");
        filesStore.setActiveAgentFile(path, action.kind);
        filesStore.addRecentlyTouched(path, action.kind);
        setTimeout(() => {
          // Only clear if no newer highlight has been set
          if (highlightSeq === mySeq) {
            filesStore.setActiveAgentFile(null);
          }
        }, 1500);
      }

      // Open created files in editor
      if (action.kind === "create" && "content" in action) {
        filesStore.selectFile(path);
        filesStore.openFileInTab(path, (action as any).content, "text");
      }
    }),

    onAgentDone(async () => {
      agentStore.setStatus("idle");
      // Refresh file tree after agent finishes
      await refreshFileTree();
      // Refresh any open tabs
      await refreshOpenTabs();
    }),

    onAgentError((error) => {
      agentStore.setStatus("error");
      chatStore.addMessage({
        role: "agent",
        type: "text",
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        content: `Error: ${error}`,
      });

      // Reset streaming state
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
        file.dirty = false;
      }
    } catch {
      // File may have been deleted
    }
  }
}
