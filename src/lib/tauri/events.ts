import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AgentStatus, FileAction } from "./types";

export interface TurnEndPayload { had_text: boolean; thinking: string | null }

const on = <T>(event: string) =>
  (handler: (data: T) => void): Promise<UnlistenFn> =>
    listen<T>(event, (e) => handler(e.payload));

export const onAgentStatus = on<AgentStatus>("agent:status");
export const onAgentTextDelta = on<string>("agent:text-delta");
export const onAgentThinkingDelta = on<string>("agent:thinking-delta");
export const onAgentTurnEnd = on<TurnEndPayload>("agent:turn-end");
export const onAgentAction = on<FileAction>("agent:action");
export const onAgentDone = on<void>("agent:done");
export const onAgentError = on<string>("agent:error");
