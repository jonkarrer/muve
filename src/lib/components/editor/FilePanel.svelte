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
  import { chatStore } from "$lib/stores/chat.svelte";
  import { agentStore } from "$lib/stores/agent.svelte";
  import { autoscroll } from "$lib/actions/autoscroll";
  import type { AgentActionMessage, DiffHunk } from "$lib/tauri/types";
  import DiffView from "../chat/DiffView.svelte";

  // Actions for the current prompt: everything after the last user message
  let currentActions = $derived.by(() => {
    const msgs = chatStore.messages;
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx < 0) return [];
    return msgs.slice(lastUserIdx + 1).filter(
      (m): m is AgentActionMessage => m.role === "agent" && m.type === "action"
    );
  });

  let isWorking = $derived(agentStore.status === "active" || agentStore.status === "thinking");
</script>

<div class="flex flex-col h-full">
  <div class="px-3 py-2 text-[10px] text-[--color-text-dim] uppercase tracking-widest border-b border-[--color-border] flex items-center gap-2">
    actions
    {#if isWorking}
      <span class="animate-blink text-[--color-accent]">●</span>
    {/if}
    {#if currentActions.length > 0}
      <span class="ml-auto text-[--color-text-dim] normal-case tracking-normal">{currentActions.length}</span>
    {/if}
  </div>

  <div class="flex-1 overflow-y-auto" use:autoscroll>
    {#if currentActions.length === 0 && !isWorking}
      <div class="flex items-center justify-center h-full text-[--color-text-dim] text-[11px]">
        no actions yet
      </div>
    {:else}
      {#each currentActions as msg (msg.id)}
        {@const action = msg.action}
        {@const badge = BADGE[action.kind] ?? BADGE.read}
        {@const path = action.kind === "run" && "command" in action ? action.command : "path" in action ? action.path : ""}
        {@const hasDiff = action.kind === "edit" && "diff" in action && action.diff.length > 0}
        {@const hasPreview = action.kind === "create" && "content" in action && !!action.content}

        <div class="border-b border-[--color-border]/50">
          <div class="px-3 py-1.5 flex items-center gap-2">
            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-wider" style:color={badge.color} style:background={badge.bg}>{badge.label}</span>
            <span class="text-[11px] text-[--color-text-muted] truncate flex-1">{path}</span>
            <span class="text-[9px] text-[--color-text-dim] shrink-0">{msg.timestamp}</span>
          </div>

          {#if hasDiff && action.kind === "edit"}
            <DiffView diff={action.diff} />
          {/if}

          {#if hasPreview && action.kind === "create"}
            <div class="max-h-[150px] overflow-y-auto text-[11px] leading-[1.6] py-1 overflow-x-auto bg-[--color-bg]/50">
              {#each action.content.split("\n") as line, i}
                <div class="px-3 flex">
                  <span class="inline-block w-7 text-right mr-3 text-[--color-text-dim] select-none shrink-0">{i + 1}</span>
                  <span class="text-[--color-text]">{line}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
