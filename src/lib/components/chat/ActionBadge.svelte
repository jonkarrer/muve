<script lang="ts">
  let { type }: { type: string } = $props();

  const config: Record<string, { label: string; color: string; bg: string }> = {
    read: { label: "READ", color: "var(--color-muve-blue)", bg: "rgba(77,156,240,0.08)" },
    create: { label: "CREATE", color: "var(--color-accent)", bg: "rgba(34,214,138,0.08)" },
    edit: { label: "EDIT", color: "var(--color-muve-amber)", bg: "rgba(240,168,48,0.08)" },
    delete: { label: "DELETE", color: "var(--color-muve-red)", bg: "rgba(232,83,74,0.08)" },
    run: { label: "RUN", color: "var(--color-muve-purple)", bg: "rgba(176,126,232,0.08)" },
  };

  let c = $derived(config[type] ?? config.read);
</script>

<span
  class="text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-wider"
  style:color={c.color}
  style:background={c.bg}
>
  {c.label}
</span>
