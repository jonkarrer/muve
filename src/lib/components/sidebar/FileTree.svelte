<script lang="ts">
  import { filesStore } from "$lib/stores/files.svelte";
  import FileTreeNode from "./FileTreeNode.svelte";
</script>

<div class="flex flex-col h-full">
  <div class="px-3 py-2 text-[10px] text-[--color-text-dim] uppercase tracking-widest border-b border-[--color-border]">
    explorer
  </div>
  <div class="flex-1 overflow-y-auto pt-1">
    {#each filesStore.tree as node (node.path)}
      <FileTreeNode {node} depth={0} />
    {/each}
  </div>
</div>
