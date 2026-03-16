<script lang="ts">
  import { chatStore } from "$lib/stores/chat.svelte";
  import { agentStore } from "$lib/stores/agent.svelte";
  import { autoscroll } from "$lib/actions/autoscroll";
  import { startDemo } from "$lib/demo/runner";
  import ChatMessage from "./ChatMessage.svelte";
  import ChatInput from "./ChatInput.svelte";
  import { Diamond } from "lucide-svelte";
</script>

<div class="flex flex-1 flex-col min-h-0">
  <div class="flex-1 overflow-y-auto overflow-x-hidden" use:autoscroll>
    {#if chatStore.messages.length === 0}
      <div class="flex flex-col items-center justify-center h-full gap-3 text-[--color-text-dim] px-10">
        <span class="text-4xl opacity-15"><Diamond size={36} /></span>
        <span class="text-[13px]">describe what you want to build</span>
        <span class="text-[11px] opacity-50">the agent will read, create, and edit your files</span>
        <button
          onclick={() => startDemo()}
          class="mt-3 cursor-pointer text-[11px] text-[--color-text-muted] px-4 py-1.5 rounded border border-[--color-border] hover:bg-[--color-bg-hover] transition-colors"
        >
          ▶ or watch a demo
        </button>
      </div>
    {:else}
      {#each chatStore.messages as msg (msg.id)}
        <ChatMessage {msg} />
      {/each}

      {#if chatStore.isStreaming}
        <div class="flex gap-2.5 px-4 py-2">
          <div class="w-[26px] h-[26px] rounded shrink-0 bg-[--color-accent]/8 border border-[--color-accent-dim]/20 flex items-center justify-center text-[11px] text-[--color-accent] font-semibold">
            A
          </div>
          <div class="flex-1 min-w-0 pt-0.5 text-[13px] text-[--color-text] leading-relaxed whitespace-pre-wrap">
            {chatStore.streamingContent}<span class="animate-pulse text-[--color-accent]">▌</span>
          </div>
        </div>
      {/if}

      {#if (agentStore.status === "active" || agentStore.status === "thinking") && !chatStore.isStreaming}
        <div class="px-4 py-2 pl-[52px]">
          <span class="text-[12px] text-[--color-accent-dim]">
            <span class="animate-blink">●</span>
            {agentStore.status === "thinking" ? "thinking..." : "working..."}
          </span>
        </div>
      {/if}
    {/if}
  </div>

  <ChatInput />
</div>
