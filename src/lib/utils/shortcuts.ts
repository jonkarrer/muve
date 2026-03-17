import { ideStore } from "$lib/stores/ide.svelte";

export function handleShortcut(e: KeyboardEvent) {
  const meta = e.metaKey || e.ctrlKey;
  if (!meta && e.key !== "Escape") return;

  const actions: Record<string, () => void> = {
    b: () => ideStore.toggleSidebar(),
    e: () => ideStore.toggleFilePanel(),
    j: () => ideStore.toggleTerminal(),
    l: () => document.querySelector<HTMLInputElement>("[data-chat-input]")?.focus(),
  };

  const action = e.key === "Escape"
    ? actions.l
    : meta ? actions[e.key] : undefined;

  if (action) {
    e.preventDefault();
    action();
  }
}
