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
          class="mt-3 cursor-pointer text-[11px] text-[--color-accent] px-4 py-1.5 rounded border border-[--color-accent-dim]/25 bg-[--color-accent]/8 hover:bg-[--color-accent-dim]/15 transition-colors"
        >
          ▶ watch a demo
        </button>
      </div>
    {:else}
      {#each chatStore.messages as msg (msg.id)}
        <ChatMessage {msg} />
      {/each}

      {#if chatStore.isStreaming}
        <div class="px-4 py-2 pl-[52px]">
          <span class="text-[12px] text-[--color-text]">
            {chatStore.streamingContent}<span class="animate-pulse">▌</span>
          </span>
        </div>
      {/if}

      {#if agentStore.status === "active" && !chatStore.isStreaming}
        <div class="px-4 py-2 pl-[52px]">
          <span class="text-[12px] text-[--color-accent-dim]">
            <span class="animate-blink">●</span> working...
          </span>
        </div>
      {/if}
    {/if}
  </div>

  <ChatInput />
</div>
