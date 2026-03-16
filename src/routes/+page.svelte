<script lang="ts">
  import "../app.css";
  import IDELayout from "$lib/components/ide/IDELayout.svelte";
  import { handleShortcut } from "$lib/utils/shortcuts";
</script>

<svelte:window onkeydown={handleShortcut} />

<IDELayout />
