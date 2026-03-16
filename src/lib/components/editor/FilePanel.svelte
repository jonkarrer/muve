<script lang="ts">
  import { filesStore } from "$lib/stores/files.svelte";
  import EditorTabs from "./EditorTabs.svelte";
  import CodeEditor from "./CodeEditor.svelte";
  import EmptyState from "./EmptyState.svelte";
</script>

<div class="flex flex-col h-full">
  {#if filesStore.openFiles.length > 0}
    <EditorTabs />
    {#if filesStore.activeFile}
      <CodeEditor file={filesStore.activeFile} />
    {/if}
  {:else}
    <EmptyState />
  {/if}
</div>
