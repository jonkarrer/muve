// Minimal markdown renderer for chat messages
// Handles: inline code, code blocks, bullets, bold

export function renderMarkdown(text: string): string {
  // Split code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map(part => {
    if (part.startsWith("```")) {
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      const lang = match?.[1] ?? "";
      const code = match?.[2]?.trim() ?? "";
      return `<div class="my-2 rounded border border-[--color-border] bg-[--color-bg] overflow-hidden"><div class="code-block" data-lang="${lang}">${escapeHtml(code)}</div></div>`;
    }

    // Process inline markdown
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
