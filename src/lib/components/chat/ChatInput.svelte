<script lang="ts">
  import { chatStore } from "$lib/stores/chat.svelte";
  import { agentStore } from "$lib/stores/agent.svelte";
  import { agent } from "$lib/tauri/commands";

  let input = $state("");

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    if (agentStore.status === "active" || agentStore.status === "thinking") return;

    // Add user message to chat
    chatStore.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      content: text,
    });

    input = "";

    // Send to agent backend
    try {
      await agent.sendMessage(text);
    } catch (e: any) {
      chatStore.addMessage({
        role: "agent",
        type: "text",
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        content: `Failed to send message: ${e}`,
      });
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  let isDisabled = $derived(agentStore.status === "active" || agentStore.status === "thinking");
</script>

<div class="px-4 py-3 border-t border-[--color-border] bg-[--color-bg-panel]">
  <div class="flex items-center gap-2 bg-[--color-bg-surface] rounded-md border border-[--color-border] px-3">
    <span class="text-[--color-accent] text-[13px] shrink-0">❯</span>
    <input
      data-chat-input
      bind:value={input}
      onkeydown={handleKeydown}
      placeholder={isDisabled ? "agent is working..." : "tell the agent what to do..."}
      disabled={isDisabled}
      class="flex-1 bg-transparent border-none outline-none text-[--color-text] text-[13px] py-2.5 disabled:opacity-50"
    />
    <button
      onclick={handleSend}
      disabled={isDisabled}
      class="cursor-pointer text-sm p-1 transition-colors disabled:opacity-30"
      class:text-[--color-accent]={input.length > 0 && !isDisabled}
      class:text-[--color-text-dim]={input.length === 0 || isDisabled}
    >
      ↵
    </button>
  </div>
</div>
