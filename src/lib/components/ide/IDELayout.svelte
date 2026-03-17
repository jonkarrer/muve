<script lang="ts">
  import { ideStore } from "$lib/stores/ide.svelte";
  import { resizable } from "$lib/actions/resizable";
  import TopBar from "./TopBar.svelte";
  import StatusBar from "./StatusBar.svelte";
  import FileTree from "../sidebar/FileTree.svelte";
  import ChatPanel from "../chat/ChatPanel.svelte";
  import FilePanel from "../editor/FilePanel.svelte";
</script>

<div class="flex flex-col h-screen bg-[--color-bg] text-[--color-text] font-mono overflow-hidden">
  <TopBar />

  <div class="flex flex-1 min-h-0">
    {#if ideStore.showSidebar}
      <div class="shrink-0 flex flex-col bg-[--color-bg-panel] border-r border-[--color-border]" style:width="{ideStore.sidebarWidth}px">
        <FileTree />
      </div>
      <div use:resizable={{ direction: "horizontal", onresize: (d) => ideStore.setSidebarWidth(ideStore.sidebarWidth + d) }} class="w-1 cursor-col-resize hover:bg-[--color-accent]/20 transition-colors shrink-0"></div>
    {/if}

    <div class="flex flex-col flex-1 min-w-0">
      <div class="flex flex-1 min-h-0">
        <div class="flex-1 flex flex-col min-w-0 border-r border-[--color-border]">
          <ChatPanel />
        </div>

        {#if ideStore.showFilePanel}
          <div use:resizable={{ direction: "horizontal", onresize: (d) => ideStore.setFilePanelWidth(ideStore.filePanelWidth - d) }} class="w-1 cursor-col-resize hover:bg-[--color-accent]/20 transition-colors shrink-0"></div>
          <div class="shrink-0 flex flex-col bg-[--color-bg-panel]" style:width="{ideStore.filePanelWidth}px">
            <FilePanel />
          </div>
        {/if}
      </div>
    </div>
  </div>

  <StatusBar />
</div>
