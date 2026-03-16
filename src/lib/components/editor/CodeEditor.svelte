<script lang="ts">
  import { codemirror } from "$lib/actions/codemirror";
  import { python } from "@codemirror/lang-python";
  import { javascript } from "@codemirror/lang-javascript";

  let { file }: { file: { path: string; content: string; language: string } } = $props();

  function getLanguageExtension(lang: string) {
    if (lang === "python" || file.path.endsWith(".py")) return python();
    if (lang === "javascript" || file.path.endsWith(".js") || file.path.endsWith(".ts")) return javascript();
    return undefined;
  }
</script>

<div class="flex-1 overflow-hidden bg-[--color-bg-panel]">
  <div
    class="h-full"
    use:codemirror={{
      content: file.content,
      language: getLanguageExtension(file.language),
      readonly: true,
    }}
  ></div>
</div>
