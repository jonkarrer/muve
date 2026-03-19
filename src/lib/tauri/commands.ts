import { invoke } from "@tauri-apps/api/core";
import type { FileNode } from "./types";

export const fs = {
  readFile: (path: string) =>
    invoke<string>("read_file", { path }),

  listDirectory: (path: string) =>
    invoke<FileNode[]>("list_directory", { path }),
};

export const agent = {
  sendMessage: (message: string, tabId: string, model?: string) =>
    invoke<void>("send_message", { message, tabId, model: model ?? null }),

  isRunning: (tabId: string) =>
    invoke<boolean>("is_agent_running", { tabId }),
};

export const project = {
  getCwd: () =>
    invoke<string>("get_cwd"),

  setCwd: (path: string) =>
    invoke<void>("set_cwd", { path }),

  setSessionId: (id: string | null) =>
    invoke<void>("set_session_id", { id }),

  startWatching: () =>
    invoke<void>("start_watching"),

  stopWatching: () =>
    invoke<void>("stop_watching"),

  getGitBranch: () =>
    invoke<string>("get_git_branch"),
};
