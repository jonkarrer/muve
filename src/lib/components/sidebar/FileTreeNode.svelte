<script lang="ts">
  import { filesStore } from "$lib/stores/files.svelte";
  import { fs as fsCommands } from "$lib/tauri/commands";
  import type { FileNode } from "$lib/tauri/types";
  import FileTreeNode from "./FileTreeNode.svelte";

  let { node, depth = 0 }: { node: FileNode; depth?: number } = $props();

  const actionColors: Record<string, string> = {
    read: "#4d9cf0",
    create: "#22d68a",
    edit: "#f0a830",
    delete: "#e8534a",
    run: "#b07ee8",
  };

  const fileIcons: Record<string, { icon: string; color: string }> = {
    py: { icon: "◆", color: "#22d68a" },
    js: { icon: "◆", color: "#f0a830" },
    ts: { icon: "◆", color: "#4d9cf0" },
    rs: { icon: "◆", color: "#e8534a" },
    md: { icon: "◇", color: "#4d9cf0" },
    txt: { icon: "○", color: "#5c6a7a" },
    json: { icon: "○", color: "#f0a830" },
    toml: { icon: "○", color: "#f0a830" },
    yaml: { icon: "○", color: "#b07ee8" },
    yml: { icon: "○", color: "#b07ee8" },
    gitignore: { icon: "●", color: "#3d4b5c" },
    svelte: { icon: "◆", color: "#e8534a" },
    css: { icon: "◆", color: "#4d9cf0" },
    html: { icon: "◆", color: "#e8534a" },
  };

  let isAgentActive = $derived(filesStore.activeAgentFile === node.path);
  let recentTouch = $derived(filesStore.getRecentTouch(node.path));
  let isSelected = $derived(filesStore.selectedFile === node.path);
  let isExpanded = $derived(filesStore.isExpanded(node.path));
  let borderColor = $derived(
    isAgentActive ? actionColors[filesStore.activeAgentAction!] ?? "transparent" : "transparent"
  );

  async function handleClick() {
    if (node.is_dir) {
      filesStore.toggleDir(node.path);
    } else {
      filesStore.selectFile(node.path);
      try {
        const content = await fsCommands.readFile(node.path);
        const lang = detectLanguage(node.name);
        filesStore.openFileInTab(node.path, content, lang);
      } catch (e) {
        console.error("Failed to read file:", e);
      }
    }
  }

  function detectLanguage(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const langMap: Record<string, string> = {
      py: "python", js: "javascript", ts: "javascript",
      rs: "rust", json: "json", md: "markdown",
      svelte: "html", html: "html", css: "css",
    };
    return langMap[ext] ?? "text";
  }

  function getFileIcon(name: string) {
    const ext = name.startsWith(".") ? name.slice(1) : name.split(".").pop() ?? "";
    return fileIcons[ext] ?? { icon: "○", color: "#5c6a7a" };
  }
</script>

<button
  onclick={handleClick}
  class="flex w-full items-center gap-1 py-0.5 cursor-pointer text-[12.5px] border-l-2 transition-all duration-150 hover:bg-[--color-bg-hover]"
  class:animate-pulse-glow={isAgentActive}
  class:text-[--color-accent]={isSelected && !isAgentActive}
  style:border-left-color={isSelected ? "var(--color-accent)" : borderColor}
  style:padding-left="{12 + depth * 16}px"
  style:background={isAgentActive ? "" : isSelected ? "rgba(34,214,138,0.08)" : "transparent"}
>
  {#if node.is_dir}
    <span class="text-[--color-muve-amber] text-[11px] mr-1">{isExpanded ? "▾" : "▸"}</span>
  {:else}
    {@const fi = getFileIcon(node.name)}
    <span class="text-[8px] mr-1.5" style:color={fi.color}>{fi.icon}</span>
  {/if}

  <span class:opacity-85={node.is_dir} class="text-left truncate">{node.name}</span>

  {#if node.is_dir}
    <span class="ml-auto text-[10px] text-[--color-text-dim] pr-2">{node.children?.length ?? 0}</span>
  {/if}

  {#if isAgentActive && filesStore.activeAgentAction === "create"}
    <span class="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-[--color-accent]/10 text-[--color-accent] font-semibold tracking-wider mr-2">NEW</span>
  {/if}
  {#if isAgentActive && filesStore.activeAgentAction === "edit"}
    <span class="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-[--color-muve-amber]/10 text-[--color-muve-amber] font-semibold tracking-wider mr-2">MOD</span>
  {/if}
  {#if recentTouch && !isAgentActive}
    <span class="ml-auto w-1.5 h-1.5 rounded-full mr-2" style:background={actionColors[recentTouch.action] ?? "#5c6a7a"}></span>
  {/if}
</button>

{#if node.is_dir && isExpanded && node.children}
  {#each node.children as child (child.path)}
    <FileTreeNode node={child} depth={depth + 1} />
  {/each}
{/if}
