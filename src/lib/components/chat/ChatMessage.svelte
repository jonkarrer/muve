<script lang="ts">
  import type { Message } from "$lib/tauri/types";
  import UserMessage from "./UserMessage.svelte";
  import AgentMessage from "./AgentMessage.svelte";
  import ActionBlock from "./ActionBlock.svelte";

  let { msg }: { msg: Message } = $props();
</script>

{#if msg.role === "user"}
  <UserMessage {msg} />
{:else if msg.role === "agent" && msg.type === "text"}
  <AgentMessage {msg} />
{:else if msg.role === "agent" && msg.type === "action"}
  <ActionBlock {msg} />
{/if}
