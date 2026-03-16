<script lang="ts">
  import { agentStore } from "$lib/stores/agent.svelte";
  import { filesStore } from "$lib/stores/files.svelte";
</script>

<div class="h-7 flex items-center px-3 gap-4 bg-[--color-bg] border-t border-[--color-border] text-[11px] text-[--color-text-muted] shrink-0">
  <span class="flex items-center gap-1.5">
    <span
      class="w-[7px] h-[7px] rounded-full transition-colors"
      class:bg-[--color-accent]={agentStore.status === "active"}
      class:bg-[--color-muve-amber]={agentStore.status === "thinking"}
      class:bg-[--color-text-dim]={agentStore.status === "idle" || agentStore.status === "error"}
      class:shadow-[0_0_6px_var(--color-accent)]={agentStore.status === "active"}
    ></span>
    {agentStore.statusLabel}
  </span>
  <span class="text-[--color-text-dim]">|</span>
  <span>{filesStore.fileCount} files</span>
  <span class="text-[--color-text-dim]">|</span>
  <span>python 3.12</span>
  <span class="ml-auto text-[--color-text-dim]">Muve v0.1.0</span>
</div>
