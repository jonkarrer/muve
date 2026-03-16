<script lang="ts">
  import { Diamond } from "lucide-svelte";

  let { text }: { text: string } = $props();
  let open = $state(false);
</script>

<div class="my-1.5 rounded border border-[--color-border] overflow-hidden">
  <button
    onclick={() => open = !open}
    class="w-full px-2.5 py-1.5 cursor-pointer flex items-center gap-1.5 text-[11px] text-[--color-text-muted] bg-[--color-bg-surface] hover:bg-[--color-bg-hover] transition-colors"
  >
    <span class="text-[9px]">{open ? "▾" : "▸"}</span>
    <span class="opacity-60"><Diamond size={10} /></span>
    thinking
    <span class="ml-auto text-[10px] opacity-40">{text.length} chars</span>
  </button>
  {#if open}
    <div class="px-3 py-2 text-[12px] leading-relaxed text-[--color-text-muted] bg-[--color-bg] italic border-t border-[--color-border]">
      {text}
    </div>
  {/if}
</div>
