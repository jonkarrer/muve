<script lang="ts">
  import "../app.css";
  import IDELayout from "$lib/components/ide/IDELayout.svelte";
  import { handleShortcut } from "$lib/utils/shortcuts";
  import { setupAgentListeners } from "$lib/agent/handler";
  import { onMount } from "svelte";

  onMount(() => {
    setupAgentListeners();
  });
</script>

<svelte:window onkeydown={handleShortcut} />

<IDELayout />
