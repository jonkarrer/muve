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
