import type { AgentStatus } from "$lib/tauri/types";

let status = $state<AgentStatus>("idle");

let statusLabel = $derived(
  status === "active" ? "agent active" :
  status === "thinking" ? "thinking..." :
  status === "error" ? "error" : "idle"
);

export const agentStore = {
  get status() { return status; },
  get statusLabel() { return statusLabel; },
  setStatus(s: AgentStatus) { status = s; },
};
