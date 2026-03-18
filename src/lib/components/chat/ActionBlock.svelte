<script lang="ts" module>
  const BADGE: Record<string, { label: string; color: string; bg: string }> = {
    read: { label: "READ", color: "var(--color-muve-blue)", bg: "rgba(77,156,240,0.08)" },
    create: { label: "CREATE", color: "var(--color-accent)", bg: "rgba(34,214,138,0.08)" },
    edit: { label: "EDIT", color: "var(--color-muve-amber)", bg: "rgba(240,168,48,0.08)" },
    delete: { label: "DELETE", color: "var(--color-muve-red)", bg: "rgba(232,83,74,0.08)" },
    run: { label: "RUN", color: "var(--color-muve-purple)", bg: "rgba(176,126,232,0.08)" },
  };
</script>

<script lang="ts">
  import type { AgentActionMessage } from "$lib/tauri/types";
  import DiffView from "./DiffView.svelte";

  let { msg }: { msg: AgentActionMessage } = $props();
  let action = $derived(msg.action);
  let badge = $derived(BADGE[action.kind] ?? BADGE.read);
  let label = $derived(action.kind === "run" && "command" in action ? action.command : "path" in action ? action.path : "");
  let hasDiff = $derived(action.kind === "edit" && "diff" in action && action.diff.length > 0);
  let hasPreview = $derived(action.kind === "create" && "content" in action && !!action.content);
</script>

<div class="flex gap-2.5 px-4 py-2">
  <div class="w-[26px] h-[26px] rounded shrink-0 bg-[--color-accent]/8 border border-[--color-accent-dim]/20 flex items-center justify-center text-[11px] text-[--color-accent] font-semibold">A</div>
  <div class="flex-1 min-w-0">
    <div class="bg-[--color-bg-surface] rounded-md border border-[--color-border] my-1 overflow-hidden">
      <div class="px-3 py-1.5 flex items-center gap-2" class:border-b={hasDiff || hasPreview} class:border-[--color-border]={hasDiff || hasPreview}>
        <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-wider" style:color={badge.color} style:background={badge.bg}>{badge.label}</span>
        <span class="text-[12.5px] truncate" class:text-[--color-muve-purple]={action.kind === "run"} class:text-[--color-muve-blue]={action.kind !== "run"}>{label}</span>
      </div>
      {#if hasDiff && action.kind === "edit"}
        <DiffView diff={action.diff} />
      {/if}
      {#if hasPreview && action.kind === "create"}
        <div class="max-h-[200px] overflow-y-auto text-[12px] leading-[1.7] py-2 overflow-x-auto">
          {#each action.content.split("\n") as line, i}
            <div class="px-3 flex">
              <span class="inline-block w-9 text-right mr-4 text-[--color-text-dim] select-none shrink-0">{i + 1}</span>
              <span class="text-[--color-text]">{line}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  <span class="text-[10px] text-[--color-text-dim] shrink-0 pt-1">{msg.timestamp}</span>
</div>
