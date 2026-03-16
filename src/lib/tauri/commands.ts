import type { FileNode, DiffHunk, AgentConfig } from "./types";

// Stub wrappers for v1 — console.log + mock returns
export const fs = {
  readFile: async (path: string): Promise<string> => {
    console.log("[stub] readFile:", path);
    return "";
  },

  writeFile: async (path: string, content: string): Promise<void> => {
    console.log("[stub] writeFile:", path, content.length, "chars");
  },

  listDirectory: async (path: string): Promise<FileNode[]> => {
    console.log("[stub] listDirectory:", path);
    return [];
  },

  computeDiff: async (before: string, after: string): Promise<DiffHunk[]> => {
    console.log("[stub] computeDiff");
    return [];
  },
};

export const agent = {
  start: async (config: AgentConfig): Promise<void> => {
    console.log("[stub] startAgent:", config);
  },

  send: async (message: string): Promise<void> => {
    console.log("[stub] sendToAgent:", message);
  },

  stop: async (): Promise<void> => {
    console.log("[stub] stopAgent");
  },
};

export const terminal = {
  spawn: async (cwd?: string): Promise<string> => {
    console.log("[stub] spawnTerminal:", cwd);
    return "stub-terminal-id";
  },

  write: async (id: string, data: string): Promise<void> => {
    console.log("[stub] writeTerminal:", id);
  },

  resize: async (id: string, cols: number, rows: number): Promise<void> => {
    console.log("[stub] resizeTerminal:", id, cols, rows);
  },

  kill: async (id: string): Promise<void> => {
    console.log("[stub] killTerminal:", id);
  },
};
