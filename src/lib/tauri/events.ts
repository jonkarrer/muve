import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export function onAgentStatus(handler: (status: string) => void): Promise<UnlistenFn> {
  return listen<string>("agent:status", (e) => handler(e.payload));
}

export function onAgentTextDelta(handler: (text: string) => void): Promise<UnlistenFn> {
  return listen<string>("agent:text-delta", (e) => handler(e.payload));
}

export function onAgentThinkingDelta(handler: (text: string) => void): Promise<UnlistenFn> {
  return listen<string>("agent:thinking-delta", (e) => handler(e.payload));
}

export function onAgentTurnEnd(handler: (data: { had_text: boolean; thinking: string | null }) => void): Promise<UnlistenFn> {
  return listen("agent:turn-end", (e) => handler(e.payload as any));
}

export function onAgentAction(handler: (action: any) => void): Promise<UnlistenFn> {
  return listen("agent:action", (e) => handler(e.payload));
}

export function onAgentDone(handler: () => void): Promise<UnlistenFn> {
  return listen("agent:done", () => handler());
}

export function onAgentError(handler: (error: string) => void): Promise<UnlistenFn> {
  return listen<string>("agent:error", (e) => handler(e.payload));
}
