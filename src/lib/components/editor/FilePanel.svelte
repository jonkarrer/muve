<script lang="ts">
  import { filesStore } from "$lib/stores/files.svelte";
  import { codemirror } from "$lib/actions/codemirror";
  import { python } from "@codemirror/lang-python";
  import { javascript } from "@codemirror/lang-javascript";
  import { X } from "lucide-svelte";

  function langExt(path: string) {
    if (path.endsWith(".py")) return python();
    if (path.endsWith(".js") || path.endsWith(".ts") || path.endsWith(".svelte")) return javascript();
    return undefined;
  }
</script>

<div class="flex flex-col h-full">
  {#if filesStore.openFiles.length > 0}
    <!-- Tabs -->
    <div class="flex items-center bg-[--color-bg-surface] border-b border-[--color-border] overflow-x-auto">
      {#each filesStore.openFiles as file, i (file.path)}
        <div
          class="flex items-center gap-2 px-3 py-1.5 text-[12px] border-r border-[--color-border] shrink-0 transition-colors"
          class:bg-[--color-bg-panel]={i === filesStore.activeTabIndex}
          class:text-[--color-text]={i === filesStore.activeTabIndex}
          class:text-[--color-text-muted]={i !== filesStore.activeTabIndex}
          class:hover:bg-[--color-bg-hover]={i !== filesStore.activeTabIndex}
        >
          <button onclick={() => filesStore.openFileInTab(file.path, file.content, file.language)} class="cursor-pointer bg-transparent border-none text-inherit">{file.path.split("/").pop()}</button>
          <button onclick={() => filesStore.closeTab(i)} class="text-[--color-text-muted] hover:text-[--color-text] cursor-pointer p-0.5 rounded hover:bg-[--color-bg-active] transition-colors"><X size={12} /></button>
        </div>
      {/each}
    </div>
    <!-- Editor -->
    {#if filesStore.activeFile}
      <div class="flex-1 overflow-hidden bg-[--color-bg-panel]">
        <div class="h-full" use:codemirror={{ content: filesStore.activeFile.content, language: langExt(filesStore.activeFile.path), readonly: true }}></div>
      </div>
    {/if}
  {:else}
    <div class="flex-1 flex items-center justify-center flex-col gap-2 text-[--color-text-dim] text-[12px]">
      <span class="text-3xl opacity-20">{"{ }"}</span>
      <span>select a file to view</span>
    </div>
  {/if}
</div>
