<script lang="ts">
  import { ideStore } from "$lib/stores/ide.svelte";
  import { startDemo } from "$lib/demo/runner";
  import { Diamond, Menu } from "lucide-svelte";
</script>

<div class="h-10 flex items-center px-3 bg-[--color-bg-panel] border-b border-[--color-border] gap-3 shrink-0">
  <button
    onclick={() => ideStore.toggleSidebar()}
    class="cursor-pointer text-sm text-[--color-text-muted] px-1.5 py-0.5 rounded transition-colors"
    class:bg-[--color-bg-active]={ideStore.showSidebar}
    class:hover:bg-[--color-bg-hover]={!ideStore.showSidebar}
  >
    <Menu size={16} />
  </button>

  <span class="text-[13px] font-semibold tracking-wide text-[--color-accent] flex items-center gap-1.5">
    <Diamond size={14} />
    MUVE
  </span>

  <div class="flex-1"></div>

  <button
    onclick={() => startDemo()}
    class="cursor-pointer text-[11px] text-[--color-accent] px-2.5 py-1 rounded border border-[--color-accent-dim]/25 bg-[--color-accent]/8 hover:bg-[--color-accent-dim]/15 tracking-wide transition-colors"
  >
    ▶ run demo
  </button>

  <button
    onclick={() => ideStore.toggleFilePanel()}
    class="cursor-pointer text-[11px] text-[--color-text-muted] px-2.5 py-1 rounded transition-colors"
    class:bg-[--color-bg-active]={ideStore.showFilePanel}
    class:hover:bg-[--color-bg-hover]={!ideStore.showFilePanel}
  >
    {ideStore.showFilePanel ? "◧ hide files" : "◧ show files"}
  </button>
</div>
