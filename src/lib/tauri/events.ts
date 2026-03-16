import type { FileAction, AgentStatus, FsChangeEvent } from "./types";

type UnlistenFn = () => void;

// Stub event listeners for v1 — return no-op unlisteners
export function onAgentTextChunk(_handler: (chunk: string) => void): Promise<UnlistenFn> {
  return Promise.resolve(() => {});
}

export function onAgentAction(_handler: (action: FileAction) => void): Promise<UnlistenFn> {
  return Promise.resolve(() => {});
}

export function onAgentThinking(_handler: (text: string) => void): Promise<UnlistenFn> {
  return Promise.resolve(() => {});
}

export function onAgentStatus(_handler: (status: AgentStatus) => void): Promise<UnlistenFn> {
  return Promise.resolve(() => {});
}

export function onFsChanged(_handler: (event: FsChangeEvent) => void): Promise<UnlistenFn> {
  return Promise.resolve(() => {});
}

export function onTerminalOutput(_id: string, _handler: (data: Uint8Array) => void): Promise<UnlistenFn> {
  return Promise.resolve(() => {});
}
