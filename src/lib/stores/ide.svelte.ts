let showSidebar = $state(true);
let showFilePanel = $state(true);
let showTerminal = $state(false);
let sidebarWidth = $state(220);
let filePanelWidth = $state(380);
let terminalHeight = $state(200);

export const ideStore = {
  get showSidebar() { return showSidebar; },
  get showFilePanel() { return showFilePanel; },
  get showTerminal() { return showTerminal; },
  get sidebarWidth() { return sidebarWidth; },
  get filePanelWidth() { return filePanelWidth; },
  get terminalHeight() { return terminalHeight; },

  toggleSidebar() { showSidebar = !showSidebar; },
  toggleFilePanel() { showFilePanel = !showFilePanel; },
  toggleTerminal() { showTerminal = !showTerminal; },
  setSidebarWidth(w: number) { sidebarWidth = Math.min(350, Math.max(150, w)); },
  setFilePanelWidth(w: number) { filePanelWidth = Math.min(600, Math.max(280, w)); },
  setTerminalHeight(h: number) { terminalHeight = Math.min(400, Math.max(100, h)); },
};
