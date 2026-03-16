<script lang="ts">
  import { filesStore } from "$lib/stores/files.svelte";
  import { refreshFileTree } from "$lib/agent/handler";
  import FileTreeNode from "./FileTreeNode.svelte";
  import { onMount } from "svelte";

  onMount(() => {
    // Load real file tree on mount
    if (filesStore.tree.length === 0) {
      refreshFileTree();
    }
  });
</script>

<div class="flex flex-col h-full">
  <div class="px-3 py-2 text-[10px] text-[--color-text-dim] uppercase tracking-widest border-b border-[--color-border]">
    explorer
  </div>
  <div class="flex-1 overflow-y-auto pt-1">
    {#if filesStore.tree.length === 0}
      <div class="px-3 py-4 text-[11px] text-[--color-text-dim] text-center">
        no project open
      </div>
    {:else}
      {#each filesStore.tree as node (node.path)}
        <FileTreeNode {node} depth={0} />
      {/each}
    {/if}
  </div>
</div>
