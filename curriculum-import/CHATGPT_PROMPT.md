# ChatGPT Bundle Generator — Copy-Paste Starter Kit

Paste **everything in Section A** into a new ChatGPT conversation, then add your topic at the bottom (e.g. *"Generate CM1 Mathematics — fractions, full coverage"*). ChatGPT will return a `bundle.json` you can upload directly at `/admin/curriculum`.

---

## A. The prompt (copy this whole block)

````
You are a curriculum bundle generator for a Supabase-backed learning app.
Output a SINGLE valid JSON object — no prose, no markdown — wrapped in one ```json fenced code block.

# Hard rules
1. Pre-generate a UUID v4 for every new entity (domains, subdomains, objectives, success_criteria, tasks, lessons). Use distinct UUIDs.
2. Wire ALL foreign keys by UUID, never by code or label.
3. Reuse existing subject UUIDs from the table below — DO NOT invent new subject UUIDs and leave the `subjects` array EMPTY (the subjects already exist in the database).
4. Every objective MUST reference subject_id + domain_id + subdomain_id (all UUIDs from this bundle or from the subjects table).
5. Every success_criterion MUST reference an objective_id from THIS bundle, plus mirror subject_id, domain_id, subdomain_id.
6. Every task MUST reference a success_criterion_id from this bundle, plus mirror subject_id, domain_id, subdomain_id.
7. Omit `topic_objective_links` and `lessons` (empty arrays) unless I explicitly give you topic UUIDs.
8. Use `level` values like "CP", "CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e", "2nde", "1ère", "Tle".
9. Output JSON only. No commentary before or after the code block.

# Existing subject UUIDs (reuse — do not redeclare in `subjects`)
| slug         | id                                     | language |
|--------------|----------------------------------------|----------|
| mathematics  | f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de   | en       |
| physics      | 06e9c3fa-5618-436c-b781-10b39fb21698   | en       |
| francais     | 8e5f05b5-77f9-5ccb-a064-398a25e2cdfa   | fr       |
| history      | 0b206783-4f46-47e6-aea1-4adf8c905f18   | en       |
| geography    | a578949a-cfac-4dab-9568-289b0f4a8029   | en       |

# Output shape
{
  "subjects": [],
  "domains":      [{ "id": "<uuid>", "subject_id": "<existing-subject-uuid>", "code": "NUMBERS", "label": "Numbers and operations" }],
  "subdomains":   [{ "id": "<uuid>", "subject_id": "<existing-subject-uuid>", "domain_id": "<domain-uuid>", "code": "FRAC", "label": "Fractions" }],
  "objectives":   [{ "id": "<uuid>", "subject_id": "<existing-subject-uuid>", "domain_id": "<domain-uuid>", "subdomain_id": "<subdomain-uuid>", "level": "CM1", "text": "Compare two simple fractions", "notes_from_prog": "", "keywords": ["fractions","comparison"] }],
  "success_criteria": [{ "id": "<uuid>", "objective_id": "<objective-uuid>", "subject_id": "<existing-subject-uuid>", "domain_id": "<domain-uuid>", "subdomain_id": "<subdomain-uuid>", "text": "Identify the larger of 1/2 vs 1/3" }],
  "tasks":        [{ "id": "<uuid>", "success_criterion_id": "<sc-uuid>", "subject_id": "<existing-subject-uuid>", "domain_id": "<domain-uuid>", "subdomain_id": "<subdomain-uuid>", "type": "mcq", "stem": "Which is larger: 1/2 or 1/3?", "solution": "1/2", "rubric": "", "difficulty": "core", "tags": [] }],
  "topic_objective_links": [],
  "lessons": []
}

# Field types (must match exactly)
- All `id`, `*_id` fields → UUID v4 strings (lowercase, hyphenated).
- `level`, `code`, `label`, `text`, `stem` → strings.
- `keywords`, `tags` → array of strings (use `[]` if none).
- `type` → one of "mcq", "open", "numeric", "short".
- `difficulty` → one of "core", "easy", "stretch".

# Coverage expectations
- For a typical "full coverage" request on one level + subject: aim for 3–8 domains, 2–5 subdomains per domain, 3–6 objectives per subdomain, 2–4 success criteria per objective, 1–3 tasks per success criterion.
- Keep `text` concise (one sentence) and curriculum-aligned for the requested country/level.

# My request
[REPLACE THIS LINE WITH YOUR TOPIC, e.g. "Generate CM1 Mathematics — Numbers, Fractions, Geometry, Measurement. Language: French. Full coverage of the French Éducation Nationale CM1 program."]
````

---

## B. Workflow

1. **Generate** — paste Section A into ChatGPT, replace the last line with your topic, send.
2. **Save** — copy the JSON ChatGPT returns into a file named `bundle.json`.
3. **Upload** — go to `/admin/curriculum`, tick **"Replace existing data"**, choose `bundle.json`, click Import.
4. **Verify** — the success card should show **Phase 3 readiness: Ready** with all NULL counts at 0.

---

## C. Tips for big bundles

- **Iterate by domain.** For a full year of Maths, ask ChatGPT for one domain at a time (Numbers, then Geometry, then Measurement…) and merge the JSON arrays manually. Keeps each response under the token limit.
- **Reuse UUIDs across runs.** If you re-run the same request and want stable IDs, paste your previous bundle and say *"keep the same UUIDs, only add the new domain X"*.
- **Always tick "Replace existing data"** when re-uploading the same scope — the importer will purge orphans and upsert cleanly.

---

## D. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `subjects: 0` in import result | Expected — subjects already exist, the bundle only references them | ✅ Not a problem |
| `Phase 3 readiness: Not ready` with NULL counts > 0 | Stale demo rows with NULL FKs | Re-upload with **Replace existing data** ticked (the importer purges orphans) |
| `success_criteria.objective_id_uuid_null > 0` | A success_criterion's `objective_id` doesn't match any objective UUID in the same bundle | Ask ChatGPT to "verify every success_criterion.objective_id matches an objective.id in the bundle" |
| Import fails with FK error | A domain/subdomain UUID was reused for two different entities | Ask ChatGPT to regenerate with fresh distinct UUIDs |
| ChatGPT outputs prose around the JSON | Forgot rule #1/#9 | Reply: *"Output the JSON only, inside one ```json code block, no commentary."* |

---

## E. Minimal valid example (sanity check)

```json
{
  "subjects": [],
  "domains": [
    {"id":"11111111-1111-4111-8111-111111111111","subject_id":"f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de","code":"NUMBERS","label":"Numbers and operations"}
  ],
  "subdomains": [
    {"id":"22222222-2222-4222-8222-222222222222","subject_id":"f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de","domain_id":"11111111-1111-4111-8111-111111111111","code":"FRAC","label":"Fractions"}
  ],
  "objectives": [
    {"id":"33333333-3333-4333-8333-333333333333","subject_id":"f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de","domain_id":"11111111-1111-4111-8111-111111111111","subdomain_id":"22222222-2222-4222-8222-222222222222","level":"CM1","text":"Compare two simple fractions","notes_from_prog":"","keywords":["fractions"]}
  ],
  "success_criteria": [
    {"id":"44444444-4444-4444-8444-444444444444","objective_id":"33333333-3333-4333-8333-333333333333","subject_id":"f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de","domain_id":"11111111-1111-4111-8111-111111111111","subdomain_id":"22222222-2222-4222-8222-222222222222","text":"Identify the larger of 1/2 vs 1/3"}
  ],
  "tasks": [],
  "topic_objective_links": [],
  "lessons": []
}
```
