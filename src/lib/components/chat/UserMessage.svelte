<script lang="ts">
  import type { UserMessage as UserMsg } from "$lib/tauri/types";

  let { msg }: { msg: UserMsg } = $props();
</script>

<div class="flex gap-2.5 px-4 py-3">
  <div class="w-[26px] h-[26px] rounded shrink-0 bg-[--color-bg-active] flex items-center justify-center text-[11px] text-[--color-text] font-semibold">
    U
  </div>
  <div class="flex-1 pt-0.5">
    <div class="text-[13px] text-[--color-text]">{msg.content}</div>
  </div>
  <span class="text-[10px] text-[--color-text-dim] shrink-0 pt-1">{msg.timestamp}</span>
</div>
