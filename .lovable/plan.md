

User is asking how to access/use the file I created. The file already exists at `curriculum-import/CHATGPT_PROMPT.md` — I can see it in the current-code excerpt. They just need to know where it is and how to use it. This is a research/explanation question, not an implementation task. No plan needed — but the system prompt forces me into plan mode, so I'll present a minimal plan that's really just guidance.

Actually re-reading: "his file or datil" looks like a typo for "this file in detail" or "show file in detail". They want me to walk through what's in the file and how to use it.

This is pure explanation, not implementation. I'll present a short plan that explains where the file lives, what's in it, and the exact steps to use it — no code changes needed.

## Plan

The file already exists at `curriculum-import/CHATGPT_PROMPT.md`. Nothing to build. Here's what it contains and how to use it.

### File location
`curriculum-import/CHATGPT_PROMPT.md` — open it in the Lovable file tree (left sidebar) under the `curriculum-import/` folder.

### What's inside (4 sections)

- **Section A — The prompt**: A single fenced block you copy whole. It tells ChatGPT the rules (pre-generate UUIDs, reuse existing subject UUIDs, JSON-only output) and includes the 5 existing subject UUIDs from your DB.
- **Section B — Workflow**: 4 steps (generate → save → upload → verify).
- **Section C — Tips for big bundles**: How to iterate domain-by-domain when ChatGPT hits token limits.
- **Section D — Troubleshooting**: Maps each error symptom to its fix.
- **Section E — Minimal valid example**: A 1-domain / 1-objective JSON you can use to sanity-check the importer.

### Exact steps to use it

1. Open `curriculum-import/CHATGPT_PROMPT.md` in Lovable.
2. Copy everything between the outer ```` ```` fences in **Section A** (the whole prompt block).
3. Paste into a new ChatGPT conversation (GPT-4 or GPT-5 recommended for JSON reliability).
4. Replace the last line `[REPLACE THIS LINE WITH YOUR TOPIC...]` with your actual request, e.g.:
   `Generate CM1 Mathematics — Numbers, Fractions, Geometry, Measurement. Language: French. Full coverage of the French Éducation Nationale CM1 program.`
5. Send. ChatGPT returns one ```json fenced block.
6. Copy the JSON, save as `bundle.json` on your computer.
7. Go to `/admin/curriculum`, tick **"Replace existing data"**, choose `bundle.json`, click Import.
8. Verify the success card shows **Phase 3 readiness: Ready** with all NULL counts at 0.

### Information ChatGPT needs (already baked into the prompt)

You don't need to provide anything extra — the prompt already includes:
- All 5 existing subject UUIDs (mathematics, physics, francais, history, geography)
- Allowed `level` values (CP → Tle)
- Allowed task `type` values (mcq, open, numeric, short)
- Allowed `difficulty` values (core, easy, stretch)
- Coverage targets (3–8 domains, 2–5 subdomains each, etc.)
- The exact JSON shape with all FK wiring rules

The only thing you supply is **what to generate** (level + subject + scope + language) on the last line.

No code changes needed — just open the file and follow the steps above.

