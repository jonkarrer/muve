---
paths:
  - "src/lib/stores/**/*.svelte.ts"
---

# Store rules

- Each store is a `.svelte.ts` file with module-level `$state` variables and a single exported const object.
- Getters on the export object provide reactive reads: `get foo() { return foo; }`.
- Methods on the export object provide mutations: `setFoo(v) { foo = v; }`.
- Stores that hold session-specific state (chat messages, open files, expanded dirs) must expose `snapshot()` and `restore()` methods for session switching.
- `snapshot()` returns a plain serializable object (no $state proxies). Use spread/map to copy.
- `restore()` replaces the $state variables wholesale — don't mutate in place.
- Don't store derived-only values. Use `$derived` instead.
