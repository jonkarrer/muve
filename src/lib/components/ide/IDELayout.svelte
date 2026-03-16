<script lang="ts">
  import { ideStore } from "$lib/stores/ide.svelte";
  import TopBar from "./TopBar.svelte";
  import StatusBar from "./StatusBar.svelte";
  import ResizeHandle from "./ResizeHandle.svelte";
  import FileTree from "../sidebar/FileTree.svelte";
  import ChatPanel from "../chat/ChatPanel.svelte";
  import FilePanel from "../editor/FilePanel.svelte";
</script>

<div class="flex flex-col h-screen bg-[--color-bg] text-[--color-text] font-mono overflow-hidden">
  <TopBar />

  <div class="flex flex-1 min-h-0">
    {#if ideStore.showSidebar}
      <div
        class="shrink-0 flex flex-col bg-[--color-bg-panel] border-r border-[--color-border]"
        style:width="{ideStore.sidebarWidth}px"
      >
        <FileTree />
      </div>
      <ResizeHandle
        direction="horizontal"
        onresize={(d) => ideStore.setSidebarWidth(ideStore.sidebarWidth + d)}
      />
    {/if}

    <div class="flex flex-col flex-1 min-w-0">
      <div class="flex flex-1 min-h-0">
        <div class="flex-1 flex flex-col min-w-0 border-r border-[--color-border]">
          <ChatPanel />
        </div>

        {#if ideStore.showFilePanel}
          <ResizeHandle
            direction="horizontal"
            onresize={(d) => ideStore.setFilePanelWidth(ideStore.filePanelWidth - d)}
          />
          <div
            class="shrink-0 flex flex-col bg-[--color-bg-panel]"
            style:width="{ideStore.filePanelWidth}px"
          >
            <FilePanel />
          </div>
        {/if}
      </div>
    </div>
  </div>

  <StatusBar />
</div>
