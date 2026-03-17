<script lang="ts">
  import "../app.css";
  import IDELayout from "$lib/components/ide/IDELayout.svelte";
  import { handleShortcut } from "$lib/utils/shortcuts";
  import { setupAgentListeners, teardownAgentListeners } from "$lib/agent/handler";
  import { sessionsStore } from "$lib/stores/sessions.svelte";
  import { open } from "@tauri-apps/plugin-dialog";
  import { Diamond, FolderOpen } from "lucide-svelte";
  import { onMount } from "svelte";

  onMount(() => {
    setupAgentListeners();
    return () => teardownAgentListeners();
  });

  let hasSession = $derived(sessionsStore.sessions.length > 0);

  async function openFolder() {
    const selected = await open({ directory: true });
    if (selected) await sessionsStore.createSession(selected);
  }
</script>

<svelte:window onkeydown={handleShortcut} />

{#if hasSession}
  <IDELayout />
{:else}
  <div class="h-screen bg-[--color-bg] text-[--color-text] font-mono flex items-center justify-center">
    <div class="flex flex-col items-center gap-6 max-w-md text-center">
      <Diamond size={48} class="text-[--color-accent] opacity-40" />
      <div>
        <h1 class="text-xl font-semibold tracking-wide text-[--color-accent] mb-2">MUVE</h1>
        <p class="text-[13px] text-[--color-text-muted] leading-relaxed">Open a project folder to start a Claude session. The agent will read, create, and edit files while you watch.</p>
      </div>
      <button
        onclick={openFolder}
        class="flex items-center gap-2 cursor-pointer text-[13px] text-[--color-accent] px-6 py-2.5 rounded-md border border-[--color-accent-dim]/30 bg-[--color-accent]/8 hover:bg-[--color-accent]/15 transition-colors"
      >
        <FolderOpen size={16} />
        Open folder
      </button>
      <p class="text-[10px] text-[--color-text-dim]">or drag a folder onto this window</p>
    </div>
  </div>
{/if}
