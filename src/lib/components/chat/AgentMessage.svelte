<script lang="ts">
  import type { AgentTextMessage } from "$lib/tauri/types";
  import { renderMarkdown } from "$lib/utils/markdown";
  import ThinkingBlock from "./ThinkingBlock.svelte";

  let { msg }: { msg: AgentTextMessage } = $props();
</script>

<div class="flex gap-2.5 px-4 py-2">
  <div class="w-[26px] h-[26px] rounded shrink-0 bg-[--color-accent]/8 border border-[--color-accent-dim]/20 flex items-center justify-center text-[11px] text-[--color-accent] font-semibold">
    A
  </div>
  <div class="flex-1 min-w-0 pt-0.5">
    {#if msg.thinking}
      <ThinkingBlock text={msg.thinking} />
    {/if}

    {#if msg.content}
      <div class="text-[13px] text-[--color-text] leading-relaxed">
        {@html renderMarkdown(msg.content)}
      </div>
    {/if}
  </div>
  <span class="text-[10px] text-[--color-text-dim] shrink-0 pt-1">{msg.timestamp}</span>
</div>
