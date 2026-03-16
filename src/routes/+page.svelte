<script lang="ts">
  import "../app.css";
  import IDELayout from "$lib/components/ide/IDELayout.svelte";
  import { handleShortcut } from "$lib/utils/shortcuts";
  import { setupAgentListeners, teardownAgentListeners } from "$lib/agent/handler";
  import { onMount } from "svelte";

  onMount(() => {
    setupAgentListeners();
    return () => teardownAgentListeners();
  });
</script>

<svelte:window onkeydown={handleShortcut} />

<IDELayout />
