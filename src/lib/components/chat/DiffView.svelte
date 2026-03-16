<script lang="ts">
  import type { DiffHunk } from "$lib/tauri/types";

  let { diff }: { diff: DiffHunk[] } = $props();
</script>

<div class="text-[12px] leading-[1.7] py-2">
  {#each diff as line, i}
    <div
      class="px-3 border-l-2"
      class:bg-[rgba(34,214,138,0.07)]={line.type === "add"}
      class:bg-[rgba(232,83,74,0.07)]={line.type === "remove"}
      class:text-[--color-accent]={line.type === "add"}
      class:text-[--color-muve-red]={line.type === "remove"}
      class:text-[--color-text-muted]={line.type === "context"}
      class:border-[--color-accent-dim]={line.type === "add"}
      class:border-[--color-muve-red]={line.type === "remove"}
      class:border-transparent={line.type === "context"}
    >
      <span class="inline-block w-4 opacity-50 select-none">
        {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
      </span>{line.content}
    </div>
  {/each}
</div>
