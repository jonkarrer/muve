import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { FileAction } from "./types";

export interface TabEvent<T> { tab_id: string; data: T }

// All agent events now carry tab_id
export interface StatusPayload { tab_id: string; status: string }
export interface TextDeltaPayload { tab_id: string; text: string }
export interface TurnEndPayload { tab_id: string; had_text: boolean; thinking: string | null }
export type ActionPayload = FileAction & { tab_id: string }
export interface DonePayload { tab_id: string }
export interface ErrorPayload { tab_id: string; error: string }
export interface SessionPayload { tab_id: string; session_id: string }

const on = <T>(event: string) =>
  (handler: (data: T) => void): Promise<UnlistenFn> =>
    listen<T>(event, (e) => handler(e.payload));

export const onAgentStatus = on<StatusPayload>("agent:status");
export const onAgentTextDelta = on<TextDeltaPayload>("agent:text-delta");
export const onAgentTurnEnd = on<TurnEndPayload>("agent:turn-end");
export const onAgentAction = on<ActionPayload>("agent:action");
export const onAgentDone = on<DonePayload>("agent:done");
export const onAgentError = on<ErrorPayload>("agent:error");
export const onAgentSession = on<SessionPayload>("agent:session");

export interface FsChangedPayload { paths: string[] }
export const onFsChanged = on<FsChangedPayload>("fs:changed");
