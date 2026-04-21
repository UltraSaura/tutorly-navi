

## Goal
Add `public/robots.txt` and `public/sitemap.xml` so crawlers have a clear entry point and sitemap discovery works once the site is deployed.

## Production domain
You haven't published the project yet (no custom domain set). Per your instruction, I'll use `https://stuwy.com` as the base URL. If your real production domain ends up different (e.g. `stuwy.app` — which is what we used in the OG tags earlier), just tell me and I'll swap both files.

> **Heads up — inconsistency to resolve later**: `index.html` currently uses `https://stuwy.app/` for `og:url`. Picking one canonical domain across `index.html`, `robots.txt`, and `sitemap.xml` matters for SEO. Not fixing it in this task since you specified `stuwy.com` here, but flagging it.

## Public-facing routes audit

From `src/App.tsx`, the only routes reachable without authentication are:
- `/` — landing page (`Index.tsx`)
- `/auth` — sign-in / register (`AuthPage.tsx`)

Everything else (`/chat`, `/learning/*`, `/guardian/*`, `/teacher/*`, `/admin/*`, `/management`) is gated behind `<ProtectedRoute>` / role guards and is not appropriate for a sitemap. There are no separate marketing pages, no public pricing/about/blog routes.

So the sitemap will contain just `/` and `/auth`, with a comment noting this is the full public surface today.

## File 1 — `public/robots.txt` (replace existing)

The current `public/robots.txt` only lists user-agents with `Allow: /` and has no sitemap reference. Replacing with a cleaner version:

```
# Allow all crawlers
User-agent: *
Allow: /

# Sitemap
Sitemap: https://stuwy.com/sitemap.xml
```

The previous per-bot `Allow` blocks (Googlebot, Bingbot, Twitterbot, facebookexternalhit) were redundant with the wildcard `User-agent: *` and added noise. Dropping them.

## File 2 — `public/sitemap.xml` (new)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
  Stuwy public sitemap.
  Only the landing page and the auth entry point are publicly crawlable today.
  All other routes (/chat, /learning/*, /guardian/*, /teacher/*, /admin/*, /management)
  are behind authentication and intentionally excluded.
  Add new public marketing/blog/pricing pages here as they ship.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://stuwy.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://stuwy.com/auth</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

I'm omitting `<lastmod>` deliberately — hardcoding a date here would lie to crawlers on every future deploy. If you want accurate `lastmod` later, we'd generate the sitemap at build time instead of shipping it static.

## Why these live in `public/`
Vite serves anything in `public/` from the site root verbatim. So `https://stuwy.com/robots.txt` and `https://stuwy.com/sitemap.xml` resolve correctly with no routing or build changes.

## Files touched
- **Replace**: `public/robots.txt` — clean wildcard + sitemap reference (~6 lines)
- **Create**: `public/sitemap.xml` — 2 URL entries + explanatory comment (~15 lines)

No code, deps, build config, DB, or edge function changes.

