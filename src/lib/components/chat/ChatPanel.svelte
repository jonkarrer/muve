<script lang="ts">
  import { chatStore } from "$lib/stores/chat.svelte";
  import { agentStore } from "$lib/stores/agent.svelte";
  import { sessionsStore, MODELS, type ModelId } from "$lib/stores/sessions.svelte";
  import { agent } from "$lib/tauri/commands";
  import { autoscroll } from "$lib/actions/autoscroll";
  import AgentMessage from "./AgentMessage.svelte";
  import ActionBlock from "./ActionBlock.svelte";
  import { Diamond, Plus } from "lucide-svelte";

  let input = $state("");
  let isDisabled = $derived(agentStore.status === "active" || agentStore.status === "thinking");
  let tabs = $derived(sessionsStore.currentProjectTabs);
  let showNewTabMenu = $state(false);
  let newTabModel = $state<ModelId>("claude-sonnet-4-6");
  let plusBtn = $state<HTMLButtonElement>();
  let activeBranch = $derived(sessionsStore.activeSession?.branchLabel.replace(/^git\//, "") ?? "main");

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") showNewTabMenu = false;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isDisabled) return;
    const ts = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    chatStore.addMessage({ role: "user", id: crypto.randomUUID(), timestamp: ts, content: text });
    input = "";
    const model = sessionsStore.activeSession?.model;
    const tabId = sessionsStore.activeSessionId ?? "";
    try { await agent.sendMessage(text, tabId, model); }
    catch (e) { chatStore.addMessage({ role: "agent", type: "text", id: crypto.randomUUID(), timestamp: ts, content: `Error: ${e}` }); }
  }
</script>

<svelte:window onclick={() => showNewTabMenu = false} onkeydown={handleKeydown} />

<div class="flex flex-1 flex-col min-h-0">
  <!-- Agent tabs -->
  {#if tabs.length > 0}
    <div class="flex items-center border-b border-[--color-border] bg-[--color-bg-panel] shrink-0 overflow-x-auto">
      {#each tabs as tab (tab.id)}
        {@const isActive = tab.id === sessionsStore.activeSessionId}
        <button
          class="px-3 py-1.5 text-[11px] cursor-pointer transition-colors shrink-0 border-b-2"
          class:border-[--color-accent]={isActive}
          class:text-[--color-text]={isActive}
          class:border-transparent={!isActive}
          class:text-[--color-text-dim]={!isActive}
          onclick={() => sessionsStore.switchTo(tab.id)}
        >
          {tab.branchLabel}
        </button>
      {/each}

      <button
        bind:this={plusBtn}
        class="px-2 py-1.5 text-[--color-text-dim] hover:text-[--color-text] cursor-pointer transition-colors shrink-0"
        class:opacity-50={isDisabled}
        disabled={isDisabled}
        onclick={(e) => { e.stopPropagation(); showNewTabMenu = !showNewTabMenu; }}
      >
        <Plus size={12} />
      </button>
    </div>
  {/if}

  <!-- New tab popover (rendered outside tab bar to avoid overflow clipping) -->
  {#if showNewTabMenu && plusBtn}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={(e) => e.stopPropagation()}
      class="fixed w-56 bg-[--color-bg-surface] border border-[--color-border] rounded-md shadow-lg z-[100] overflow-hidden"
      style:left="{plusBtn.getBoundingClientRect().left}px"
      style:top="{plusBtn.getBoundingClientRect().bottom + 4}px"
    >
      <div class="px-3 py-1.5 text-[9px] text-[--color-text-dim] uppercase tracking-widest">model</div>
      {#each MODELS as m (m.id)}
        <button
          class="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] cursor-pointer hover:bg-[--color-bg-hover] transition-colors text-left"
          class:text-[--color-accent]={newTabModel === m.id}
          class:text-[--color-text]={newTabModel !== m.id}
          onclick={() => newTabModel = m.id}
        >
          {#if newTabModel === m.id}<span class="text-[9px]">●</span>{:else}<span class="text-[9px] opacity-0">●</span>{/if}
          {m.label}
        </button>
      {/each}
      <div class="border-t border-[--color-border] mt-1">
        <button
          class="flex items-center gap-2 w-full px-3 py-2 text-[11px] text-[--color-text] cursor-pointer hover:bg-[--color-bg-hover] transition-colors text-left"
          onclick={async () => { showNewTabMenu = false; if (sessionsStore.activeSession) await sessionsStore.createTab(sessionsStore.activeSession.cwd, newTabModel); }}
        >
          On current branch ({activeBranch})
        </button>
        <button
          class="flex items-center gap-2 w-full px-3 py-2 text-[11px] text-[--color-text-dim] cursor-default text-left opacity-50"
          disabled
        >
          Start a worktree...
        </button>
      </div>
    </div>
  {/if}

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
