import type { Message } from "$lib/tauri/types";
import type { FilesSnapshot } from "$lib/stores/files.svelte";
import { chatStore } from "$lib/stores/chat.svelte";
import { filesStore } from "$lib/stores/files.svelte";
import { agentStore } from "$lib/stores/agent.svelte";
import { project } from "$lib/tauri/commands";
import { refreshFileTree } from "$lib/agent/handler";

export type ModelId = "claude-sonnet-4-6" | "claude-opus-4-6" | "claude-haiku-4-5-20251001";

export const MODELS: { id: ModelId; label: string }[] = [
  { id: "claude-sonnet-4-6", label: "Sonnet" },
  { id: "claude-opus-4-6", label: "Opus" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku" },
];

export interface Session {
  id: string;
  cwd: string;
  name: string;
  branchLabel: string;
  model: ModelId;
  claudeSessionId: string | null;
  messages: Message[];
  files: FilesSnapshot;
}

let sessions = $state<Session[]>([]);
let activeSessionId = $state<string | null>(null);
let activeSession = $derived(sessions.find(s => s.id === activeSessionId) ?? null);
let currentProjectTabs = $derived(
  activeSession ? sessions.filter(s => s.cwd === activeSession.cwd) : []
);

function folderName(cwd: string): string { return cwd.split("/").pop() || cwd; }

function deduplicateBranchLabel(cwd: string, branch: string): string {
  const prefix = `git/${branch}`;
  const existing = sessions.filter(s => s.cwd === cwd && s.branchLabel.startsWith(prefix));
  if (existing.length === 0) return prefix;
  // Find next available number
  const nums = existing.map(s => {
    const m = s.branchLabel.match(/\((\d+)\)$/);
    return m ? parseInt(m[1]) : 1;
  });
  return `${prefix} (${Math.max(...nums) + 1})`;
}

async function detectBranch(): Promise<string> {
  try { return await project.getGitBranch(); }
  catch { return "unknown"; }
}

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
  const target = sessions.find(s => s.id === id);
  if (!target) return;

  saveCurrentSession();
  const current = sessions.find(s => s.id === activeSessionId);
  const sameCwd = current && current.cwd === target.cwd;

  activeSessionId = id;
  chatStore.restore(target.messages);
  filesStore.restore(target.files);
  agentStore.setStatus("idle");

  if (sameCwd) {
    await project.setSessionId(target.claudeSessionId);
  } else {
    filesStore.resetProject();
    await activateSession(target.cwd, target.claudeSessionId);
  }
}

async function createSession(cwd: string): Promise<string> {
  const existing = sessions.find(s => s.cwd === cwd);
  if (existing) { await switchTo(existing.id); return existing.id; }

  saveCurrentSession();
  const id = crypto.randomUUID();
  const branch = await detectBranch();

  sessions.push({
    id, cwd, name: folderName(cwd),
    branchLabel: deduplicateBranchLabel(cwd, branch),
    model: "claude-sonnet-4-6",
    claudeSessionId: null, messages: [],
    files: { expandedDirs: {}, selectedFile: null },
  });
  activeSessionId = id;

  chatStore.clearMessages();
  filesStore.resetProject();
  agentStore.setStatus("idle");
  await activateSession(cwd, null);
  return id;
}

async function createTab(cwd: string, model: ModelId = "claude-sonnet-4-6"): Promise<string> {

  saveCurrentSession();
  const id = crypto.randomUUID();
  const branch = await detectBranch();

  sessions.push({
    id, cwd, name: folderName(cwd),
    branchLabel: deduplicateBranchLabel(cwd, branch),
    model,
    claudeSessionId: null, messages: [],
    files: { expandedDirs: {}, selectedFile: null },
  });
  activeSessionId = id;

  chatStore.clearMessages();
  // Keep file tree — same project
  agentStore.setStatus("idle");
  await project.setSessionId(null);
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

function removeAllForCwd(cwd: string) {
  const toRemove = sessions.filter(s => s.cwd === cwd).map(s => s.id);
  for (const id of toRemove) removeSession(id);
}

function updateClaudeSessionId(claudeId: string) {
  const s = sessions.find(s => s.id === activeSessionId);
  if (s) s.claudeSessionId = claudeId;
}

function setModel(id: string, model: ModelId) {
  const s = sessions.find(s => s.id === id);
  if (s) s.model = model;
}

export const sessionsStore = {
  get sessions() { return sessions; },
  get activeSessionId() { return activeSessionId; },
  get activeSession() { return activeSession; },
  get currentProjectTabs() { return currentProjectTabs; },
  switchTo, createSession, createTab, removeSession, removeAllForCwd, updateClaudeSessionId, setModel,
};
