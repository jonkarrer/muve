import type { FileNode, FileAction } from "$lib/tauri/types";

interface OpenFile {
  path: string;
  content: string;
  language: string;
}

interface RecentTouch {
  action: string;
  timestamp: number;
}

let tree = $state<FileNode[]>([]);
let activeAgentFile = $state<string | null>(null);
let activeAgentAction = $state<FileAction["kind"] | null>(null);
let recentlyTouched = $state<Record<string, RecentTouch>>({});
let expandedDirs = $state<Record<string, boolean>>({});
let selectedFile = $state<string | null>(null);
let openFiles = $state<OpenFile[]>([]);
let activeTabIndex = $state(0);

let activeFile = $derived(
  openFiles.length > 0 && activeTabIndex < openFiles.length
    ? openFiles[activeTabIndex]
    : null
);
let fileCount = $derived(countFiles(tree));

function setTree(newTree: FileNode[]) {
  tree = newTree;
}

function resetProject() {
  tree = [];
  openFiles = [];
  activeTabIndex = 0;
  selectedFile = null;
  activeAgentFile = null;
  activeAgentAction = null;
  recentlyTouched = {};
  expandedDirs = {};
}

function setActiveAgentFile(path: string | null, action?: FileAction["kind"]) {
  activeAgentFile = path;
  activeAgentAction = action ?? null;

  if (path) {
    const parts = path.split("/");
    for (let i = 0; i < parts.length - 1; i++) {
      expandedDirs[parts.slice(0, i + 1).join("/")] = true;
    }
  }
}

function addRecentlyTouched(path: string, action: string) {
  recentlyTouched[path] = { action, timestamp: Date.now() };
  setTimeout(() => {
    delete recentlyTouched[path];
  }, 5000);
}

function toggleDir(path: string) {
  if (expandedDirs[path]) {
    delete expandedDirs[path];
  } else {
    expandedDirs[path] = true;
  }
}

function isExpanded(path: string): boolean {
  return !!expandedDirs[path];
}

function getRecentTouch(path: string): RecentTouch | undefined {
  return recentlyTouched[path];
}

function selectFile(path: string) {
  selectedFile = path;
}

function openFileInTab(path: string, content: string, language = "text") {
  const existing = openFiles.findIndex((f) => f.path === path);
  if (existing >= 0) {
    activeTabIndex = existing;
    return;
  }
  openFiles.push({ path, content, language });
  activeTabIndex = openFiles.length - 1;
}

function closeTab(index: number) {
  openFiles.splice(index, 1);
  if (openFiles.length === 0) {
    activeTabIndex = 0;
  } else if (activeTabIndex >= openFiles.length) {
    activeTabIndex = openFiles.length - 1;
  }
}

function countFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const n of nodes) {
    if (n.is_dir && n.children) count += countFiles(n.children);
    else count++;
  }
  return count;
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

  isExpanded,
  getRecentTouch,
  setTree,
  resetProject,
  setActiveAgentFile,
  addRecentlyTouched,
  toggleDir,
  selectFile,
  openFileInTab,
  closeTab,
};
