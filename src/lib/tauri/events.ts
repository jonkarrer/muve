import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AgentStatus, FileAction } from "./types";

interface TurnEndPayload {
  had_text: boolean;
  thinking: string | null;
}

export function onAgentStatus(handler: (status: AgentStatus) => void): Promise<UnlistenFn> {
  return listen<AgentStatus>("agent:status", (e) => handler(e.payload));
}

export function onAgentTextDelta(handler: (text: string) => void): Promise<UnlistenFn> {
  return listen<string>("agent:text-delta", (e) => handler(e.payload));
}

export function onAgentThinkingDelta(handler: (text: string) => void): Promise<UnlistenFn> {
  return listen<string>("agent:thinking-delta", (e) => handler(e.payload));
}

export function onAgentTurnEnd(handler: (data: TurnEndPayload) => void): Promise<UnlistenFn> {
  return listen<TurnEndPayload>("agent:turn-end", (e) => handler(e.payload));
}

export function onAgentAction(handler: (action: FileAction) => void): Promise<UnlistenFn> {
  return listen<FileAction>("agent:action", (e) => handler(e.payload));
}

export function onAgentDone(handler: () => void): Promise<UnlistenFn> {
  return listen("agent:done", () => handler());
}

export function onAgentError(handler: (error: string) => void): Promise<UnlistenFn> {
  return listen<string>("agent:error", (e) => handler(e.payload));
}
