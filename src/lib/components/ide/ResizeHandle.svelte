<script lang="ts">
  import { resizable } from "$lib/actions/resizable";

  let {
    direction = "horizontal",
    onresize,
  }: {
    direction?: "horizontal" | "vertical";
    onresize: (delta: number) => void;
  } = $props();
</script>

{#if direction === "horizontal"}
  <div
    use:resizable={{ direction, onresize }}
    class="w-1 cursor-col-resize hover:bg-[--color-accent]/20 transition-colors shrink-0"
  ></div>
{:else}
  <div
    use:resizable={{ direction, onresize }}
    class="h-1 cursor-row-resize hover:bg-[--color-accent]/20 transition-colors shrink-0"
  ></div>
{/if}
