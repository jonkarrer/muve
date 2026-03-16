<script lang="ts">
  import { filesStore } from "$lib/stores/files.svelte";
  import { X } from "lucide-svelte";
</script>

<div class="flex items-center bg-[--color-bg-surface] border-b border-[--color-border] overflow-x-auto">
  {#each filesStore.openFiles as file, i (file.path)}
    <div
      class="flex items-center gap-2 px-3 py-1.5 text-[12px] border-r border-[--color-border] shrink-0 transition-colors"
      class:bg-[--color-bg-panel]={i === filesStore.activeTabIndex}
      class:text-[--color-text]={i === filesStore.activeTabIndex}
      class:text-[--color-text-muted]={i !== filesStore.activeTabIndex}
      class:hover:bg-[--color-bg-hover]={i !== filesStore.activeTabIndex}
    >
      <button
        onclick={() => filesStore.openFileInTab(file.path, file.content, file.language)}
        class="cursor-pointer bg-transparent border-none text-inherit"
      >
        {file.path.split("/").pop()}
      </button>
      <button
        onclick={() => filesStore.closeTab(i)}
        class="text-[--color-text-muted] hover:text-[--color-text] cursor-pointer p-0.5 rounded hover:bg-[--color-bg-active] transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  {/each}
</div>
