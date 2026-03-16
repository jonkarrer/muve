import { ideStore } from "$lib/stores/ide.svelte";

export function handleShortcut(e: KeyboardEvent) {
  const meta = e.metaKey || e.ctrlKey;

  if (meta && e.key === "b") {
    e.preventDefault();
    ideStore.toggleSidebar();
    return;
  }

  if (meta && e.key === "e") {
    e.preventDefault();
    ideStore.toggleFilePanel();
    return;
  }

  if (meta && e.key === "j") {
    e.preventDefault();
    ideStore.toggleTerminal();
    return;
  }

  if ((meta && e.key === "l") || e.key === "Escape") {
    e.preventDefault();
    const input = document.querySelector<HTMLInputElement>("[data-chat-input]");
    input?.focus();
    return;
  }
}
