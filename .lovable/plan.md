

## Goal
Replace the current coarse `manualChunks` in `vite.config.ts` with a finer-grained vendor split so the main bundle shrinks and vendor code caches independently across deploys.

## Current state
`vite.config.ts` already declares `build.rollupOptions.output.manualChunks` with three chunks:
```ts
manualChunks: {
  mathlive: ['mathlive'],
  supabase: ['@supabase/supabase-js'],
  react: ['react', 'react-dom']
}
```
We'll keep the existing `mathlive` and `react` chunks (still useful), rename `supabase` to the requested `vendor-supabase` naming convention, and add the new vendor groups.

## Change

In `vite.config.ts`, replace the `manualChunks` object with a function form so the Radix group can match any `@radix-ui/*` subpackage by id:

```ts
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('@radix-ui/')) return 'vendor-radix';
    if (id.includes('framer-motion')) return 'vendor-motion';
    if (id.includes('recharts')) return 'vendor-charts';
    if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
    if (
      id.includes('react-hook-form') ||
      id.includes('@hookform/resolvers') ||
      id.match(/[\\/]node_modules[\\/]zod[\\/]/)
    ) return 'vendor-forms';
    if (
      id.includes('i18next-browser-languagedetector') ||
      id.includes('react-i18next') ||
      id.match(/[\\/]node_modules[\\/]i18next[\\/]/)
    ) return 'vendor-i18n';
    if (id.includes('mathlive')) return 'mathlive';
    if (
      id.match(/[\\/]node_modules[\\/]react[\\/]/) ||
      id.match(/[\\/]node_modules[\\/]react-dom[\\/]/)
    ) return 'react';
  }
}
```

Why function form (not object): an object entry like `'vendor-radix': ['@radix-ui/*']` doesn't support globs — you'd have to enumerate every Radix subpackage by name. A function matches by module id and stays robust as new Radix packages are added.

The `zod` / `i18next` regex variants (`[\\/]node_modules[\\/]zod[\\/]`) avoid accidentally bucketing `zod-validation-error` or `i18next-browser-languagedetector` into the wrong chunk via plain `includes('zod')`.

## Resulting chunks
- `vendor-radix` — all `@radix-ui/*` packages
- `vendor-motion` — `framer-motion`
- `vendor-charts` — `recharts`
- `vendor-supabase` — `@supabase/supabase-js`
- `vendor-forms` — `react-hook-form`, `zod`, `@hookform/resolvers`
- `vendor-i18n` — `i18next`, `react-i18next`, `i18next-browser-languagedetector`
- `mathlive` — kept (large, isolated)
- `react` — kept (`react`, `react-dom`)
- Everything else falls into Vite's default chunking.

## Files touched
- **Edit**: `vite.config.ts` — swap the `manualChunks` object for the function above. ~25 lines inside the existing `build.rollupOptions.output` block. No other config keys change.

No code changes elsewhere, no DB changes, no dependency installs — every package listed is already in the project.

