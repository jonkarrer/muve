import type { Action } from "svelte/action";

export const autoscroll: Action<HTMLDivElement> = (node) => {
  const observer = new MutationObserver(() => {
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  });

  observer.observe(node, { childList: true, subtree: true, characterData: true });

  return {
    destroy() {
      observer.disconnect();
    },
  };
};
