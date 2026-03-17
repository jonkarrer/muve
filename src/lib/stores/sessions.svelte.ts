import type { Message } from "$lib/tauri/types";
import type { FilesSnapshot } from "$lib/stores/files.svelte";
import { chatStore } from "$lib/stores/chat.svelte";
import { filesStore } from "$lib/stores/files.svelte";
import { agentStore } from "$lib/stores/agent.svelte";
import { project } from "$lib/tauri/commands";
import { refreshFileTree } from "$lib/agent/handler";

export interface Session {
  id: string;
  cwd: string;
  name: string;
  claudeSessionId: string | null;
  messages: Message[];
  files: FilesSnapshot;
}

let sessions = $state<Session[]>([]);
let activeSessionId = $state<string | null>(null);
let activeSession = $derived(sessions.find(s => s.id === activeSessionId) ?? null);

function folderName(cwd: string): string { return cwd.split("/").pop() || cwd; }

function saveCurrentSession() {
  if (!activeSessionId) return;
  const s = sessions.find(s => s.id === activeSessionId);
  if (!s) return;
  s.messages = chatStore.snapshot();
  s.files = filesStore.snapshot();
}

async function activateSession(cwd: string, claudeSessionId: string | null) {
  await project.setCwd(cwd);
  await project.setSessionId(claudeSessionId);
  await project.startWatching();
  await refreshFileTree();
}

async function switchTo(id: string) {
  if (id === activeSessionId) return;
  saveCurrentSession();
  const target = sessions.find(s => s.id === id);
  if (!target) return;

  activeSessionId = id;
  chatStore.restore(target.messages);
  filesStore.resetProject();
  filesStore.restore(target.files);
  agentStore.setStatus("idle");
  await activateSession(target.cwd, target.claudeSessionId);
}

async function createSession(cwd: string): Promise<string> {
  const existing = sessions.find(s => s.cwd === cwd);
  if (existing) { await switchTo(existing.id); return existing.id; }

  saveCurrentSession();
  const id = crypto.randomUUID();
  sessions.push({
    id, cwd, name: folderName(cwd), claudeSessionId: null, messages: [],
    files: { openFiles: [], activeTabIndex: 0, expandedDirs: {}, selectedFile: null },
  });
  activeSessionId = id;

  chatStore.clearMessages();
  filesStore.resetProject();
  agentStore.setStatus("idle");
  await activateSession(cwd, null);
  return id;
}

function removeSession(id: string) {
  const idx = sessions.findIndex(s => s.id === id);
  if (idx < 0) return;
  sessions.splice(idx, 1);
  if (id === activeSessionId) {
    if (sessions.length > 0) switchTo(sessions[Math.min(idx, sessions.length - 1)].id);
    else { activeSessionId = null; chatStore.clearMessages(); filesStore.resetProject(); project.stopWatching(); }
  }
}

function updateClaudeSessionId(claudeId: string) {
  const s = sessions.find(s => s.id === activeSessionId);
  if (s) s.claudeSessionId = claudeId;
}

export const sessionsStore = {
  get sessions() { return sessions; },
  get activeSessionId() { return activeSessionId; },
  get activeSession() { return activeSession; },
  switchTo, createSession, removeSession, updateClaudeSessionId,
};
