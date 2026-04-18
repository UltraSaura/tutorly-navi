

User wants a self-contained "starter kit" they can paste into ChatGPT so it produces a valid `bundle.json` on first try. I have everything needed already in the repo (`curriculum-import/BUNDLE_FORMAT.md`, the existing subject UUIDs, the edge function behavior). No code changes — this is a documentation task.

## Plan

Create a single file: `curriculum-import/CHATGPT_PROMPT.md` — a copy-paste-ready prompt bundle for ChatGPT.

### Contents

**1. The prompt itself** (one block the user pastes into ChatGPT):
- Role: "You generate curriculum import bundles for a Supabase-backed app"
- Hard rules: pre-generate UUIDs, reuse existing subject UUIDs (list them), wire FKs by UUID, omit empty arrays, emit valid JSON only
- Output format: a fenced `json` code block with the 8 top-level arrays
- Per-section field requirements (condensed from BUNDLE_FORMAT.md)
- Safety rails: no `topic_objective_links` unless topic UUIDs given, success_criteria must reference an objective in the same bundle

**2. Reference data ChatGPT needs** (paste alongside the prompt):
- The 5 existing subject UUIDs + slugs (I'll query the live DB to get the real UUIDs so the user can paste the exact values)
- A worked minimal example (1 domain → 1 subdomain → 1 objective → 1 SC)
- Common levels: CP, CE1, CE2, CM1, CM2, 6e, 5e, 4e, 3e, 2nde, 1ère, Tle

**3. User workflow** (3 steps):
1. Paste the prompt + your topic ("Generate CM1 Maths fractions, full coverage")
2. Save ChatGPT's JSON output as `bundle.json`
3. Upload at `/admin/curriculum` with "Replace existing data" ticked

**4. Troubleshooting cheatsheet** — the 3 errors we just debugged and what they mean.

### What I'll do during implementation

1. Run a read-only SQL query to fetch real subject UUIDs + slugs from the live `subjects` table.
2. Write `curriculum-import/CHATGPT_PROMPT.md` with those real values inlined.
3. Add a one-line link to it from `curriculum-import/README.md`.

No edge function or app code changes. Pure docs.

