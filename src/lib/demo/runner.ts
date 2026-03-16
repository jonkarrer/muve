import { demoFiles, demoMessages } from "./data";
import { chatStore } from "$lib/stores/chat.svelte";
import { filesStore } from "$lib/stores/files.svelte";
import { agentStore } from "$lib/stores/agent.svelte";
import { ideStore } from "$lib/stores/ide.svelte";
import type { Message, AgentActionMessage } from "$lib/tauri/types";

let timeouts: ReturnType<typeof setTimeout>[] = [];
let running = false;

function getDelay(msg: Message): number {
  if (msg.role === "user") return 200;
  if (msg.role === "agent" && msg.type === "action") return 600;
  if (msg.role === "agent" && msg.type === "text" && msg.thinking) return 400;
  return 800;
}

function findFileContent(path: string): string {
  function search(nodes: typeof demoFiles): string | null {
    for (const node of nodes) {
      if (!node.is_dir && node.path === path) return node.content ?? "";
      if (node.is_dir && node.children) {
        const found = search(node.children);
        if (found !== null) return found;
      }
    }
    return null;
  }
  return search(demoFiles) ?? "";
}

function processMessage(msg: Message) {
  chatStore.addMessage(msg);

  if (msg.role === "agent" && msg.type === "action") {
    const actionMsg = msg as AgentActionMessage;
    const action = actionMsg.action;
    agentStore.setStatus("active");

    const path = "path" in action ? action.path : "";
    if (path) {
      filesStore.setActiveAgentFile(path, action.kind);

      // Open file in editor for creates and reads
      if (action.kind === "create") {
        filesStore.selectFile(path);
        filesStore.openFileInTab(path, action.content, action.language ?? "python");
        ideStore.toggleFilePanel();
        if (!ideStore.showFilePanel) ideStore.toggleFilePanel();
      } else if (action.kind === "read") {
        const content = action.content ?? findFileContent(path);
        filesStore.selectFile(path);
        filesStore.openFileInTab(path, content);
      }

      // Clear highlight after 800ms
      const clearTimeout_ = setTimeout(() => {
        filesStore.setActiveAgentFile(null);
        filesStore.addRecentlyTouched(path, action.kind);
      }, 800);
      timeouts.push(clearTimeout_);
    }
  } else if (msg.role === "agent" && msg.type === "text" && msg.thinking) {
    agentStore.setStatus("thinking");
  } else if (msg.role === "agent" && msg.type === "text" && !("thinking" in msg && msg.thinking)) {
    agentStore.setStatus("idle");
  }
}

export function startDemo() {
  stop();
  running = true;

  // Initialize file tree with demo data and expand src
  filesStore.setTree(demoFiles);
  filesStore.toggleDir("src");
  chatStore.clearMessages();
  agentStore.setStatus("idle");

  let cumulativeDelay = 0;

  for (let i = 0; i < demoMessages.length; i++) {
    const msg = demoMessages[i];
    cumulativeDelay += getDelay(msg);

    const t = setTimeout(() => {
      if (!running) return;
      processMessage(msg);

      // Set idle after last message
      if (i === demoMessages.length - 1) {
        const finalTimeout = setTimeout(() => {
          agentStore.setStatus("idle");
          running = false;
        }, 500);
        timeouts.push(finalTimeout);
      }
    }, cumulativeDelay);
    timeouts.push(t);
  }
}

export function stop() {
  running = false;
  for (const t of timeouts) clearTimeout(t);
  timeouts = [];
}

export function reset() {
  stop();
  chatStore.clearMessages();
  filesStore.setTree([]);
  agentStore.setStatus("idle");
}
