<script lang="ts">
  import { ideStore } from "$lib/stores/ide.svelte";
  import { sessionsStore } from "$lib/stores/sessions.svelte";
  import { open } from "@tauri-apps/plugin-dialog";
  import { startDemo } from "$lib/demo/runner";
  import { Diamond, Menu, FolderOpen, X, Plus } from "lucide-svelte";

  let showSessionMenu = $state(false);

  let currentName = $derived(sessionsStore.activeSession?.name ?? "no project");

  async function openFolder() {
    try {
      const selected = await open({ directory: true });
      if (selected) {
        await sessionsStore.createSession(selected);
        showSessionMenu = false;
      }
    } catch (e) { console.error("Failed to open folder:", e); }
  }
</script>

<svelte:window onclick={() => showSessionMenu = false} />

<div class="h-10 flex items-center px-3 bg-[--color-bg-panel] border-b border-[--color-border] gap-2 shrink-0">
  <button onclick={() => ideStore.toggleSidebar()} class="cursor-pointer text-sm text-[--color-text-muted] px-1.5 py-0.5 rounded transition-colors" class:bg-[--color-bg-active]={ideStore.showSidebar}>
    <Menu size={16} />
  </button>

  <span class="text-[13px] font-semibold tracking-wide text-[--color-accent] flex items-center gap-1.5">
    <Diamond size={14} /> MUVE
  </span>

  <!-- Session switcher -->
  <div class="relative">
    <button
      onclick={(e) => { e.stopPropagation(); showSessionMenu = !showSessionMenu; }}
      class="flex items-center gap-1.5 cursor-pointer text-[11px] text-[--color-text-muted] px-2.5 py-1 rounded hover:bg-[--color-bg-hover] transition-colors border border-[--color-border]"
    >
      <FolderOpen size={12} />
      <span class="max-w-[180px] truncate">{currentName}</span>
      <span class="text-[9px] opacity-50">▾</span>
    </button>

    {#if showSessionMenu}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div onclick={(e) => e.stopPropagation()} class="absolute top-full left-0 mt-1 w-64 bg-[--color-bg-surface] border border-[--color-border] rounded-md shadow-lg z-50 overflow-hidden">
        {#each sessionsStore.sessions as session (session.id)}
          <button
            class="flex items-center gap-2 px-3 py-2 text-[11px] cursor-pointer transition-colors group w-full text-left"
            class:bg-[--color-bg-active]={session.id === sessionsStore.activeSessionId}
            class:hover:bg-[--color-bg-hover]={session.id !== sessionsStore.activeSessionId}
            onclick={() => { sessionsStore.switchTo(session.id); showSessionMenu = false; }}
          >
            <FolderOpen size={11} class="shrink-0 text-[--color-text-dim]" />
            <div class="flex-1 min-w-0">
              <div class="truncate text-[--color-text]">{session.name}</div>
              <div class="truncate text-[--color-text-dim] text-[10px]">{session.cwd}</div>
            </div>
            {#if sessionsStore.sessions.length > 1}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <span
                onclick={(e) => { e.stopPropagation(); sessionsStore.removeSession(session.id); }}
                class="opacity-0 group-hover:opacity-100 text-[--color-text-dim] hover:text-[--color-muve-red] transition-all p-0.5 rounded cursor-pointer"
                role="button"
                tabindex="-1"
              >
                <X size={11} />
              </span>
            {/if}
          </button>
        {/each}

        <div class="border-t border-[--color-border]">
          <button
            onclick={openFolder}
            class="flex items-center gap-2 w-full px-3 py-2 text-[11px] text-[--color-accent] cursor-pointer hover:bg-[--color-bg-hover] transition-colors"
          >
            <Plus size={11} /> Open folder...
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="flex-1"></div>

  <button onclick={() => startDemo()} class="cursor-pointer text-[11px] text-[--color-text-dim] px-2.5 py-1 rounded hover:bg-[--color-bg-hover] transition-colors">▶ demo</button>

  <button onclick={() => ideStore.toggleFilePanel()} class="cursor-pointer text-[11px] text-[--color-text-muted] px-2.5 py-1 rounded transition-colors" class:bg-[--color-bg-active]={ideStore.showFilePanel}>
    {ideStore.showFilePanel ? "◧ hide files" : "◧ show files"}
  </button>
</div>
