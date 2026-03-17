<script lang="ts">
  import { chatStore } from "$lib/stores/chat.svelte";
  import { agentStore } from "$lib/stores/agent.svelte";
  import { agent } from "$lib/tauri/commands";
  import { autoscroll } from "$lib/actions/autoscroll";
  import AgentMessage from "./AgentMessage.svelte";
  import ActionBlock from "./ActionBlock.svelte";
  import { Diamond } from "lucide-svelte";

  let input = $state("");
  let isDisabled = $derived(agentStore.status === "active" || agentStore.status === "thinking");

  async function handleSend() {
    const text = input.trim();
    if (!text || isDisabled) return;
    const ts = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    chatStore.addMessage({ role: "user", id: crypto.randomUUID(), timestamp: ts, content: text });
    input = "";
    try { await agent.sendMessage(text); }
    catch (e) { chatStore.addMessage({ role: "agent", type: "text", id: crypto.randomUUID(), timestamp: ts, content: `Error: ${e}` }); }
  }
</script>

<div class="flex flex-1 flex-col min-h-0">
  <div class="flex-1 overflow-y-auto overflow-x-hidden" use:autoscroll>
    {#if chatStore.messages.length === 0}
      <div class="flex flex-col items-center justify-center h-full gap-3 text-[--color-text-dim] px-10">
        <Diamond size={36} class="opacity-15" />
        <span class="text-[13px]">describe what you want to build</span>
        <span class="text-[11px] opacity-50">the agent will read, create, and edit your files</span>
      </div>
    {:else}
      {#each chatStore.messages as msg (msg.id)}
        {#if msg.role === "user"}
          <div class="flex gap-2.5 px-4 py-3">
            <div class="w-[26px] h-[26px] rounded shrink-0 bg-[--color-bg-active] flex items-center justify-center text-[11px] font-semibold">U</div>
            <div class="flex-1 pt-0.5 text-[13px]">{msg.content}</div>
            <span class="text-[10px] text-[--color-text-dim] shrink-0 pt-1">{msg.timestamp}</span>
          </div>
        {:else if msg.role === "agent" && msg.type === "text"}
          <AgentMessage {msg} />
        {:else if msg.role === "agent" && msg.type === "action"}
          <ActionBlock {msg} />
        {/if}
      {/each}

      {#if chatStore.isStreaming}
        <div class="flex gap-2.5 px-4 py-2">
          <div class="w-[26px] h-[26px] rounded shrink-0 bg-[--color-accent]/8 border border-[--color-accent-dim]/20 flex items-center justify-center text-[11px] text-[--color-accent] font-semibold">A</div>
          <div class="flex-1 min-w-0 pt-0.5 text-[13px] leading-relaxed whitespace-pre-wrap">{chatStore.streamingContent}<span class="animate-pulse text-[--color-accent]">▌</span></div>
        </div>
      {/if}

      {#if (agentStore.status === "active" || agentStore.status === "thinking") && !chatStore.isStreaming}
        <div class="px-4 py-2 pl-[52px]">
          <span class="text-[12px] text-[--color-accent-dim]"><span class="animate-blink">●</span> {agentStore.status === "thinking" ? "thinking..." : "working..."}</span>
        </div>
      {/if}
    {/if}
  </div>

  <div class="px-4 py-3 border-t border-[--color-border] bg-[--color-bg-panel]">
    <div class="flex items-center gap-2 bg-[--color-bg-surface] rounded-md border border-[--color-border] px-3">
      <span class="text-[--color-accent] text-[13px] shrink-0">❯</span>
      <input data-chat-input bind:value={input} onkeydown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder={isDisabled ? "agent is working..." : "tell the agent what to do..."} disabled={isDisabled} class="flex-1 bg-transparent border-none outline-none text-[--color-text] text-[13px] py-2.5 disabled:opacity-50" />
      <button onclick={handleSend} disabled={isDisabled} class="cursor-pointer text-sm p-1 transition-colors disabled:opacity-30" class:text-[--color-accent]={input.length > 0 && !isDisabled} class:text-[--color-text-dim]={input.length === 0 || isDisabled}>↵</button>
    </div>
  </div>
</div>
