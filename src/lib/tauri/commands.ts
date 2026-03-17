import { invoke } from "@tauri-apps/api/core";
import type { FileNode } from "./types";

export const fs = {
  readFile: (path: string) =>
    invoke<string>("read_file", { path }),

  listDirectory: (path: string) =>
    invoke<FileNode[]>("list_directory", { path }),
};

export const agent = {
  sendMessage: (message: string) =>
    invoke<void>("send_message", { message }),

  isRunning: () =>
    invoke<boolean>("is_agent_running"),
};

export const project = {
  getCwd: () =>
    invoke<string>("get_cwd"),

  setCwd: (path: string) =>
    invoke<void>("set_cwd", { path }),

  setSessionId: (id: string | null) =>
    invoke<void>("set_session_id", { id }),
};
