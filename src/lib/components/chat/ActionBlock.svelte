<script lang="ts">
  import type { AgentActionMessage } from "$lib/tauri/types";
  import { filesStore } from "$lib/stores/files.svelte";
  import ActionBadge from "./ActionBadge.svelte";
  import DiffView from "./DiffView.svelte";
  import CodePreview from "./CodePreview.svelte";

  let { msg }: { msg: AgentActionMessage } = $props();

  let action = $derived(msg.action);
  let path = $derived("path" in action ? action.path : "old_path" in action ? action.old_path : "");
  let lineRange = $derived(action.kind === "read" && action.line_range ? `L${action.line_range[0]}-${action.line_range[1]}` : "");
  let hasDiff = $derived(action.kind === "edit" && action.diff.length > 0);
  let hasPreview = $derived(action.kind === "create" && action.content);

  function handleFileClick() {
    if (path) {
      filesStore.selectFile(path);
      if (action.kind === "create") {
        filesStore.openFileInTab(path, action.content, action.language ?? "text");
      } else if (action.kind === "read") {
        filesStore.openFileInTab(path, action.content ?? "");
      }
    }
  }
</script>

<div class="flex gap-2.5 px-4 py-2">
  <div class="w-[26px] h-[26px] rounded shrink-0 bg-[--color-accent]/8 border border-[--color-accent-dim]/20 flex items-center justify-center text-[11px] text-[--color-accent] font-semibold">
    A
  </div>
  <div class="flex-1 min-w-0">
    <div class="bg-[--color-bg-surface] rounded-md border border-[--color-border] my-1 overflow-hidden">
      <div
        class="px-3 py-1.5 flex items-center gap-2"
        class:border-b={hasDiff || hasPreview}
        class:border-[--color-border]={hasDiff || hasPreview}
      >
        <ActionBadge type={action.kind} />
        <button
          onclick={handleFileClick}
          class="text-[12.5px] text-[--color-muve-blue] cursor-pointer hover:underline bg-transparent border-none"
        >
          {path}
        </button>
        {#if lineRange}
          <span class="text-[11px] text-[--color-text-dim]">{lineRange}</span>
        {/if}
      </div>

      {#if hasDiff && action.kind === "edit"}
        <DiffView diff={action.diff} />
      {/if}

      {#if hasPreview && action.kind === "create"}
        <div class="max-h-[200px] overflow-y-auto">
          <CodePreview code={action.content} />
        </div>
      {/if}
    </div>
  </div>
  <span class="text-[10px] text-[--color-text-dim] shrink-0 pt-1">{msg.timestamp}</span>
</div>
