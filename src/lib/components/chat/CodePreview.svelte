<script lang="ts">
  let { code }: { code: string } = $props();
  let lines = $derived(code.split("\n"));
</script>

<div class="text-[12px] leading-[1.7] py-2 overflow-x-auto">
  {#each lines as line, i}
    <div class="px-3 flex">
      <span class="inline-block w-9 text-right mr-4 text-[--color-text-dim] select-none shrink-0">{i + 1}</span>
      <span class="text-[--color-text]">{line}</span>
    </div>
  {/each}
</div>
