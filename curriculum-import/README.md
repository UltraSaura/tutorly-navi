# Curriculum Import Tool

Tools and reference docs for importing curriculum content into the Supabase database via the `import-curriculum-bundle` edge function.

## 📘 Canonical reference

**👉 [`BUNDLE_SCHEMA.md`](./BUNDLE_SCHEMA.md)** — the single source of truth for the `bundle.json` format. Read this first.

## Other docs

- [`CHATGPT_PROMPT.md`](./CHATGPT_PROMPT.md) — copy-paste prompt for getting ChatGPT to generate a valid `bundle.json` for you.
- [`BUNDLE_FORMAT.md`](./BUNDLE_FORMAT.md) — older field reference (kept for backwards compatibility; prefer `BUNDLE_SCHEMA.md`).

## How to import

1. Generate or hand-write a `bundle.json` following [`BUNDLE_SCHEMA.md`](./BUNDLE_SCHEMA.md).
2. Go to `/admin/curriculum` in the app.
3. Optionally tick **Replace existing data** to purge orphans for the same scope.
4. Choose your file → **Import**.
5. Verify the result card shows **Phase 3 readiness: Ready** with all NULL counts at `0`.

## Optional: local Node.js script

The `import.js` script in this folder is a starter template if you ever need to import outside the app UI.

1. Create `.env`:
   ```env
   SUPABASE_URL=YOUR_SUPABASE_URL
   SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY
   ```
2. Drop your `bundle.json` here.
3. Run:
   ```bash
   npm install
   npm run import
   ```

For most workflows the in-app uploader at `/admin/curriculum` is preferred — it uses the same edge function and gives you the readiness report.
