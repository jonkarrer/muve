import type { FileNode, FileAction } from "$lib/tauri/types";

interface OpenFile { path: string; content: string; language: string }
interface RecentTouch { action: string; timestamp: number }
export interface FilesSnapshot { openFiles: OpenFile[]; activeTabIndex: number; expandedDirs: Record<string, boolean>; selectedFile: string | null }

let tree = $state<FileNode[]>([]);
let activeAgentFile = $state<string | null>(null);
let activeAgentAction = $state<FileAction["kind"] | null>(null);
let recentlyTouched = $state<Record<string, RecentTouch>>({});
let expandedDirs = $state<Record<string, boolean>>({});
let selectedFile = $state<string | null>(null);
let openFiles = $state<OpenFile[]>([]);
let activeTabIndex = $state(0);

let activeFile = $derived(openFiles.length > 0 && activeTabIndex < openFiles.length ? openFiles[activeTabIndex] : null);
let fileCount = $derived(countFiles(tree));

function countFiles(nodes: FileNode[]): number {
  let c = 0;
  for (const n of nodes) { if (n.is_dir && n.children) c += countFiles(n.children); else c++; }
  return c;
}

export const filesStore = {
  get tree() { return tree; },
  get activeAgentFile() { return activeAgentFile; },
  get activeAgentAction() { return activeAgentAction; },
  get selectedFile() { return selectedFile; },
  get openFiles() { return openFiles; },
  get activeTabIndex() { return activeTabIndex; },
  get activeFile() { return activeFile; },
  get fileCount() { return fileCount; },

  isExpanded(path: string) { return !!expandedDirs[path]; },
  getRecentTouch(path: string) { return recentlyTouched[path] as RecentTouch | undefined; },
  setTree(t: FileNode[]) { tree = t; },

  resetProject() {
    tree = []; openFiles = []; activeTabIndex = 0; selectedFile = null;
    activeAgentFile = null; activeAgentAction = null; recentlyTouched = {}; expandedDirs = {};
  },

  setActiveAgentFile(path: string | null, action?: FileAction["kind"]) {
    activeAgentFile = path; activeAgentAction = action ?? null;
    if (path) { const parts = path.split("/"); for (let i = 0; i < parts.length - 1; i++) expandedDirs[parts.slice(0, i + 1).join("/")] = true; }
  },

  addRecentlyTouched(path: string, action: string) {
    recentlyTouched[path] = { action, timestamp: Date.now() };
    setTimeout(() => { delete recentlyTouched[path]; }, 5000);
  },

  toggleDir(path: string) { if (expandedDirs[path]) delete expandedDirs[path]; else expandedDirs[path] = true; },
  selectFile(path: string) { selectedFile = path; },

  openFileInTab(path: string, content: string, language = "text") {
    const idx = openFiles.findIndex((f) => f.path === path);
    if (idx >= 0) { activeTabIndex = idx; return; }
    openFiles.push({ path, content, language });
    activeTabIndex = openFiles.length - 1;
  },

  closeTab(index: number) {
    openFiles.splice(index, 1);
    if (openFiles.length === 0) activeTabIndex = 0;
    else if (activeTabIndex >= openFiles.length) activeTabIndex = openFiles.length - 1;
  },

  snapshot(): FilesSnapshot {
    return { openFiles: openFiles.map(f => ({ ...f })), activeTabIndex, expandedDirs: { ...expandedDirs }, selectedFile };
  },

  restore(snap: FilesSnapshot) {
    openFiles = snap.openFiles; activeTabIndex = snap.activeTabIndex;
    expandedDirs = snap.expandedDirs; selectedFile = snap.selectedFile;
    activeAgentFile = null; activeAgentAction = null; recentlyTouched = {};
  },
};
