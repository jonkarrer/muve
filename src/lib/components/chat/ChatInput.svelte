<script lang="ts">
  import { chatStore } from "$lib/stores/chat.svelte";

  let input = $state("");

  function handleSend() {
    if (!input.trim()) return;
    chatStore.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      content: input,
    });
    input = "";
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
</script>

<div class="px-4 py-3 border-t border-[--color-border] bg-[--color-bg-panel]">
  <div class="flex items-center gap-2 bg-[--color-bg-surface] rounded-md border border-[--color-border] px-3">
    <span class="text-[--color-accent] text-[13px] shrink-0">❯</span>
    <input
      data-chat-input
      bind:value={input}
      onkeydown={handleKeydown}
      placeholder="tell the agent what to do..."
      class="flex-1 bg-transparent border-none outline-none text-[--color-text] text-[13px] py-2.5"
    />
    <button
      onclick={handleSend}
      class="cursor-pointer text-sm p-1 transition-colors"
      class:text-[--color-accent]={input.length > 0}
      class:text-[--color-text-dim]={input.length === 0}
    >
      ↵
    </button>
  </div>
</div>
