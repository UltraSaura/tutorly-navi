

## Goal
Add SEO/social meta tags to `index.html` and replace the render-blocking unpkg MathLive CSS link with a self-hosted reference.

## Current state of `index.html`
```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <meta name="viewport" content="..." />
  <title>Stuwy</title>
  <link rel="stylesheet" href="https://unpkg.com/mathlive@0.107.0/dist/mathlive.css">
</head>
```
- No description, no Open Graph, no Twitter tags.
- MathLive CSS pulled from unpkg (render-blocking, third-party dependency at runtime).
- `src/main.tsx` already imports `'mathlive/static.css'` from the npm package, so the CDN link is actually redundant. The `copy:mathlive` postinstall script also writes assets to `public/mathlive/` (fonts/sounds), so a self-hosted CSS path is available.

## Changes to `index.html`

### 1. Add SEO + social meta tags (inside `<head>`, after `<title>`)
```html
<meta name="description" content="Stuwy is an AI-powered tutoring platform that helps students master math and guardians track their child's learning progress." />

<!-- Open Graph -->
<meta property="og:title" content="Stuwy — AI-powered tutoring for students and guardians" />
<meta property="og:description" content="AI-powered tutoring platform that helps students master math and guardians track their child's learning progress." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://stuwy.app/" />

<!-- Twitter -->
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Stuwy — AI-powered tutoring for students and guardians" />
<meta name="twitter:description" content="AI-powered tutoring platform that helps students master math and guardians track their child's learning progress." />
```

Note on `og:url`: using the production-style canonical `https://stuwy.app/`. If your real production domain differs, tell me and I'll swap it — the lovable.app preview URL isn't appropriate for a canonical OG tag.

### 2. Self-host MathLive CSS
Replace:
```html
<link rel="stylesheet" href="https://unpkg.com/mathlive@0.107.0/dist/mathlive.css">
```
with:
```html
<link rel="stylesheet" href="/mathlive/mathlive-static.css" />
```

Why this path: the `copy:mathlive` postinstall script copies MathLive's distributed assets into `public/mathlive/`. Vite serves anything under `public/` from the site root, so `/mathlive/mathlive-static.css` resolves correctly in dev and prod without touching the bundler. Since `src/main.tsx` already imports the CSS through the npm module too (which Vite inlines into the bundle), this `<link>` exists primarily to style MathLive markup before the JS bundle hydrates — keeping it self-hosted removes the third-party render-blocking request and the version drift risk against unpkg.

If the postinstall script outputs a different filename (e.g. `mathlive.css` instead of `mathlive-static.css`), I'll match the actual filename when implementing — I'll verify the exact name in `public/mathlive/` at edit time.

## Files touched
- **Edit**: `index.html` — add 7 meta tags, swap one `<link>` href. ~10 lines added, 1 line changed.

No other files affected. No build config, no deps, no DB.

