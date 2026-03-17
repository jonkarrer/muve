<script lang="ts">
  import "../app.css";
  import IDELayout from "$lib/components/ide/IDELayout.svelte";
  import { handleShortcut } from "$lib/utils/shortcuts";
  import { setupAgentListeners, teardownAgentListeners } from "$lib/agent/handler";
  import { sessionsStore } from "$lib/stores/sessions.svelte";
  import { project } from "$lib/tauri/commands";
  import { onMount } from "svelte";

  onMount(() => {
    setupAgentListeners();
    // Create initial session from cwd
    project.getCwd().then(cwd => {
      if (cwd) sessionsStore.createSession(cwd);
    });
    return () => teardownAgentListeners();
  });
</script>

<svelte:window onkeydown={handleShortcut} />

<IDELayout />
