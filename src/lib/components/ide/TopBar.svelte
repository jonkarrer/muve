<script lang="ts">
  import { ideStore } from "$lib/stores/ide.svelte";
  import { project } from "$lib/tauri/commands";
  import { refreshFileTree } from "$lib/agent/handler";
  import { startDemo } from "$lib/demo/runner";
  import { open } from "@tauri-apps/plugin-dialog";
  import { Diamond, Menu, FolderOpen } from "lucide-svelte";

  let cwd = $state("");

  async function loadCwd() {
    try {
      cwd = await project.getCwd();
    } catch {
      cwd = "";
    }
  }

  loadCwd();

  async function openFolder() {
    try {
      const selected = await open({ directory: true });
      if (selected) {
        await project.setCwd(selected);
        cwd = selected;
        await refreshFileTree();
      }
    } catch (e) {
      console.error("Failed to open folder:", e);
    }
  }

  let folderName = $derived(cwd ? cwd.split("/").pop() ?? cwd : "no project");
</script>

<div class="h-10 flex items-center px-3 bg-[--color-bg-panel] border-b border-[--color-border] gap-3 shrink-0">
  <button
    onclick={() => ideStore.toggleSidebar()}
    class="cursor-pointer text-sm text-[--color-text-muted] px-1.5 py-0.5 rounded transition-colors"
    class:bg-[--color-bg-active]={ideStore.showSidebar}
    class:hover:bg-[--color-bg-hover]={!ideStore.showSidebar}
  >
    <Menu size={16} />
  </button>

  <span class="text-[13px] font-semibold tracking-wide text-[--color-accent] flex items-center gap-1.5">
    <Diamond size={14} />
    MUVE
  </span>

  <button
    onclick={openFolder}
    class="flex items-center gap-1.5 cursor-pointer text-[11px] text-[--color-text-muted] px-2.5 py-1 rounded hover:bg-[--color-bg-hover] transition-colors border border-[--color-border]"
  >
    <FolderOpen size={12} />
    <span class="max-w-[200px] truncate">{folderName}</span>
  </button>

  <div class="flex-1"></div>

  <button
    onclick={() => startDemo()}
    class="cursor-pointer text-[11px] text-[--color-text-dim] px-2.5 py-1 rounded hover:bg-[--color-bg-hover] transition-colors"
  >
    ▶ demo
  </button>

  <button
    onclick={() => ideStore.toggleFilePanel()}
    class="cursor-pointer text-[11px] text-[--color-text-muted] px-2.5 py-1 rounded transition-colors"
    class:bg-[--color-bg-active]={ideStore.showFilePanel}
    class:hover:bg-[--color-bg-hover]={!ideStore.showFilePanel}
  >
    {ideStore.showFilePanel ? "◧ hide files" : "◧ show files"}
  </button>
</div>
