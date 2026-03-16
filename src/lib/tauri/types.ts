export type MessageRole = "user" | "agent" | "system";
export type AgentStatus = "idle" | "thinking" | "active" | "error" | "awaiting_approval";
export type ActionStatus = "pending" | "approved" | "rejected" | "applied";
export type DiffKind = "context" | "add" | "remove";

export interface UserMessage {
  role: "user";
  id: string;
  timestamp: string;
  content: string;
}

export interface AgentTextMessage {
  role: "agent";
  type: "text";
  id: string;
  timestamp: string;
  content: string;
  thinking?: string;
}

export interface AgentActionMessage {
  role: "agent";
  type: "action";
  id: string;
  timestamp: string;
  action: FileAction;
  status: ActionStatus;
}

export type Message = UserMessage | AgentTextMessage | AgentActionMessage;

export type FileAction =
  | { kind: "read"; path: string; line_range?: [number, number]; content?: string }
  | { kind: "create"; path: string; content: string; language?: string }
  | { kind: "edit"; path: string; diff: DiffHunk[]; before?: string; after?: string }
  | { kind: "delete"; path: string; previous_content?: string }
  | { kind: "rename"; old_path: string; new_path: string }
  | { kind: "run"; command: string; cwd?: string; output?: string; exit_code?: number };

export interface DiffHunk {
  type: DiffKind;
  content: string;
  old_line?: number;
  new_line?: number;
}

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
  size?: number;
  modified?: string;
  content?: string;
  language?: string;
}

export interface AgentConfig {
  adapter: "claude-code" | "aider" | "codex" | "generic";
  working_directory: string;
  model?: string;
  allowed_tools?: string[];
  approval_mode?: boolean;
}

export interface FsChangeEvent {
  kind: "create" | "modify" | "delete" | "rename";
  paths: string[];
}
