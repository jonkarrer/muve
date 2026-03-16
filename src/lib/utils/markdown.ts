// Minimal markdown renderer for chat messages
// Handles: inline code, code blocks, bullets, bold

export function renderMarkdown(text: string): string {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map(part => {
    if (part.startsWith("```")) {
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      const lang = escapeAttr(match?.[1] ?? "");
      const code = match?.[2]?.trim() ?? "";
      return `<div class="my-2 rounded border border-[--color-border] bg-[--color-bg] overflow-hidden"><pre class="code-block px-3 py-2 text-[12px] leading-[1.7] overflow-x-auto text-[--color-text]" data-lang="${lang}"><code>${escapeHtml(code)}</code></pre></div>`;
    }

    let html = escapeHtml(part);

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-[--color-bg-surface] px-1.5 py-0.5 rounded text-[0.9em] text-[--color-accent]">$1</code>');

    // Bullets
    html = html.replace(/^• (.*)$/gm, '<div class="pl-2 relative"><span class="absolute left-0 text-[--color-accent]">·</span>$1</div>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }).join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return text.replace(/[^a-zA-Z0-9_-]/g, "");
}
