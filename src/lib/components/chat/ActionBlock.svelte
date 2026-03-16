<script lang="ts">
  import type { AgentActionMessage, FileAction } from "$lib/tauri/types";
  import { filesStore } from "$lib/stores/files.svelte";
  import { fs as fsCommands } from "$lib/tauri/commands";
  import ActionBadge from "./ActionBadge.svelte";
  import DiffView from "./DiffView.svelte";
  import CodePreview from "./CodePreview.svelte";

  let { msg }: { msg: AgentActionMessage } = $props();

  let action = $derived(msg.action);

  let displayLabel = $derived(getDisplayLabel(action));
  let isRunAction = $derived(action.kind === "run");
  let hasDiff = $derived(action.kind === "edit" && "diff" in action && action.diff.length > 0);
  let hasPreview = $derived(action.kind === "create" && "content" in action && !!action.content);

  function getDisplayLabel(a: FileAction): string {
    if (a.kind === "run" && "command" in a) return a.command;
    if ("path" in a) return a.path;
    if ("old_path" in a) return a.old_path;
    return "";
  }

  function getFilePath(a: FileAction): string {
    if ("path" in a) return a.path;
    return "";
  }

  async function handleFileClick() {
    if (isRunAction) return;
    const filePath = getFilePath(action);
    if (!filePath) return;

    filesStore.selectFile(filePath);
    try {
      if (action.kind === "create" && "content" in action) {
        filesStore.openFileInTab(filePath, action.content, "text");
      } else {
        const content = await fsCommands.readFile(filePath);
        filesStore.openFileInTab(filePath, content);
      }
    } catch (e) {
      console.error("Failed to open file:", e);
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
        {#if isRunAction}
          <span class="text-[12.5px] text-[--color-muve-purple] truncate">{displayLabel}</span>
        {:else}
          <button
            onclick={handleFileClick}
            class="text-[12.5px] text-[--color-muve-blue] cursor-pointer hover:underline bg-transparent border-none truncate"
          >
            {displayLabel}
          </button>
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
