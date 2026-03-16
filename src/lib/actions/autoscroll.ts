import type { Action } from "svelte/action";

export const autoscroll: Action<HTMLDivElement> = (node) => {
  let rafId: number | null = null;

  const observer = new MutationObserver(() => {
    // Coalesce rapid mutations into a single scroll via rAF
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
      rafId = null;
    });
  });

  observer.observe(node, { childList: true, subtree: true, characterData: true });

  return {
    destroy() {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    },
  };
};
