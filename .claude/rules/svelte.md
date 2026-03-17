---
paths:
  - "src/**/*.svelte"
  - "src/**/*.svelte.ts"
---

# Svelte rules

- Use Svelte 5 runes: `$state`, `$derived`, `$effect`, `$props`. No legacy `$:` or stores API.
- Stores are `.svelte.ts` files exporting a single const object with getters (reactive reads) and methods (mutations).
- Use `Record<string, T>` for reactive collections, never `Map` or `Set` — Svelte 5 proxies don't track their mutations through getter-based stores.
- Shared constants (color maps, config objects) go in `<script lang="ts" module>` so they're allocated once across all instances.
- If a child component is under ~30 lines of markup and used in exactly one place, inline it into the parent.
- Tailwind classes reference `--color-*` CSS custom properties from `app.css @theme`. Don't hardcode hex values in templates.
- `use:action` for imperative DOM libraries (CodeMirror, autoscroll, resize). Actions must return `destroy()` that cleans up all listeners.
- Always return a cleanup function from `onMount` if you set up listeners or subscriptions.
